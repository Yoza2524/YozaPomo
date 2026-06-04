<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useTodoStore } from '@/stores/todoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFocusStore } from '@/stores/focusStore'
import TodoList from './TodoList.vue'
import FocusButton from './FocusButton.vue'
import FocusPanel from './FocusPanel.vue'
import ReminderBanner from './ReminderBanner.vue'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const focusStore = useFocusStore()

onMounted(async () => {
  await Promise.all([
    settingsStore.loadSettings(),
    todoStore.fetchTodayTodos(),
  ])
})

// 监听"我还在"提醒自动消失 → 异常结束专注
watch(
  () => focusStore.showReminder,
  (showing, wasShowing) => {
    if (
      wasShowing &&
      !showing &&
      !focusStore.reminderDismissed &&
      focusStore.isTimerActive
    ) {
      focusStore.abortFocus()
    }
  },
)
</script>

<template>
  <div class="w-full h-full flex flex-col select-none overflow-hidden rounded-[16px]">
    <!-- 可拖拽标题栏 -->
    <div
      data-tauri-drag-region
      class="flex items-center justify-between px-3 py-2 cursor-move shrink-0"
    >
      <span class="text-xs text-gray-400 font-medium">{{ todoStore.todayCount }} 个待办</span>
    </div>

    <!-- 倒计时面板（专注中/暂停时显示） -->
    <FocusPanel />

    <!-- "我还在"提醒横幅 -->
    <div v-if="focusStore.showReminder" class="px-3">
      <ReminderBanner />
    </div>

    <!-- TODO 标签列表（空闲时显示） -->
    <div v-if="!focusStore.isTimerActive" class="flex-1 px-3 overflow-hidden">
      <TodoList
        :todos="todoStore.todayTodos"
        :max-display="settingsStore.todoDisplayCount"
        :loading="todoStore.loading"
      />
    </div>

    <!-- 专注中时的紧凑 TODO 提示 -->
    <div v-else class="flex-1 px-3 overflow-hidden flex items-center justify-center">
      <span class="text-xs text-gray-400">专注中，保持专注 💪</span>
    </div>

    <!-- 底部操作区 -->
    <div class="px-4 pb-4 pt-2 shrink-0">
      <FocusButton :disabled="todoStore.todayTodos.length === 0" />
    </div>
  </div>
</template>

<style scoped>
</style>
