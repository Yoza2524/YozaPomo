<script setup lang="ts">
import { onMounted } from 'vue'
import { useTodoStore } from '@/stores/todoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import TodoList from './TodoList.vue'
import FocusButton from './FocusButton.vue'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()

onMounted(async () => {
  await Promise.all([
    settingsStore.loadSettings(),
    todoStore.fetchTodayTodos(),
  ])
})
</script>

<template>
  <div
    class="w-full h-full flex flex-col select-none overflow-hidden rounded-[16px]"
  >
    <!-- 可拖拽标题栏 -->
    <div
      data-tauri-drag-region
      class="flex items-center justify-between px-3 py-2 cursor-move shrink-0"
    >
      <span class="text-xs text-gray-400 font-medium">{{ todoStore.todayCount }} 个待办</span>
    </div>

    <!-- TODO 标签列表 -->
    <div class="flex-1 px-3 overflow-hidden">
      <TodoList
        :todos="todoStore.todayTodos"
        :max-display="settingsStore.todoDisplayCount"
        :loading="todoStore.loading"
      />
    </div>

    <!-- 底部操作区 -->
    <div class="px-4 pb-4 pt-2 shrink-0">
      <FocusButton :disabled="todoStore.todayTodos.length === 0" />
    </div>
  </div>
</template>

<style scoped>
</style>
