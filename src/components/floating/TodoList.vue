<script setup lang="ts">
import { computed } from 'vue'
import type { Todo } from '@/types/todo'
import { useFocusStore } from '@/stores/focusStore'
import TodoTag from './TodoTag.vue'

const props = defineProps<{
  todos: Todo[]
  maxDisplay: number
  loading: boolean
}>()

const emit = defineEmits<{
  start: [todo: Todo]
  endFocus: []
  end: [todo: Todo]
}>()

const focusStore = useFocusStore()

const visibleTodos = computed(() => props.todos.slice(0, props.maxDisplay))
const hiddenCount = computed(() => Math.max(0, props.todos.length - props.maxDisplay))
</script>

<template>
  <div class="todo-list h-full overflow-y-auto scrollbar-thin">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <span class="text-xs text-gray-400">加载中...</span>
    </div>

    <!-- 无 TODO -->
    <div v-else-if="todos.length === 0" class="flex items-center justify-center h-full">
      <div class="text-center">
        <p class="text-sm text-gray-400">暂无待办</p>
        <p class="text-xs text-gray-300 mt-1">在管理界面添加 TODO</p>
      </div>
    </div>

    <!-- TODO 列表 -->
    <template v-else>
      <TodoTag
        v-for="todo in visibleTodos"
        :key="todo.id"
        :todo="todo"
        :is-active="focusStore.activeTodoId === todo.id && focusStore.isTimerActive"
        :is-other-active="focusStore.hasActiveTodo && focusStore.activeTodoId !== todo.id"
        @start="emit('start', $event)"
        @end-focus="emit('endFocus')"
        @end="emit('end', $event)"
      />

      <!-- 超出上限时显示省略号 -->
      <div v-if="hiddenCount > 0" class="text-center py-1">
        <span class="text-xs text-gray-400">还有 {{ hiddenCount }} 项...</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
</style>
