<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// YozaPomo 悬浮窗主应用
// 后续阶段将添加 TODO 标签、专注计时等功能

const isDev = import.meta.env.DEV
const isDevServerAlive = ref(true)
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
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
  <div class="floating-bg rounded-floating floating-shadow w-[280px] h-[360px] p-4 overflow-hidden">
    <!-- 开发环境：Vite 服务器断开提示 -->
    <div
      v-if="isDev && !isDevServerAlive"
      class="text-center text-error text-sm mt-20"
    >
      开发服务器已断开
      <br />
      <span class="text-xs text-gray-400">请重启 pnpm tauri dev</span>
    </div>

    <div v-else class="text-center text-gray-500 text-sm mt-20">
      YozaPomo v0.1.0
    </div>
  </div>
</template>

<style scoped>
.floating-shadow {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1);
}
</style>
