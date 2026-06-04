<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import type { Todo } from '@/types/todo'
import { useTodoStore } from '@/stores/todoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFocusStore } from '@/stores/focusStore'
import TodoList from './TodoList.vue'
import FocusButton from './FocusButton.vue'
import FocusPanel from './FocusPanel.vue'
import ReminderBanner from './ReminderBanner.vue'
import NotesModal from './NotesModal.vue'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const focusStore = useFocusStore()

// 笔记弹窗状态
const showTodoNotes = ref(false)
const pendingTodoId = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([settingsStore.loadSettings(), todoStore.fetchTodayTodos()])
})

// "我还在"提醒自动消失 → 异常结束
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

// --- TODO 交互事件 ---

/** 双击/右键开始某个 TODO */
async function handleTodoStart(todo: Todo) {
  const duration = settingsStore.focusDuration
  await focusStore.startFocus(todo.id, duration)
}

/** 双击已激活 TODO → 暂停 */
function handleTodoPause() {
  focusStore.pauseFocus()
}

/** 双击暂停中 → 恢复 */
function handleTodoResume() {
  focusStore.resumeFocus()
}

/** 结束 TODO → 弹出备注窗口 */
function handleTodoEnd(todo: Todo) {
  pendingTodoId.value = todo.id
  showTodoNotes.value = true
}

/** TODO 备注确认 */
async function handleTodoNotesConfirm(notes: string) {
  if (pendingTodoId.value) {
    // 如果正在专注，先结束专注
    if (focusStore.activeTodoId === pendingTodoId.value && focusStore.isTimerActive) {
      await focusStore.completeFocus()
    }
    // 标记 TODO 完成
    await todoStore.updateTodo(pendingTodoId.value, { completed: 1, notes })
    // 刷新列表
    await todoStore.fetchTodayTodos()
  }
  showTodoNotes.value = false
  pendingTodoId.value = null
}

/** TODO 备注取消 */
function handleTodoNotesCancel() {
  showTodoNotes.value = false
  pendingTodoId.value = null
}
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

    <!-- 倒计时面板 -->
    <FocusPanel />

    <!-- "我还在"提醒 -->
    <div v-if="focusStore.showReminder" class="px-3">
      <ReminderBanner />
    </div>

    <!-- TODO 标签列表 -->
    <div v-if="!focusStore.isTimerActive" class="flex-1 px-3 overflow-hidden">
      <TodoList
        :todos="todoStore.todayTodos"
        :max-display="settingsStore.todoDisplayCount"
        :loading="todoStore.loading"
        @start="handleTodoStart"
        @pause="handleTodoPause"
        @resume="handleTodoResume"
        @end="handleTodoEnd"
      />
    </div>

    <!-- 专注中提示 -->
    <div v-else class="flex-1 px-3 overflow-hidden flex items-center justify-center">
      <span class="text-xs text-gray-400">专注中，保持专注 💪</span>
    </div>

    <!-- 底部操作区 -->
    <div class="px-4 pb-4 pt-2 shrink-0">
      <FocusButton :disabled="todoStore.todayTodos.length === 0" />
    </div>

    <!-- TODO 备注弹窗 -->
    <Teleport to="body">
      <NotesModal
        v-if="showTodoNotes"
        title="TODO 备注"
        placeholder="记录完成情况..."
        @confirm="handleTodoNotesConfirm"
        @cancel="handleTodoNotesCancel"
      />
    </Teleport>
  </div>
</template>

<style scoped>
</style>
