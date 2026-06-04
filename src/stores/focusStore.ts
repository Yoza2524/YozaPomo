import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FocusSession, FocusStatus, TodayFocusStats } from '@/types/focus'
import { db } from '@/utils/database'

export const useFocusStore = defineStore('focus', () => {
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
  const todayMinutes = computed(() => todayStats.value?.totalMinutes ?? 0)
  const todaySessionCount = computed(() => todayStats.value?.sessionCount ?? 0)

  // --- Actions ---

  /** 开始专注 */
  async function startFocus(todoId: string | null, plannedDuration: number): Promise<FocusSession | null> {
    error.value = null
    try {
      const session = await db.createFocusSession({ todoId, plannedDuration }) as FocusSession
      currentSession.value = session
      status.value = 'focusing'
      return session
    } catch (e) {
      error.value = `开始专注失败: ${e}`
      return null
    }
  }

  /** 暂停专注 */
  function pauseFocus() {
    status.value = 'paused'
  }

  /** 恢复专注 */
  function resumeFocus() {
    if (currentSession.value) {
      status.value = 'focusing'
    }
  }

  /** 完成专注 */
  async function completeFocus(
    actualDuration: number,
    notes?: string,
  ): Promise<boolean> {
    error.value = null
    if (!currentSession.value) return false
    try {
      const now = new Date().toISOString()
      await db.updateFocusSession(currentSession.value.id, {
        endTime: now,
        actualDuration,
        status: 'completed',
        notes: notes ?? '',
      })
      currentSession.value = null
      status.value = 'idle'
      await fetchTodayStats()
      return true
    } catch (e) {
      error.value = `结束专注失败: ${e}`
      return false
    }
  }

  /** 异常结束专注 */
  async function abortFocus(actualDuration: number): Promise<boolean> {
    error.value = null
    if (!currentSession.value) return false
    try {
      const now = new Date().toISOString()
      await db.updateFocusSession(currentSession.value.id, {
        endTime: now,
        actualDuration,
        status: 'abnormal',
      })
      currentSession.value = null
      status.value = 'idle'
      return true
    } catch (e) {
      error.value = `异常结束失败: ${e}`
      return false
    }
  }

  /** 加载最近的专注会话 */
  async function fetchRecentSessions(limit: number = 20) {
    loading.value = true
    error.value = null
    try {
      recentSessions.value = await db.getRecentFocusSessions(limit) as FocusSession[]
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
    status,
    currentSession,
    recentSessions,
    todayStats,
    loading,
    error,
    isFocusing,
    isPaused,
    isIdle,
    todayMinutes,
    todaySessionCount,
    startFocus,
    pauseFocus,
    resumeFocus,
    completeFocus,
    abortFocus,
    fetchRecentSessions,
    fetchTodayStats,
  }
})
