<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import FloatingWindow from '@/components/floating/FloatingWindow.vue'
import ManagementWindow from '@/components/management/ManagementWindow.vue'

const isDev = import.meta.env.DEV
const isDevServerAlive = ref(true)
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

// 检测当前窗口
const windowLabel = ref<string>('floating')

function detectWindow() {
  try {
    const current = getCurrentWindow()
    windowLabel.value = current.label
  } catch {
    // 非 Tauri 环境（纯浏览器开发），默认显示悬浮窗
    windowLabel.value = 'floating'
  }
}

onMounted(() => {
  detectWindow()

  if (isDev) {
    heartbeatTimer = setInterval(async () => {
      try {
        await fetch('/', { method: 'HEAD', cache: 'no-store' })
        isDevServerAlive.value = true
      } catch {
        isDevServerAlive.value = false
      }
    }, 3000)
  }
})

onUnmounted(() => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
})
</script>

<template>
  <!-- 开发环境：Vite 服务器断开提示 -->
  <div
    v-if="isDev && !isDevServerAlive"
    class="w-[280px] h-[360px] rounded-floating floating-shadow p-4"
    :style="{ background: 'rgba(255, 255, 255, 0.85)' }"
  >
    <div class="text-center text-red-500 text-sm mt-20">
      开发服务器已断开
      <br />
      <span class="text-xs text-gray-400">请重启 pnpm tauri dev</span>
    </div>
  </div>

  <!-- 悬浮窗 -->
  <FloatingWindow v-else-if="windowLabel === 'floating'" />

  <!-- 管理界面 -->
  <ManagementWindow v-else-if="windowLabel === 'management'" />
</template>

<style scoped>
.rounded-floating {
  border-radius: 16px;
}

.floating-shadow {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1);
}
</style>
