<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import ParticleCanvas from '@/components/floating/ParticleCanvas.vue'

const showFocusEnd = ref(false)
const showReminder = ref(false)
const showReminderText = ref(false)

let unlistenFocusEnd: UnlistenFn | null = null
let unlistenReminder: UnlistenFn | null = null
let unlistenReminderText: UnlistenFn | null = null
let unlistenHideReminderText: UnlistenFn | null = null

async function showWindow() {
  const win = getCurrentWebviewWindow()
  await win.setSize(
    new (await import('@tauri-apps/api/window')).LogicalSize(
      window.screen.width,
      window.screen.height,
    ),
  )
  await win.setPosition(
    new (await import('@tauri-apps/api/window')).LogicalPosition(0, 0),
  )
  await win.show()
}

async function hideWindow() {
  const win = getCurrentWebviewWindow()
  await win.hide()
}

function onFocusEndDone() {
  showFocusEnd.value = false
  if (!showReminderText.value) hideWindow()
}

function onReminderDone() {
  showReminder.value = false
  if (!showReminderText.value) hideWindow()
}

onMounted(async () => {
  unlistenFocusEnd = await listen('show-particle-focus-end', async () => {
    await showWindow()
    showFocusEnd.value = true
  })

  unlistenReminder = await listen('show-particle-reminder', async () => {
    await showWindow()
    showReminder.value = true
  })

  unlistenReminderText = await listen('show-reminder-text', async () => {
    await showWindow()
    showReminderText.value = true
  })

  unlistenHideReminderText = await listen('hide-reminder-text', () => {
    showReminderText.value = false
    if (!showFocusEnd.value && !showReminder.value) hideWindow()
  })
})

onUnmounted(() => {
  unlistenFocusEnd?.()
  unlistenReminder?.()
  unlistenReminderText?.()
  unlistenHideReminderText?.()
})
</script>

<template>
  <div class="w-screen h-screen overflow-hidden pointer-events-none">
    <!-- 专注结束粒子动画 -->
    <div v-if="showFocusEnd" class="absolute inset-0">
      <ParticleCanvas
        :count="80"
        :colors="['#6366f1', '#818cf8', '#22c55e', '#4f46e5', '#a78bfa', '#f472b6', '#34d399']"
        :min-radius="3"
        :max-radius="10"
        :duration="5000"
        :speed="2.0"
        :from-center="true"
        @done="onFocusEndDone"
      />
    </div>

    <!-- 提醒粒子动画 -->
    <div v-if="showReminder" class="absolute inset-0">
      <ParticleCanvas
        :count="40"
        :colors="['#f59e0b', '#fbbf24', '#fcd34d', '#fb923c']"
        :min-radius="2"
        :max-radius="7"
        :duration="3000"
        :speed="1.0"
        :from-center="false"
        @done="onReminderDone"
      />
    </div>

    <!-- "还在吗？"文字（屏幕 2/9 位置，仅展示） -->
    <div
      v-if="showReminderText"
      class="absolute left-0 right-0 flex justify-center"
      style="top: calc(22.22vh - 36px);"
    >
      <div class="reminder-text px-18 py-6 rounded-3xl text-lg font-semibold bg-white/90 border border-gray-200 text-gray-700 shadow-lg">
        还在吗？
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminder-text {
  animation: fadeInUp 0.3s ease-out;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 1.125rem;
  min-width: 180px;
  text-align: center;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
