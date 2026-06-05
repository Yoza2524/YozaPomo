<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFocusStore } from '@/stores/focusStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatDuration } from '@/utils/format'

const focusStore = useFocusStore()
const settingsStore = useSettingsStore()

// --- 按钮文字 ---
const buttonText = computed(() => {
  if (focusStore.isResting) return '结束休息'
  if (focusStore.isOvertime) return '开始休息'
  if (focusStore.isFocusing) return '结束专注'
  return '开始专注'
})

// --- 倒计时 ---
const countdownText = computed(() => {
  const remaining = focusStore.remainingSeconds
  if (focusStore.isOvertime) {
    return `总时长 ${formatDuration(focusStore.totalElapsed)}`
  }
  return formatDuration(remaining)
})

// --- 错误 ---
const errorMessage = ref('')

// --- 操作 ---
async function handleClick() {
  errorMessage.value = ''

  if (focusStore.isResting) {
    focusStore.endRest()
  } else if (focusStore.isOvertime) {
    await focusStore.completeFocus()
    focusStore.startRest()
  } else if (focusStore.isFocusing) {
    await focusStore.completeFocus()
  } else {
    const duration = settingsStore.focusDuration
    const session = await focusStore.startFocus(null, duration)
    if (!session) {
      errorMessage.value = focusStore.error || '开始专注失败'
    }
  }
}
</script>

<template>
  <div class="focus-button-container">
    <!-- 错误提示 -->
    <p v-if="errorMessage" class="text-xs text-red-400 text-center mb-1">{{ errorMessage }}</p>

    <!-- 按钮行 -->
    <div class="button-row">
      <!-- 左侧按钮 -->
      <button
        class="action-button"
        :class="{
          'idle': focusStore.isIdle,
          'active': !focusStore.isIdle,
          'primary': !(focusStore.isOvertime || focusStore.isResting),
          'warning': focusStore.isOvertime || focusStore.isResting
        }"
        @click="handleClick"
      >
        {{ buttonText }}
      </button>

      <!-- 右侧倒计时 -->
      <div
        class="countdown-block"
        :class="{
          'show': !focusStore.isIdle,
          'primary': !(focusStore.isOvertime || focusStore.isResting),
          'warning': focusStore.isOvertime || focusStore.isResting
        }"
      >
        {{ countdownText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.focus-button-container {
  width: 100%;
}

.button-row {
  display: flex;
  gap: 8px;
  height: 40px;
}

/* 按钮 */
.action-button {
  height: 40px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  will-change: width;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.2s ease;
}

/* 空闲：全宽 */
.action-button.idle {
  width: 100%;
}

/* 专注：固定宽度 */
.action-button.active {
  width: calc(50% - 4px);
}

/* 颜色 */
.action-button.primary {
  background-color: #6366f1;
}

.action-button.primary:hover {
  background-color: #4f46e5;
}

.action-button.warning {
  background-color: #f59e0b;
}

.action-button.warning:hover {
  background-color: #d97706;
}

.action-button:active {
  transform: scale(0.98);
}

/* 倒计时块 */
.countdown-block {
  width: 0;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  overflow: hidden;
  opacity: 0;
  will-change: width, opacity;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease;
}

/* 显示时 */
.countdown-block.show {
  width: calc(50% - 4px);
  opacity: 1;
}

/* 颜色 */
.countdown-block.primary {
  background-color: #eef2ff;
  color: #6366f1;
  border: 1px solid #c7d2fe;
}

.countdown-block.warning {
  background-color: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}
</style>
