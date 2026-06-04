import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FocusSession, FocusStatus, TodayFocusStats } from '@/types/focus'
import { useTimer } from '@/composables/useTimer'
import { db } from '@/utils/database'

export const useFocusStore = defineStore('focus', () => {
  // --- Timer ---
  const timer = useTimer()

  // --- State ---
  const status = ref<FocusStatus>('idle')
  const currentSession = ref<FocusSession | null>(null)
  /** 当前激活的 TODO ID（双击启动专注时绑定） */
  const activeTodoId = ref<string | null>(null)
  const recentSessions = ref<FocusSession[]>([])
  const todayStats = ref<TodayFocusStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // --- Getters ---
  const isFocusing = computed(() => status.value === 'focusing')
  const isPaused = computed(() => status.value === 'paused')
  const isIdle = computed(() => status.value === 'idle')
  const isOvertime = computed(() => timer.status.value === 'overtime')
  const isCompleted = computed(() => status.value === 'completed')
  const isResting = computed(() => status.value === 'resting')
  const todayMinutes = computed(() => todayStats.value?.totalMinutes ?? 0)
  const todaySessionCount = computed(() => todayStats.value?.sessionCount ?? 0)
  const hasActiveTodo = computed(() => activeTodoId.value !== null)

  /** 计时器是否在运行中 */
  const isTimerActive = computed(
    () =>
      timer.status.value === 'running' ||
      timer.status.value === 'paused' ||
      timer.status.value === 'overtime',
  )

  // --- Actions ---

  /** 开始专注 */
  async function startFocus(
    todoId: string | null,
    plannedDuration: number,
  ): Promise<FocusSession | null> {
    error.value = null
    // 互斥：已有进行中 TODO 时禁止开始其他
    if (hasActiveTodo.value && todoId !== null && todoId !== activeTodoId.value) {
      error.value = '已有进行中的 TODO，请先结束它'
      return null
    }
    try {
      const session = (await db.createFocusSession({
        todoId,
        plannedDuration,
      })) as FocusSession
      currentSession.value = session
      activeTodoId.value = todoId
      status.value = 'focusing'
      timer.start(plannedDuration)
      return session
    } catch (e) {
      error.value = `开始专注失败: ${e}`
      return null
    }
  }

  /** 暂停专注 */
  function pauseFocus() {
    if (status.value !== 'focusing') return
    status.value = 'paused'
  }

  /** 恢复专注 */
  function resumeFocus() {
    if (status.value !== 'paused' || !currentSession.value) return
    status.value = 'focusing'
  }

  /** 完成专注 */
  async function completeFocus(notes?: string): Promise<boolean> {
    error.value = null
    if (!currentSession.value) return false
    const sessionId = currentSession.value.id
    try {
      const { actualDuration } = timer.stop()
      const now = new Date().toISOString()
      await db.updateFocusSession(sessionId, {
        endTime: now,
        actualDuration,
        status: 'completed',
        notes: notes ?? '',
      })
      currentSession.value = null
      activeTodoId.value = null
      status.value = 'idle'
      timer.reset()
      await fetchTodayStats()
      return true
    } catch (e) {
      error.value = `结束专注失败: ${e}`
      return false
    }
  }

  /** 异常结束专注 */
  async function abortFocus(): Promise<boolean> {
    error.value = null
    if (!currentSession.value) return false
    const sessionId = currentSession.value.id
    try {
      const { actualDuration } = timer.stop()
      const now = new Date().toISOString()
      await db.updateFocusSession(sessionId, {
        endTime: now,
        actualDuration,
        status: 'abnormal',
      })
      currentSession.value = null
      activeTodoId.value = null
      status.value = 'idle'
      timer.reset()
      return true
    } catch (e) {
      error.value = `异常结束失败: ${e}`
      return false
    }
  }

  /** 开始休息 */
  function startRest() {
    status.value = 'resting'
    // 使用设置中的休息时长，如果没设置则默认 5 分钟
    const restDuration = 300 // TODO: 从设置中读取
    timer.start(restDuration)
  }

  /** 结束休息 */
  function endRest() {
    status.value = 'idle'
    timer.reset()
    currentSession.value = null
    activeTodoId.value = null
  }

  /** 加载最近的专注会话 */
  async function fetchRecentSessions(limit: number = 20) {
    loading.value = true
    error.value = null
    try {
      recentSessions.value = (await db.getRecentFocusSessions(limit)) as FocusSession[]
    } catch (e) {
      error.value = `加载专注历史失败: ${e}`
    } finally {
      loading.value = false
    }
  }

  /** 加载今日专注统计 */
  async function fetchTodayStats() {
    error.value = null
    try {
      todayStats.value = await db.getTodayFocusStats()
    } catch (e) {
      error.value = `加载统计失败: ${e}`
    }
  }

  return {
    // Timer
    remainingSeconds: timer.remainingSeconds,
    totalElapsed: timer.totalElapsed,
    plannedDuration: timer.plannedDuration,
    timerStatus: timer.status,
    showReminder: timer.showReminder,
    reminderDismissed: timer.reminderDismissed,
    dismissReminder: timer.dismissReminder,
    // Focus state
    status,
    currentSession,
    activeTodoId,
    recentSessions,
    todayStats,
    loading,
    error,
    // Getters
    isFocusing,
    isPaused,
    isIdle,
    isOvertime,
    isCompleted,
    isResting,
    isTimerActive,
    hasActiveTodo,
    todayMinutes,
    todaySessionCount,
    // Actions
    startFocus,
    pauseFocus,
    resumeFocus,
    completeFocus,
    abortFocus,
    startRest,
    endRest,
    fetchRecentSessions,
    fetchTodayStats,
  }
})
