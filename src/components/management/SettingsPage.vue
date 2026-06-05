<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  NButton,
  NInputNumber,
  NSwitch,
  NSelect,
  NSpace,
  useMessage,
} from 'naive-ui'
import { useSettingsStore } from '@/stores/settingsStore'
import { playFocusEndSound } from '@/utils/sound'
import { emit } from '@tauri-apps/api/event'

const settingsStore = useSettingsStore()
const message = useMessage()

const focusMin = ref(25)
const focusSec = ref(0)
const restMin = ref(5)
const restSec = ref(0)
const todoDisplayCount = ref(3)
const showCountdown = ref(true)
const notificationSound = ref('default')
const reminderInterval = ref(5)
const overtimeReminderInterval = ref(3)
const idleTimeout = ref(30)

// 跟踪当前点击激活的输入框（仅鼠标点击后生效）
const activeField = ref<string | null>(null)
// 存储聚焦时的原始值（用于 ESC 取消修改）
const originalValue = ref<number>(0)

const soundOptions = [
  { label: '默认音效', value: 'default' },
  { label: '钟声', value: 'bell' },
  { label: '柔和', value: 'soft' },
]

// 分钟/秒数联动约束：分钟为0则秒至少5，秒为0则分钟至少1
watch(focusMin, (v) => { if (v === 0 && focusSec.value < 5) focusSec.value = 5 })
watch(focusSec, (v) => { if (v === 0 && focusMin.value < 1) focusMin.value = 1 })
watch(restMin, (v) => { if (v === 0 && restSec.value < 5) restSec.value = 5 })
watch(restSec, (v) => { if (v === 0 && restMin.value < 1) restMin.value = 1 })

onMounted(async () => {
  await settingsStore.loadSettings()
  focusMin.value = Math.floor(settingsStore.settings.focusDuration / 60)
  focusSec.value = settingsStore.settings.focusDuration % 60
  restMin.value = Math.floor(settingsStore.settings.restDuration / 60)
  restSec.value = settingsStore.settings.restDuration % 60
  todoDisplayCount.value = settingsStore.settings.todoDisplayCount
  showCountdown.value = settingsStore.settings.showCountdown
  notificationSound.value = settingsStore.settings.notificationSound
  // [TEST] 临时改为秒级，方便测试
  reminderInterval.value = settingsStore.settings.reminderInterval
  overtimeReminderInterval.value = settingsStore.settings.overtimeReminderInterval
  idleTimeout.value = settingsStore.settings.idleTimeout
})

/** 失去焦点自动保存 */
async function autoSave() {
  const focusTotal = focusMin.value * 60 + focusSec.value
  const restTotal = restMin.value * 60 + restSec.value
  if (focusTotal < 5) {
    message.warning('专注时长最低 5 秒')
    return
  }
  if (restTotal < 5) {
    message.warning('休息时长最低 5 秒')
    return
  }
  try {
    await settingsStore.updateSetting('focusDuration', focusTotal)
    await settingsStore.updateSetting('restDuration', restTotal)
    await settingsStore.updateSetting('todoDisplayCount', todoDisplayCount.value)
    await settingsStore.updateSetting('showCountdown', showCountdown.value)
    await settingsStore.updateSetting('notificationSound', notificationSound.value)
    // [TEST] 临时改为秒级，方便测试
    await settingsStore.updateSetting('reminderInterval', reminderInterval.value)
    await settingsStore.updateSetting('overtimeReminderInterval', overtimeReminderInterval.value)
    await settingsStore.updateSetting('idleTimeout', idleTimeout.value)
    await emit('settings-changed')
  } catch (e) {
    message.error(`保存失败: ${e}`)
  }
}

function handleTestSound() {
  playFocusEndSound(notificationSound.value === 'default' ? undefined : notificationSound.value)
}

/** 回车保存并失焦 */
function handleEnter(e: KeyboardEvent) {
  autoSave()
  ;(e.target as HTMLElement).blur()
}

/** 记录聚焦时的原始值 */
function saveOriginal(fieldName: string) {
  const fieldMap: Record<string, () => number> = {
    focusMin: () => focusMin.value,
    focusSec: () => focusSec.value,
    restMin: () => restMin.value,
    restSec: () => restSec.value,
    todoDisplayCount: () => todoDisplayCount.value,
    reminderInterval: () => reminderInterval.value,
    overtimeReminderInterval: () => overtimeReminderInterval.value,
    idleTimeout: () => idleTimeout.value,
  }
  originalValue.value = fieldMap[fieldName]?.() ?? 0
}

/** ESC 取消修改并失焦 */
function handleEsc(fieldName: string, e: KeyboardEvent) {
  const restoreMap: Record<string, (v: number) => void> = {
    focusMin: (v) => { focusMin.value = v },
    focusSec: (v) => { focusSec.value = v },
    restMin: (v) => { restMin.value = v },
    restSec: (v) => { restSec.value = v },
    todoDisplayCount: (v) => { todoDisplayCount.value = v },
    reminderInterval: (v) => { reminderInterval.value = v },
    overtimeReminderInterval: (v) => { overtimeReminderInterval.value = v },
    idleTimeout: (v) => { idleTimeout.value = v },
  }
  restoreMap[fieldName]?.(originalValue.value)
  activeField.value = null
  ;(e.target as HTMLElement).blur()
}

/** 滚轮增减数值（仅在对应输入框聚焦时生效） */
function handleWheel(
  e: WheelEvent,
  fieldName: string,
  current: number,
  opts: { min: number; max: number; step: number },
): number {
  if (activeField.value !== fieldName) return current
  e.preventDefault()
  e.preventDefault()
  const delta = e.deltaY < 0 ? opts.step : -opts.step
  const next = Math.round((current + delta) / opts.step) * opts.step
  return Math.max(opts.min, Math.min(opts.max, next))
}
</script>

<template>
  <div class="settings-page p-4 h-full overflow-auto">
    <div class="space-y-6">

      <!-- 专注时长 -->
      <div>
        <div class="section-title">专注时长</div>
        <div class="section-group">
          <div class="setting-row">
            <div>
              <div class="setting-label">专注时长</div>
              <div class="setting-desc">每次专注的时长</div>
            </div>
            <NSpace size="small" align="center">
              <div @wheel="focusMin = handleWheel($event, 'focusMin', focusMin, { min: 0, max: 120, step: 1 })">
                <NInputNumber :value="focusMin" @update:value="focusMin = $event ?? focusMin" @mousedown="activeField = 'focusMin'; saveOriginal('focusMin')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="0" :max="120" :step="1" :show-button="false" placeholder="" class="w-14" />
              </div>
              <span class="text-xs text-gray-400">分</span>
              <div @wheel="focusSec = handleWheel($event, 'focusSec', focusSec, { min: 0, max: 59, step: 5 })">
                <NInputNumber :value="focusSec" @update:value="focusSec = $event ?? focusSec" @mousedown="activeField = 'focusSec'; saveOriginal('focusSec')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="0" :max="59" :step="5" :show-button="false" placeholder="" class="w-14" />
              </div>
              <span class="text-xs text-gray-400">秒</span>
            </NSpace>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">休息时长</div>
              <div class="setting-desc">专注结束后的休息时长</div>
            </div>
            <NSpace size="small" align="center">
              <div @wheel="restMin = handleWheel($event, 'restMin', restMin, { min: 0, max: 30, step: 1 })">
                <NInputNumber :value="restMin" @update:value="restMin = $event ?? restMin" @mousedown="activeField = 'restMin'; saveOriginal('restMin')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="0" :max="30" :step="1" :show-button="false" placeholder="" class="w-14" />
              </div>
              <span class="text-xs text-gray-400">分</span>
              <div @wheel="restSec = handleWheel($event, 'restSec', restSec, { min: 0, max: 59, step: 5 })">
                <NInputNumber :value="restSec" @update:value="restSec = $event ?? restSec" @mousedown="activeField = 'restSec'; saveOriginal('restSec')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="0" :max="59" :step="5" :show-button="false" placeholder="" class="w-14" />
              </div>
              <span class="text-xs text-gray-400">秒</span>
            </NSpace>
          </div>
        </div>
      </div>

      <!-- 显示 -->
      <div>
        <div class="section-title">显示</div>
        <div class="section-group">
          <div class="setting-row">
            <div>
              <div class="setting-label">悬浮窗 TODO 数量</div>
              <div class="setting-desc">悬浮窗显示的 TODO 标签数量上限</div>
            </div>
            <div @wheel="todoDisplayCount = handleWheel($event, 'todoDisplayCount', todoDisplayCount, { min: 1, max: 10, step: 1 })">
              <NInputNumber :value="todoDisplayCount" @update:value="todoDisplayCount = $event ?? todoDisplayCount" @mousedown="activeField = 'todoDisplayCount'; saveOriginal('todoDisplayCount')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="1" :max="10" :step="1" :show-button="false" placeholder="" class="w-14" />
            </div>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">显示倒计时数字</div>
              <div class="setting-desc">悬浮窗是否显示倒计时数字</div>
            </div>
            <NSwitch v-model:value="showCountdown" @update:value="autoSave" />
          </div>
        </div>
      </div>

      <!-- 提醒 -->
      <div>
        <div class="section-title">提醒</div>
        <div class="section-group">
          <div class="setting-row">
            <div>
              <div class="setting-label">通知音效</div>
              <div class="setting-desc">专注结束和提醒时的提示音</div>
            </div>
            <NSpace size="small">
              <NSelect v-model:value="notificationSound" :options="soundOptions" class="w-28" @update:value="autoSave" />
              <NButton @click="handleTestSound">试听</NButton>
            </NSpace>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">专注检测间隔</div>
              <div class="setting-desc">专注状态下每（秒）检测 [TEST]</div>
            </div>
            <div @wheel="reminderInterval = handleWheel($event, 'reminderInterval', reminderInterval, { min: 1, max: 30, step: 1 })">
              <NInputNumber :value="reminderInterval" @update:value="reminderInterval = $event ?? reminderInterval" @mousedown="activeField = 'reminderInterval'; saveOriginal('reminderInterval')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="1" :max="30" :step="1" :show-button="false" placeholder="" class="w-14" />
            </div>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">超时专注检测间隔</div>
              <div class="setting-desc">超时专注状态下每（秒）检测 [TEST]</div>
            </div>
            <div @wheel="overtimeReminderInterval = handleWheel($event, 'overtimeReminderInterval', overtimeReminderInterval, { min: 1, max: 15, step: 1 })">
              <NInputNumber :value="overtimeReminderInterval" @update:value="overtimeReminderInterval = $event ?? overtimeReminderInterval" @mousedown="activeField = 'overtimeReminderInterval'; saveOriginal('overtimeReminderInterval')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="1" :max="15" :step="1" :show-button="false" placeholder="" class="w-14" />
            </div>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">异常检测持续时长</div>
              <div class="setting-desc">检测无操作（秒）后异常终止</div>
            </div>
            <div @wheel="idleTimeout = handleWheel($event, 'idleTimeout', idleTimeout, { min: 3, max: 90, step: 5 })">
              <NInputNumber :value="idleTimeout" @update:value="idleTimeout = $event ?? idleTimeout" @mousedown="activeField = 'idleTimeout'; saveOriginal('idleTimeout')" @blur="activeField = null; autoSave()" @keydown.enter="handleEnter" @keydown.esc="handleEsc(activeField!, $event)" :min="3" :max="90" :step="5" :show-button="false" placeholder="" class="w-14" />
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style>
/* 分块标题 */
.settings-page .section-title {
  font-size: 13px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 4px;
  margin-bottom: 8px;
  user-select: none;
}

/* 分块容器 */
.settings-page .section-group {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

/* 设置行 */
.settings-page .setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  user-select: none;
}

.settings-page .setting-row + .setting-row {
  border-top: 1px solid #f5f5f5;
}

.settings-page .setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.settings-page .setting-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* 隐藏原生数字输入框的上下箭头 */
.settings-page input::-webkit-outer-spin-button,
.settings-page input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.settings-page input[type=number] {
  -moz-appearance: textfield;
}

/* iOS 风格：统一控件高度 34px，圆角 10px */
.settings-page .n-input-number,
.settings-page .n-input,
.settings-page .n-select {
  --n-height: 34px !important;
  border-radius: 10px !important;
}

.settings-page .n-input {
  border-radius: 10px !important;
}
.settings-page .n-input .n-input__border,
.settings-page .n-input .n-input__state-border {
  border-radius: 10px !important;
}

.settings-page .n-select .n-base-selection {
  border-radius: 10px !important;
  --n-height: 34px !important;
}

.settings-page .n-button {
  border-radius: 10px !important;
  height: 34px !important;
}

.settings-page .n-switch {
  --n-height: 22px;
  --n-width: 44px;
  border-radius: 11px !important;
}
</style>
