<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps<{
  x: number
  y: number
  isActive: boolean
}>()

const emit = defineEmits<{
  start: []
  endFocus: []
  end: []
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const menuWidth = ref(120)

onMounted(async () => {
  await nextTick()
  if (menuRef.value) {
    menuWidth.value = menuRef.value.offsetWidth
  }
})

const menuStyle = computed(() => {
  const maxX = window.innerWidth - menuWidth.value - 10
  const left = Math.min(props.x, maxX)
  return { left: left + 'px', top: props.y + 'px' }
})
</script>

<template>
  <!-- 点击遮罩关闭菜单 -->
  <div class="fixed inset-0 z-50" @click="emit('close')" @contextmenu.prevent="emit('close')" />

  <!-- 菜单面板 -->
  <div
    ref="menuRef"
    class="fixed z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px] animate-scale-in"
    :style="menuStyle"
  >
    <!-- 开始专注（未激活） -->
    <button
      v-if="!isActive"
      class="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
      @click="emit('start'); emit('close')"
    >
      <span class="w-4 text-center">▶</span> 开始专注
    </button>

    <!-- 结束专注（激活中） -->
    <button
      v-if="isActive"
      class="w-full text-left px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-2"
      @click="emit('endFocus'); emit('close')"
    >
      <span class="w-4 text-center">⏸</span> 结束专注
    </button>

    <!-- 分割线 -->
    <div class="border-t border-gray-100 my-1" />

    <!-- 完成待办 -->
    <button
      class="w-full text-left px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center gap-2"
      @click="emit('end'); emit('close')"
    >
      <span class="w-4 text-center">✓</span> 完成待办
    </button>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.15s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
