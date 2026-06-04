<script setup lang="ts">
import { computed } from 'vue'
import { useFocusStore } from '@/stores/focusStore'
import { useSettingsStore } from '@/stores/settingsStore'

const props = defineProps<{
  disabled: boolean
}>()

const focusStore = useFocusStore()
const settingsStore = useSettingsStore()

// --- 按钮文字 ---
const buttonText = computed(() => {
  if (focusStore.isOvertime) return '结束专注'
  if (focusStore.isPaused) return '继续专注'
  if (focusStore.isFocusing) return '暂停'
  return '开始专注'
})

// --- 按钮样式 ---
const buttonClass = computed(() => {
  if (focusStore.isTimerActive) return 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'
  if (props.disabled) return 'bg-gray-300 cursor-not-allowed'
  return 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
})

// --- 是否显示休息按钮 ---
const showRestButton = computed(() => focusStore.isOvertime)

// --- 操作 ---
async function handleClick() {
  if (props.disabled && !focusStore.isTimerActive) return

  if (focusStore.isOvertime) {
    // 超时中 → 结束专注
    await focusStore.completeFocus()
  } else if (focusStore.isPaused) {
    // 暂停中 → 继续
    focusStore.resumeFocus()
  } else if (focusStore.isFocusing) {
    // 专注中 → 暂停
    focusStore.pauseFocus()
  } else {
    // 空闲 → 开始专注
    const duration = settingsStore.focusDuration
    await focusStore.startFocus(null, duration)
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
    <!-- 主按钮 -->
    <button
      class="focus-btn w-full h-10 rounded-lg text-white text-sm font-medium transition-all duration-200"
      :class="buttonClass"
      :disabled="disabled && !focusStore.isTimerActive"
      @click="handleClick"
    >
      {{ buttonText }}
    </button>

    <!-- 休息按钮（超时后显示） -->
    <button
      v-if="showRestButton"
      class="focus-btn w-full h-10 rounded-lg text-indigo-500 text-sm font-medium transition-all duration-200 border border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100"
      @click="handleRest"
    >
      开始休息
    </button>
  </div>
</template>

<style scoped>
.focus-btn {
  letter-spacing: 0.5px;
}

.focus-btn:not(:disabled):active {
  transform: scale(0.98);
}
</style>
