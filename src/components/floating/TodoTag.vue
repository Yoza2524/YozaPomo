<script setup lang="ts">
import type { Todo } from '@/types/todo'

defineProps<{
  todo: Todo
}>()
</script>

<template>
  <div
    class="todo-tag rounded-xl px-3 py-2 mb-2 bg-white/60 border border-gray-100 transition-all duration-200 hover:bg-white/90 hover:shadow-sm"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm text-gray-800 font-medium truncate flex-1 mr-2">
        {{ todo.title }}
      </span>
      <!-- 更多操作占位，阶段四实现右键菜单 -->
      <span class="text-xs text-gray-400 shrink-0">···</span>
    </div>
  </div>
</template>

<style scoped>
.todo-tag {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
