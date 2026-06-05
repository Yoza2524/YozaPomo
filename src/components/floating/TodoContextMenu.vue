<script setup lang="ts">
defineProps<{
  x: number
  y: number
  isActive: boolean
}>()

const emit = defineEmits<{
  start: []
  end: []
  close: []
}>()
</script>

<template>
  <!-- 点击遮罩关闭菜单 -->
  <div class="fixed inset-0 z-50" @click="emit('close')" @contextmenu.prevent="emit('close')" />

  <!-- 菜单面板 -->
  <div
    class="fixed z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px] animate-scale-in"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <!-- 开始专注（未激活） -->
    <button
      v-if="!isActive"
      class="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
      @click="emit('start'); emit('close')"
    >
      <span class="w-4 text-center">▶</span> 开始专注
    </button>

    <!-- 分割线 -->
    <div class="border-t border-gray-100 my-1" />

    <!-- 结束 TODO -->
    <button
      class="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
      @click="emit('end'); emit('close')"
    >
      <span class="w-4 text-center">✕</span> 结束 TODO
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
