<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFocusStore } from '@/stores/focusStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatDuration } from '@/utils/format'

const focusStore = useFocusStore()
const settingsStore = useSettingsStore()

// --- 按钮文字 ---
const buttonText = computed(() => {
  if (focusStore.isOvertime) return '结束专注'
  if (focusStore.isPaused) return '继续专注'
  if (focusStore.isFocusing) return '结束专注'
  return '开始专注'
})

// --- 倒计时 ---
const countdownText = computed(() => {
  const remaining = focusStore.remainingSeconds
  if (focusStore.isOvertime) {
    return `↑${formatDuration(Math.abs(remaining))}↑`
  }
  return formatDuration(remaining)
})

const isCountdownPaused = computed(() => focusStore.isPaused)

// --- 是否显示休息按钮 ---
const showRestButton = computed(() => focusStore.isOvertime)

// --- 错误 ---
const errorMessage = ref('')

// --- 操作 ---
async function handleClick() {
  errorMessage.value = ''

  if (focusStore.isOvertime) {
    await focusStore.completeFocus()
  } else if (focusStore.isPaused) {
    focusStore.resumeFocus()
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

async function handleRest() {
  if (focusStore.isOvertime) {
    await focusStore.completeFocus()
  }
  focusStore.startRest()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- 错误提示 -->
    <p v-if="errorMessage" class="text-xs text-red-400 text-center -mb-1">{{ errorMessage }}</p>

    <!-- 空闲：全宽开始按钮 -->
    <button
      v-if="!focusStore.isTimerActive"
      class="w-full h-10 rounded-lg bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium transition-all duration-200 active:scale-[0.98]"
      style="letter-spacing: 0.5px"
      @click="handleClick"
    >
      开始专注
    </button>

    <!-- 专注中 / 暂停 / 超时：水平排布 -->
    <template v-else>
      <div class="flex gap-2">
        <!-- 左侧按钮 -->
        <button
          class="flex-1 h-10 rounded-lg text-white text-sm font-medium transition-all duration-200 active:scale-[0.98]"
          :class="focusStore.isOvertime
            ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'
            : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'"
          style="letter-spacing: 0.5px"
          @click="handleClick"
        >
          {{ buttonText }}
        </button>

        <!-- 右侧倒计时 -->
        <div
          class="flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors"
          :class="[
            focusStore.isOvertime
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : isCountdownPaused
                ? 'bg-gray-50 text-gray-400 border border-gray-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200',
          ]"
          style="font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace; font-variant-numeric: tabular-nums; letter-spacing: 1px"
        >
          {{ countdownText }}
        </div>
      </div>

      <!-- 已专注时长（超时后显示） -->
      <div v-if="focusStore.isOvertime" class="text-xs text-gray-500 text-center">
        已专注 {{ formatDuration(focusStore.totalElapsed) }}
      </div>
    </template>

    <!-- 休息按钮（超时后显示） -->
    <button
      v-if="showRestButton"
      class="w-full h-10 rounded-lg text-indigo-500 text-sm font-medium transition-all duration-200 border border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100 active:scale-[0.98]"
      style="letter-spacing: 0.5px"
      @click="handleRest"
    >
      开始休息
    </button>
  </div>
</template>
