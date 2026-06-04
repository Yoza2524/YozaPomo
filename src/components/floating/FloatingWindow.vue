<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import type { Todo } from '@/types/todo'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'
import { useTodoStore } from '@/stores/todoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFocusStore } from '@/stores/focusStore'
import TodoList from './TodoList.vue'
import FocusButton from './FocusButton.vue'
import ReminderBanner from './ReminderBanner.vue'
import NotesModal from './NotesModal.vue'
import ParticleCanvas from './ParticleCanvas.vue'
import { playFocusEndSound, playReminderSound } from '@/utils/sound'
import { useAutoResize } from '@/composables/useAutoResize'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const focusStore = useFocusStore()

// 窗口大小自适应内容
const contentRef = ref<HTMLElement | null>(null)
useAutoResize(contentRef)

// 笔记弹窗状态
const showTodoNotes = ref(false)
const pendingTodoId = ref<string | null>(null)

// 粒子动画
const showFocusEndParticles = ref(false)
const showReminderParticles = ref(false)

// 跨窗口事件同步
let unlistenTodoChanged: UnlistenFn | null = null
let unlistenSettingsChanged: UnlistenFn | null = null

onMounted(async () => {
  await Promise.all([settingsStore.loadSettings(), todoStore.fetchTodayTodos()])

  // 监听管理界面的 TODO 变更，同步刷新悬浮窗
  unlistenTodoChanged = await listen('todo-changed', () => {
    todoStore.fetchTodayTodos()
  })

  // 监听设置变更，重新加载设置
  unlistenSettingsChanged = await listen('settings-changed', () => {
    settingsStore.loadSettings()
  })
})

onUnmounted(() => {
  if (unlistenTodoChanged) unlistenTodoChanged()
  if (unlistenSettingsChanged) unlistenSettingsChanged()
})

// 专注结束动画（倒计时归零 → 进入超时）
watch(
  () => focusStore.isOvertime,
  (isOvertime, wasOvertime) => {
    if (isOvertime && !wasOvertime) {
      showFocusEndParticles.value = true
      playFocusEndSound(settingsStore.notificationSound)
    }
  },
)

// 5 分钟提醒动画
watch(
  () => focusStore.showReminder,
  (showing) => {
    if (showing) {
      showReminderParticles.value = true
      playReminderSound(settingsStore.notificationSound)
    }
  },
)

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

/** 双击已激活 TODO → 结束专注 */
async function handleEndFocus() {
  await focusStore.completeFocus()
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

/** 专注结束粒子动画完成 */
function onFocusEndParticlesDone() {
  showFocusEndParticles.value = false
}

/** 提醒粒子动画完成 */
function onReminderParticlesDone() {
  showReminderParticles.value = false
}
</script>

<template>
  <div ref="contentRef" class="floating-root w-full h-full flex flex-col select-none overflow-hidden rounded-[16px] relative" @contextmenu.prevent>
    <!-- 专注结束粒子动画 -->
    <ParticleCanvas
      v-if="showFocusEndParticles"
      :count="45"
      :colors="['#6366f1', '#818cf8', '#22c55e', '#4f46e5', '#a78bfa']"
      :min-radius="2"
      :max-radius="6"
      :duration="2800"
      :speed="1.2"
      :from-center="true"
      @done="onFocusEndParticlesDone"
    />

    <!-- 提醒粒子动画（小型） -->
    <ParticleCanvas
      v-if="showReminderParticles"
      :count="20"
      :colors="['#f59e0b', '#fbbf24', '#fcd34d']"
      :min-radius="1.5"
      :max-radius="4"
      :duration="1500"
      :speed="0.6"
      :from-center="false"
      @done="onReminderParticlesDone"
    />

    <!-- 可拖拽标题栏 -->
    <div
      data-tauri-drag-region
      class="flex items-center justify-between px-3 py-4 cursor-default shrink-0"
    >
    </div>

    <!-- "我还在"提醒 -->
    <div v-if="focusStore.showReminder" class="px-3">
      <ReminderBanner />
    </div>

    <!-- TODO 标签列表（始终可见） -->
    <div class="flex-1 px-3 overflow-hidden">
      <TodoList
        :todos="todoStore.todayTodos"
        :max-display="settingsStore.todoDisplayCount"
        :loading="todoStore.loading"
        @start="handleTodoStart"
        @pause="handleTodoPause"
        @resume="handleTodoResume"
        @end-focus="handleEndFocus"
        @end="handleTodoEnd"
      />
    </div>

    <!-- 底部操作区 -->
    <div class="px-4 pb-4 pt-2 shrink-0">
      <FocusButton :disabled="false" />
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
/* 透明区域点击穿透：根容器不接收鼠标事件，内容区域接收 */
.floating-root {
  pointer-events: none;
}
.floating-root > * {
  pointer-events: auto;
}
</style>
