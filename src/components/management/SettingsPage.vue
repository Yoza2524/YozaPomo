<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  NButton,
  NInputNumber,
  NSwitch,
  NSelect,
  NCard,
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
const saving = ref(false)

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
  reminderInterval.value = settingsStore.settings.reminderInterval / 60
  overtimeReminderInterval.value = settingsStore.settings.overtimeReminderInterval / 60
  idleTimeout.value = settingsStore.settings.idleTimeout
})

async function handleSave() {
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
  saving.value = true
  try {
    await settingsStore.updateSetting('focusDuration', focusTotal)
    await settingsStore.updateSetting('restDuration', restTotal)
    await settingsStore.updateSetting('todoDisplayCount', todoDisplayCount.value)
    await settingsStore.updateSetting('showCountdown', showCountdown.value)
    await settingsStore.updateSetting('notificationSound', notificationSound.value)
    await settingsStore.updateSetting('reminderInterval', reminderInterval.value * 60)
    await settingsStore.updateSetting('overtimeReminderInterval', overtimeReminderInterval.value * 60)
    await settingsStore.updateSetting('idleTimeout', idleTimeout.value)
    // 通知悬浮窗刷新设置
    await emit('settings-changed')
    message.success('设置已保存')
  } catch (e) {
    message.error(`保存失败: ${e}`)
  } finally {
    saving.value = false
  }
}

function handleTestSound() {
  playFocusEndSound(notificationSound.value === 'default' ? undefined : notificationSound.value)
}

/** 滚轮增减数值 */
function handleWheel(
  e: WheelEvent,
  current: number,
  opts: { min: number; max: number; step: number },
): number {
  e.preventDefault()
  const delta = e.deltaY < 0 ? opts.step : -opts.step
  const next = Math.round((current + delta) / opts.step) * opts.step
  return Math.max(opts.min, Math.min(opts.max, next))
}
</script>

<template>
  <div class="settings-page p-4 h-full">
    <NCard title="应用设置" size="small" class="h-full">
      <div class="space-y-5">
        <!-- 默认专注时长 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">默认专注时长</div>
            <div class="text-xs text-gray-400">每次专注的默认时长（最低 5 秒）</div>
          </div>
          <NSpace size="small" align="center">
            <div @wheel="focusMin = handleWheel($event, focusMin, { min: 0, max: 120, step: 1 })">
              <NInputNumber
                :value="focusMin"
                @update:value="focusMin = $event ?? focusMin"
                :min="0"
                :max="120"
                :step="1"
                :show-button="false"
                class="w-14"
                placeholder="分"
              />
            </div>
            <span class="text-xs text-gray-400">分</span>
            <div @wheel="focusSec = handleWheel($event, focusSec, { min: 0, max: 59, step: 5 })">
              <NInputNumber
                :value="focusSec"
                @update:value="focusSec = $event ?? focusSec"
                :min="0"
                :max="59"
                :step="5"
                :show-button="false"
                class="w-14"
                placeholder="秒"
              />
            </div>
            <span class="text-xs text-gray-400">秒</span>
          </NSpace>
        </div>

        <!-- 休息时长 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">休息时长</div>
            <div class="text-xs text-gray-400">专注结束后的休息时间（最低 5 秒）</div>
          </div>
          <NSpace size="small" align="center">
            <div @wheel="restMin = handleWheel($event, restMin, { min: 0, max: 30, step: 1 })">
              <NInputNumber
                :value="restMin"
                @update:value="restMin = $event ?? restMin"
                :min="0"
                :max="30"
                :step="1"
                :show-button="false"
                class="w-14"
                placeholder="分"
              />
            </div>
            <span class="text-xs text-gray-400">分</span>
            <div @wheel="restSec = handleWheel($event, restSec, { min: 0, max: 59, step: 5 })">
              <NInputNumber
                :value="restSec"
                @update:value="restSec = $event ?? restSec"
                :min="0"
                :max="59"
                :step="5"
                :show-button="false"
                class="w-14"
                placeholder="秒"
              />
            </div>
            <span class="text-xs text-gray-400">秒</span>
          </NSpace>
        </div>

        <!-- 显示 TODO 数量 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">悬浮窗 TODO 数量</div>
            <div class="text-xs text-gray-400">悬浮窗显示的 TODO 标签数量上限</div>
          </div>
          <div @wheel="todoDisplayCount = handleWheel($event, todoDisplayCount, { min: 1, max: 10, step: 1 })">
            <NInputNumber
              :value="todoDisplayCount"
              @update:value="todoDisplayCount = $event ?? todoDisplayCount"
              :min="1"
              :max="10"
              :step="1"
              :show-button="false"
              class="w-14"
            />
          </div>
        </div>

        <!-- 显示倒计时 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">显示倒计时数字</div>
            <div class="text-xs text-gray-400">悬浮窗是否显示倒计时数字</div>
          </div>
          <NSwitch v-model:value="showCountdown" />
        </div>

        <!-- 提示音 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">通知音效</div>
            <div class="text-xs text-gray-400">专注结束和提醒时的提示音</div>
          </div>
          <NSpace size="small">
            <NSelect
              v-model:value="notificationSound"
              :options="soundOptions"
              class="w-28"
              size="small"
            />
            <NButton size="tiny" @click="handleTestSound">试听</NButton>
          </NSpace>
        </div>

        <!-- 专注检测间隔 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">专注检测间隔</div>
            <div class="text-xs text-gray-400">专注状态下每（分）检测</div>
          </div>
          <div @wheel="reminderInterval = handleWheel($event, reminderInterval, { min: 1, max: 30, step: 1 })">
            <NInputNumber
              :value="reminderInterval"
              @update:value="reminderInterval = $event ?? reminderInterval"
              :min="1"
              :max="30"
              :step="1"
              :show-button="false"
              class="w-14"
            />
          </div>
        </div>

        <!-- 超时专注检测间隔 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">超时专注检测间隔</div>
            <div class="text-xs text-gray-400">超时专注状态下每（分）检测</div>
          </div>
          <div @wheel="overtimeReminderInterval = handleWheel($event, overtimeReminderInterval, { min: 1, max: 15, step: 1 })">
            <NInputNumber
              :value="overtimeReminderInterval"
              @update:value="overtimeReminderInterval = $event ?? overtimeReminderInterval"
              :min="1"
              :max="15"
              :step="1"
              :show-button="false"
              class="w-14"
            />
          </div>
        </div>

        <!-- 异常检测持续时长 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">异常检测持续时长</div>
            <div class="text-xs text-gray-400">检测无操作（秒）后异常终止</div>
          </div>
          <div @wheel="idleTimeout = handleWheel($event, idleTimeout, { min: 3, max: 90, step: 5 })">
            <NInputNumber
              :value="idleTimeout"
              @update:value="idleTimeout = $event ?? idleTimeout"
              :min="3"
              :max="90"
              :step="5"
              :show-button="false"
              class="w-14"
            />
          </div>
        </div>
      </div>

      <div class="mt-6">
        <NButton type="primary" :loading="saving" @click="handleSave" block>
          保存设置
        </NButton>
      </div>
    </NCard>
  </div>
</template>

<style>
/* 隐藏原生数字输入框的上下箭头 */
.settings-page input::-webkit-outer-spin-button,
.settings-page input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.settings-page input[type=number] {
  -moz-appearance: textfield;
}
</style>
