import { ref, computed, type Ref } from 'vue'

/** 计时器状态 */
export type TimerStatus = 'idle' | 'running' | 'overtime'

/** useTimer 返回值 */
export interface UseTimerReturn {
  remainingSeconds: Ref<number>
  totalElapsed: Ref<number>
  plannedDuration: Ref<number>
  status: Ref<TimerStatus>
  showReminder: Ref<boolean>
  isOvertime: Ref<boolean>

  start: (plannedDuration: number, reminderInterval: number, overtimeReminderInterval: number) => void
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

  const isOvertime = computed(() => status.value === 'overtime')

  let intervalId: ReturnType<typeof setInterval> | null = null

  // 提醒调度：记录上次提醒的 totalElapsed
  let lastReminderTick = 0
  let reminderIntervalSec = 300
  let overtimeReminderIntervalSec = 180

  // --- Internal helpers ---

  function clearAllTimers() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function tick() {
    totalElapsed.value += 1

    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1

      // 倒计时归零 → 进入超时
      if (remainingSeconds.value <= 0) {
        status.value = 'overtime'
        // 进入超时时重置提醒计时，从超时起点开始计 3 分钟
        lastReminderTick = totalElapsed.value
      }
    } else {
      // 超时阶段：倒计时归零后继续累计
      remainingSeconds.value -= 1 // 变成负数，表示超时秒数
    }

    // 周期性提醒检查
    const interval =
      status.value === 'overtime' ? overtimeReminderIntervalSec : reminderIntervalSec
    if (totalElapsed.value - lastReminderTick >= interval) {
      lastReminderTick = totalElapsed.value
      showReminder.value = true
    }
  }

  // --- Public API ---

  function start(
    duration: number,
    reminderInterval: number,
    overtimeReminderInterval: number,
  ) {
    clearAllTimers()
    plannedDuration.value = duration
    remainingSeconds.value = duration
    totalElapsed.value = 0
    status.value = 'running'
    showReminder.value = false
    lastReminderTick = 0
    reminderIntervalSec = reminderInterval
    overtimeReminderIntervalSec = overtimeReminderInterval

    // 每秒 tick
    intervalId = setInterval(tick, 1000)
  }

  function stop(): { actualDuration: number } {
    clearAllTimers()
    const actual = totalElapsed.value
    status.value = 'idle'
    showReminder.value = false
    return { actualDuration: actual }
  }

  function dismissReminder() {
    showReminder.value = false
  }

  function reset() {
    clearAllTimers()
    remainingSeconds.value = 0
    totalElapsed.value = 0
    plannedDuration.value = 0
    status.value = 'idle'
    showReminder.value = false
    lastReminderTick = 0
  }

  return {
    remainingSeconds,
    totalElapsed,
    plannedDuration,
    status,
    showReminder,
    isOvertime,
    start,
    stop,
    dismissReminder,
    reset,
  }
}
