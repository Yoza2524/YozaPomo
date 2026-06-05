<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed, nextTick } from 'vue'
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
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PhysicalPosition } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()
const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const focusStore = useFocusStore()
const isOvertime = computed(() => focusStore.isOvertime)
const isPinned = computed(() => settingsStore.floatingPinned)

// 窗口大小自适应内容
const contentRef = ref<HTMLElement | null>(null)
const { immediateResize } = useAutoResize(contentRef)

// 笔记弹窗状态
const showTodoNotes = ref(false)
const pendingTodoId = ref<string | null>(null)

// 跨窗口事件同步
let unlistenTodoChanged: UnlistenFn | null = null
let unlistenSettingsChanged: UnlistenFn | null = null
let unlistenUnpin: UnlistenFn | null = null

onMounted(async () => {
  try {
    await Promise.all([settingsStore.loadSettings(), todoStore.fetchTodayTodos()])
  } catch (e) {
    logWithSource('error', 'FloatingWindow', `加载数据失败: ${e}`)
  }

  // 恢复窗口位置
  if (settingsStore.floatingX !== null && settingsStore.floatingY !== null) {
    try {
      await appWindow.setPosition(new PhysicalPosition(settingsStore.floatingX, settingsStore.floatingY))
    } catch (e) {
      logWithSource('warn', 'FloatingWindow', `恢复位置失败: ${e}`)
    }
  }

  // 监听管理界面的 TODO 变更，同步刷新悬浮窗
  unlistenTodoChanged = await listen<string | null>('todo-changed', (event) => {
    todoStore.fetchTodayTodos()
    // 设置新创建的 TODO ID，用于动画
    if (event.payload && typeof event.payload === 'string') {
      todoStore.newTodoId = event.payload
      setTimeout(() => { todoStore.newTodoId = null }, 500)
    }
  })

  // 监听设置变更，重新加载设置
  unlistenSettingsChanged = await listen('settings-changed', () => {
    settingsStore.loadSettings()
  })

  // 监听托盘切换固定状态事件
  unlistenUnpin = await listen('toggle-pin-floating', () => {
    togglePin()
  })

  // 启动时通知托盘当前固定状态
  const { emit } = await import('@tauri-apps/api/event')
  await emit('pin-status-changed', settingsStore.floatingPinned)

  // 监听窗口移动，保存位置（仅未固定时）
  appWindow.onMoved(({ payload: pos }) => {
    if (!settingsStore.floatingPinned) {
      settingsStore.updateSetting('floatingX', pos.x)
      settingsStore.updateSetting('floatingY', pos.y)
    }
  })
})

onUnmounted(() => {
  if (unlistenTodoChanged) unlistenTodoChanged()
  if (unlistenSettingsChanged) unlistenSettingsChanged()
  if (unlistenUnpin) unlistenUnpin()
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
      // 超时状态：立即播放烟花 + 提示音
      if (isOvertime.value) {
        emitTo('overlay', 'show-particle-reminder')
        playReminderSound(settingsStore.notificationSound)
      }
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

      // 2 秒宽限期到了，还没有输入 → 显示"还在吗？"（声音已在提醒触发时播放）
      if (!gracePassed && elapsed >= REMINDER_GRACE_MS) {
        gracePassed = true
        emitTo('overlay', 'show-reminder-text')
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

// --- 固定/解锁 ---

async function togglePin() {
  const newPinned = !settingsStore.floatingPinned
  await settingsStore.updateSetting('floatingPinned', newPinned)
  logWithSource('info', 'FloatingWindow', `悬浮窗${newPinned ? '固定' : '解锁'}`)
  // 通知托盘更新勾选状态（使用 emit 发送到 app 级别）
  const { emit } = await import('@tauri-apps/api/event')
  await emit('pin-status-changed', newPinned)
  // 立即调整窗口大小，避免视觉延迟
  nextTick(() => immediateResize())
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
  <div
    ref="contentRef"
    class="floating-root w-full h-full flex flex-col select-none overflow-hidden rounded-[16px] relative"
    :class="{ 'floating-pinned': isPinned, 'floating-unpinned': !isPinned }"
    @contextmenu.prevent
  >
    <!-- 可拖拽标题栏（固定时禁用拖拽） -->
    <div
      :data-tauri-drag-region="!isPinned"
      class="flex items-center justify-between px-3 py-2 cursor-default shrink-0"
    >
      <!-- 固定按钮 -->
      <button
        class="pin-btn"
        :class="{ 'pinned': isPinned }"
        @click="togglePin"
        :title="isPinned ? '解锁位置' : '固定位置'"
      >
        <!-- 未固定：斜的图钉 -->
        <svg v-if="!isPinned" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <g transform="rotate(-45, 12, 12)">
            <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
          </g>
        </svg>
        <!-- 已固定：竖的实心图钉 -->
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
          <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
        </svg>
      </button>
    </div>

    <!-- TODO 标签列表（始终可见） -->
    <div class="flex-1 px-3 overflow-hidden">
      <TodoList
        :todos="todoStore.todayTodos"
        :max-display="settingsStore.todoDisplayCount"
        :loading="todoStore.loading"
        :new-todo-id="todoStore.newTodoId"
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

/* 未固定状态：显示边框 */
.floating-unpinned {
  border: 2px solid rgba(200, 200, 200, 0.6);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}

/* 固定状态：无边框，完全透明 */
.floating-pinned {
  border: none;
  background: transparent;
  backdrop-filter: none;
}

/* 固定按钮 */
.pin-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: rgba(200, 200, 200, 0.4);
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.pin-btn:hover {
  background: rgba(200, 200, 200, 0.7);
  color: #333;
}

.pin-btn.pinned {
  background: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.pin-btn.pinned:hover {
  background: rgba(34, 197, 94, 0.5);
}
</style>
