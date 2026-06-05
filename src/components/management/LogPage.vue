<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NButton, NTag, NEmpty } from 'naive-ui'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getLogs, addExternalLog, clearLogs, type LogEntry } from '@/utils/logger'

const logs = ref<LogEntry[]>([])
let timer: ReturnType<typeof setInterval> | null = null
let unlistenLog: UnlistenFn | null = null

onMounted(async () => {
  logs.value = getLogs()
  timer = setInterval(() => {
    logs.value = [...getLogs()]
  }, 1000)

  // 监听其他窗口的日志
  unlistenLog = await listen<LogEntry>('frontend-log', (event) => {
    addExternalLog(event.payload)
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  unlistenLog?.()
})

function handleClear() {
  clearLogs()
  logs.value = []
}

const levelType: Record<string, 'error' | 'warning' | 'info'> = {
  error: 'error',
  warn: 'warning',
  info: 'info',
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm text-gray-500">共 {{ logs.length }} 条日志（每秒刷新，含所有窗口）</span>
      <NButton size="small" @click="handleClear">清空</NButton>
    </div>

    <NEmpty v-if="logs.length === 0" description="暂无日志" />

    <div v-else class="space-y-1 font-mono text-xs">
      <div
        v-for="(log, i) in logs"
        :key="i"
        class="flex items-start gap-2 px-2 py-1 rounded"
        :class="{
          'bg-red-50': log.level === 'error',
          'bg-amber-50': log.level === 'warn',
        }"
      >
        <span class="text-gray-400 shrink-0">{{ log.time }}</span>
        <NTag :type="levelType[log.level]" size="tiny" class="shrink-0">
          {{ log.level }}
        </NTag>
        <span class="break-all whitespace-pre-wrap">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>
