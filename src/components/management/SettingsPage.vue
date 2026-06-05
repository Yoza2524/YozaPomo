<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

const focusDuration = ref(25)
const restDuration = ref(5)
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

onMounted(async () => {
  await settingsStore.loadSettings()
  focusDuration.value = settingsStore.settings.focusDuration / 60
  restDuration.value = settingsStore.settings.restDuration / 60
  todoDisplayCount.value = settingsStore.settings.todoDisplayCount
  showCountdown.value = settingsStore.settings.showCountdown
  notificationSound.value = settingsStore.settings.notificationSound
  reminderInterval.value = settingsStore.settings.reminderInterval / 60
  overtimeReminderInterval.value = settingsStore.settings.overtimeReminderInterval / 60
  idleTimeout.value = settingsStore.settings.idleTimeout
})

async function handleSave() {
  saving.value = true
  try {
    await settingsStore.updateSetting('focusDuration', focusDuration.value * 60)
    await settingsStore.updateSetting('restDuration', restDuration.value * 60)
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
</script>

<template>
  <div class="p-4 max-w-lg">
    <NCard title="应用设置" size="small">
      <div class="space-y-5">
        <!-- 默认专注时长 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">默认专注时长</div>
            <div class="text-xs text-gray-400">每次专注的默认时长（分钟）</div>
          </div>
          <NInputNumber
            v-model:value="focusDuration"
            :min="1"
            :max="120"
            :step="5"
            class="w-24"
          />
        </div>

        <!-- 休息时长 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">休息时长</div>
            <div class="text-xs text-gray-400">专注结束后的休息时间（分钟）</div>
          </div>
          <NInputNumber
            v-model:value="restDuration"
            :min="1"
            :max="30"
            :step="1"
            class="w-24"
          />
        </div>

        <!-- 显示 TODO 数量 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">悬浮窗 TODO 数量</div>
            <div class="text-xs text-gray-400">悬浮窗显示的 TODO 标签数量上限</div>
          </div>
          <NInputNumber
            v-model:value="todoDisplayCount"
            :min="1"
            :max="10"
            :step="1"
            class="w-24"
          />
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

        <!-- 专注提醒间隔 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">专注提醒间隔</div>
            <div class="text-xs text-gray-400">专注状态下每隔多久检测是否在岗（分钟）</div>
          </div>
          <NInputNumber
            v-model:value="reminderInterval"
            :min="1"
            :max="30"
            :step="1"
            class="w-24"
          />
        </div>

        <!-- 超时提醒间隔 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">超时提醒间隔</div>
            <div class="text-xs text-gray-400">超时状态下每隔多久检测是否在岗（分钟）</div>
          </div>
          <NInputNumber
            v-model:value="overtimeReminderInterval"
            :min="1"
            :max="15"
            :step="1"
            class="w-24"
          />
        </div>

        <!-- 异常检测持续时长 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-gray-700">异常检测持续时长</div>
            <div class="text-xs text-gray-400">无操作多久后异常结束专注（秒）</div>
          </div>
          <NInputNumber
            v-model:value="idleTimeout"
            :min="3"
            :max="90"
            :step="1"
            class="w-24"
          />
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
