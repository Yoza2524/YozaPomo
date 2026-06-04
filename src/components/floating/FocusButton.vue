<script setup lang="ts">
import { useFocusStore } from '@/stores/focusStore'
import { computed } from 'vue'

const props = defineProps<{
  disabled: boolean
}>()

const focusStore = useFocusStore()

const buttonText = computed(() => {
  if (focusStore.isFocusing) return '专注中...'
  if (focusStore.isPaused) return '已暂停'
  return '开始专注'
})

const isActive = computed(() => focusStore.isFocusing || focusStore.isPaused)

function handleClick() {
  // 阶段三：计时器核心中实现完整逻辑
  if (!isActive.value && !props.disabled) {
    // 占位：开始专注
  }
}
</script>

<template>
  <button
    class="focus-btn w-full h-10 rounded-lg text-white text-sm font-medium transition-all duration-200"
    :class="{
      'bg-green-500': isActive,
      'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700': !isActive && !disabled,
      'bg-gray-300 cursor-not-allowed': disabled && !isActive,
    }"
    :disabled="disabled && !isActive"
    @click="handleClick"
  >
    {{ buttonText }}
  </button>
</template>

<style scoped>
.focus-btn {
  letter-spacing: 0.5px;
}

.focus-btn:not(:disabled):active {
  transform: scale(0.98);
}
</style>
