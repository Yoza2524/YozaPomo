<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue'
import type { Todo } from '@/types/todo'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'
import { useTodoStore } from '@/stores/todoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFocusStore } from '@/stores/focusStore'
import TodoList from './TodoList.vue'
import FocusButton from './FocusButton.vue'
import NotesModal from './NotesModal.vue'
import { playFocusEndSound, playReminderSound } from '@/utils/sound'
import { emitTo } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useAutoResize } from '@/composables/useAutoResize'
import { logWithSource } from '@/utils/logger'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const focusStore = useFocusStore()
const isOvertime = computed(() => focusStore.isOvertime)

logWithSource('info', 'FloatingWindow[floating]', '悬浮窗组件初始化')

// 窗口大小自适应内容
const contentRef = ref<HTMLElement | null>(null)
useAutoResize(contentRef)

// 笔记弹窗状态
const showTodoNotes = ref(false)
const pendingTodoId = ref<string | null>(null)

// 跨窗口事件同步
let unlistenTodoChanged: UnlistenFn | null = null
let unlistenSettingsChanged: UnlistenFn | null = null

onMounted(async () => {
  logWithSource('info', 'FloatingWindow', '悬浮窗 onMounted 开始')

  try {
    await Promise.all([settingsStore.loadSettings(), todoStore.fetchTodayTodos()])
    logWithSource('info', 'FloatingWindow', `加载完成: ${todoStore.todayTodos.length} 个 TODO`)
  } catch (e) {
    logWithSource('error', 'FloatingWindow', `加载数据失败: ${e}`)
  }

  // 监听管理界面的 TODO 变更，同步刷新悬浮窗
  unlistenTodoChanged = await listen('todo-changed', () => {
    logWithSource('info', 'FloatingWindow', '收到 todo-changed 事件，刷新列表')
    todoStore.fetchTodayTodos()
  })

  // 监听设置变更，重新加载设置
  unlistenSettingsChanged = await listen('settings-changed', () => {
    logWithSource('info', 'FloatingWindow', '收到 settings-changed 事件，重新加载')
    settingsStore.loadSettings()
  })

  logWithSource('info', 'FloatingWindow', '悬浮窗 onMounted 完成')
})

onUnmounted(() => {
  if (unlistenTodoChanged) unlistenTodoChanged()
  if (unlistenSettingsChanged) unlistenSettingsChanged()
  stopReminderInputDetection()
})

// 专注结束动画（倒计时归零 → 进入超时）
watch(
  isOvertime,
  (now, was) => {
    if (now && !was) {
      emitTo('overlay', 'show-particle-focus-end')
      playFocusEndSound(settingsStore.notificationSound)
    }
  },
)

// 提醒触发 → 开始输入检测（2 秒宽限期后才显示按钮）
watch(
  () => focusStore.showReminder,
  (showing) => {
    if (showing) {
      startReminderInputDetection()
    } else {
      emitTo('overlay', 'hide-reminder-text')
      stopReminderInputDetection()
    }
  },
)

const REMINDER_GRACE_MS = 2000 // 2 秒宽限期

let inputCheckTimer: ReturnType<typeof setInterval> | null = null

function startReminderInputDetection() {
  const startTime = Date.now()
  let lastInputTick = 0
  let gracePassed = false

  inputCheckTimer = setInterval(async () => {
    if (!focusStore.showReminder) return
    try {
      const tick = await invoke<number>('get_last_input_tick')
      if (lastInputTick === 0) {
        lastInputTick = tick
        return
      }
      // tick 变了 → 有输入（鼠标或键盘）
      if (tick !== lastInputTick) {
        // 宽限期内有输入 → 静默消除提醒
        // 宽限期后有输入 → 隐藏按钮 + 消除提醒
        if (gracePassed) {
          emitTo('overlay', 'hide-reminder-text')
        }
        focusStore.dismissReminder()
        return
      }
      const elapsed = Date.now() - startTime

      // 2 秒宽限期到了，还没有输入 → 显示"还在吗？"
      if (!gracePassed && elapsed >= REMINDER_GRACE_MS) {
        gracePassed = true
        emitTo('overlay', 'show-reminder-text')
        playReminderSound(settingsStore.notificationSound)
        // 超时状态下的提醒带小烟花特效
        if (isOvertime.value) {
          emitTo('overlay', 'show-particle-reminder')
        }
      }

      // 超过异常检测时长 → 异常结束专注
      if (elapsed >= settingsStore.idleTimeout * 1000) {
        focusStore.dismissReminder()
        focusStore.abortFocus()
        emitTo('overlay', 'hide-reminder-text')
      }
    } catch {
      // 忽略调用失败
    }
  }, 250)
}

function stopReminderInputDetection() {
  if (inputCheckTimer !== null) {
    clearInterval(inputCheckTimer)
    inputCheckTimer = null
  }
}

// --- TODO 交互事件 ---

/** 双击/右键开始某个 TODO */
async function handleTodoStart(todo: Todo) {
  const duration = settingsStore.focusDuration
  await focusStore.startFocus(todo.id, duration)
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

</script>

<template>
  <div ref="contentRef" class="floating-root w-full h-full flex flex-col select-none overflow-hidden rounded-[16px] relative" @contextmenu.prevent>
    <!-- 可拖拽标题栏 -->
    <div
      data-tauri-drag-region
      class="flex items-center justify-between px-3 py-4 cursor-default shrink-0"
    >
    </div>

    <!-- TODO 标签列表（始终可见） -->
    <div class="flex-1 px-3 overflow-hidden">
      <TodoList
        :todos="todoStore.todayTodos"
        :max-display="settingsStore.todoDisplayCount"
        :loading="todoStore.loading"
        @start="handleTodoStart"
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
