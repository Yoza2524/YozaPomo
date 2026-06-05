import { ref, type Ref } from 'vue'

const REMINDER_AFTER_SECONDS = 5 * 60 // 专注 5 分钟后提醒
const REMINDER_AUTO_DISMISS_SECONDS = 60 // "我还在"按钮 1 分钟后自动消失

/** 计时器状态 */
export type TimerStatus = 'idle' | 'running' | 'overtime'

/** useTimer 返回值 */
export interface UseTimerReturn {
  remainingSeconds: Ref<number>
  totalElapsed: Ref<number>
  plannedDuration: Ref<number>
  status: Ref<TimerStatus>
  showReminder: Ref<boolean>
  reminderDismissed: Ref<boolean>

  start: (plannedDuration: number) => void
  /** 结束计时，返回实际专注时长和状态 */
  stop: () => { actualDuration: number }
  /** 用户点击"我还在" */
  dismissReminder: () => void
  /** 完全重置 */
  reset: () => void
}

export function useTimer(): UseTimerReturn {
  // --- State ---
  const remainingSeconds = ref(0)
  const totalElapsed = ref(0)
  const plannedDuration = ref(0)
  const status = ref<TimerStatus>('idle')
  const showReminder = ref(false)
  const reminderDismissed = ref(false)

  let intervalId: ReturnType<typeof setInterval> | null = null
  let reminderTimerId: ReturnType<typeof setTimeout> | null = null
  let reminderAutoDismissId: ReturnType<typeof setTimeout> | null = null

  // --- Internal helpers ---

  function clearAllTimers() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (reminderTimerId !== null) {
      clearTimeout(reminderTimerId)
      reminderTimerId = null
    }
    if (reminderAutoDismissId !== null) {
      clearTimeout(reminderAutoDismissId)
      reminderAutoDismissId = null
    }
  }

  function tick() {
    totalElapsed.value += 1

    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1

      // 倒计时归零 → 进入超时
      if (remainingSeconds.value <= 0) {
        status.value = 'overtime'
      }
    } else {
      // 超时阶段：倒计时归零后继续累计
      remainingSeconds.value -= 1 // 变成负数，表示超时秒数
    }
  }

  // --- Public API ---

  function start(duration: number) {
    clearAllTimers()
    plannedDuration.value = duration
    remainingSeconds.value = duration
    totalElapsed.value = 0
    status.value = 'running'
    showReminder.value = false
    reminderDismissed.value = false

    // 每秒 tick
    intervalId = setInterval(tick, 1000)

    // 5 分钟后触发提醒
    reminderTimerId = setTimeout(() => {
      if (status.value === 'running') {
        showReminder.value = true

        // 提醒出现后 1 分钟自动消失 → 强制异常结束
        reminderAutoDismissId = setTimeout(() => {
          if (showReminder.value && !reminderDismissed.value) {
            showReminder.value = false
          }
        }, REMINDER_AUTO_DISMISS_SECONDS * 1000)
      }
    }, REMINDER_AFTER_SECONDS * 1000)
  }

  function stop(): { actualDuration: number } {
    clearAllTimers()
    const actual = totalElapsed.value
    status.value = 'idle'
    showReminder.value = false
    return { actualDuration: actual }
  }

  function dismissReminder() {
    reminderDismissed.value = true
    showReminder.value = false
    if (reminderAutoDismissId !== null) {
      clearTimeout(reminderAutoDismissId)
      reminderAutoDismissId = null
    }
  }

  function reset() {
    clearAllTimers()
    remainingSeconds.value = 0
    totalElapsed.value = 0
    plannedDuration.value = 0
    status.value = 'idle'
    showReminder.value = false
    reminderDismissed.value = false
  }

  return {
    remainingSeconds,
    totalElapsed,
    plannedDuration,
    status,
    showReminder,
    reminderDismissed,
    start,
    stop,
    dismissReminder,
    reset,
  }
}
