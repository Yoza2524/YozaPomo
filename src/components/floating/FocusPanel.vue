<script setup lang="ts">
import { computed } from 'vue'
import { useFocusStore } from '@/stores/focusStore'
import { formatDuration } from '@/utils/format'

const focusStore = useFocusStore()

/** 显示的倒计时文本 */
const countdownText = computed(() => {
  const remaining = focusStore.remainingSeconds
  if (focusStore.isOvertime) {
    return `↑${formatDuration(Math.abs(remaining))}↑`
  }
  return formatDuration(remaining)
})

/** 倒计时是否应该显示警示色 */
const isWarning = computed(() => focusStore.isOvertime)

/** 是否需要显示倒计时面板 */
const isVisible = computed(() => focusStore.isTimerActive)

/** 进度条百分比 (0-100) */
const progressPercent = computed(() => {
  const planned = focusStore.plannedDuration
  const elapsed = focusStore.totalElapsed
  if (planned <= 0) return 0
  return Math.min(100, (elapsed / planned) * 100)
})

/** 进度条颜色 */
const progressColor = computed(() => {
  if (focusStore.isOvertime) return '#f59e0b'
  if (progressPercent.value > 80) return '#f59e0b'
  return '#22c55e'
})
</script>

<template>
  <div v-if="isVisible" class="focus-panel flex flex-col items-center gap-3 py-2">
    <!-- 倒计时数字 -->
    <div
      class="countdown-display select-none"
      :class="{ 'text-amber-500': isWarning, 'text-gray-800': !isWarning }"
    >
      {{ countdownText }}
    </div>

    <!-- 进度条 -->
    <div class="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-1000 ease-linear"
        :style="{
          width: progressPercent + '%',
          backgroundColor: progressColor,
        }"
      />
    </div>

    <!-- 本次专注时长 -->
    <div v-if="focusStore.isOvertime" class="text-xs text-gray-500">
      已专注 {{ formatDuration(focusStore.totalElapsed) }}
    </div>
  </div>
</template>

<style scoped>
.countdown-display {
  font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
</style>
