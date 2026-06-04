<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import FloatingWindow from '@/components/floating/FloatingWindow.vue'

// YozaPomo 悬浮窗主应用
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
  <!-- 开发环境：Vite 服务器断开提示 -->
  <div
    v-if="isDev && !isDevServerAlive"
    class="w-[280px] h-[360px] rounded-floating floating-shadow p-4"
    :style="{ background: 'rgba(255, 255, 255, 0.85)' }"
  >
    <div class="text-center text-error text-sm mt-20">
      开发服务器已断开
      <br />
      <span class="text-xs text-gray-400">请重启 pnpm tauri dev</span>
    </div>
  </div>

  <!-- 正常：悬浮窗 -->
  <FloatingWindow v-else />
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
