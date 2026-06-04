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
  const todayMinutes = computed(() => todayStats.value?.totalMinutes ?? 0)
  const todaySessionCount = computed(() => todayStats.value?.sessionCount ?? 0)

  /** 计时器是否在运行中（用于按钮状态） */
  const isTimerActive = computed(
    () => timer.status.value === 'running' || timer.status.value === 'paused' || timer.status.value === 'overtime',
  )

  // --- Actions ---

  /** 开始专注 */
  async function startFocus(todoId: string | null, plannedDuration: number): Promise<FocusSession | null> {
    error.value = null
    try {
      const session = (await db.createFocusSession({ todoId, plannedDuration })) as FocusSession
      currentSession.value = session
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

  /** 倒计时归零后暂停（等待用户确认继续/结束） */
  function onCountdownEnd() {
    timer.pause()
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
      status.value = 'idle'
      timer.reset()
      await fetchTodayStats()
      return true
    } catch (e) {
      error.value = `结束专注失败: ${e}`
      return false
    }
  }

  /** 异常结束专注（"我还在"超时未点击） */
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
    // 阶段六实现完整休息逻辑
    status.value = 'idle'
    timer.reset()
    currentSession.value = null
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
    // Timer (from useTimer)
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
    isTimerActive,
    todayMinutes,
    todaySessionCount,
    // Actions
    startFocus,
    pauseFocus,
    resumeFocus,
    onCountdownEnd,
    completeFocus,
    abortFocus,
    startRest,
    fetchRecentSessions,
    fetchTodayStats,
  }
})
