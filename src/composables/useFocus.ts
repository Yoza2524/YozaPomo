import { ref } from 'vue'
import { db } from '@/utils/database'
import type {
  FocusSession,
  CreateFocusSessionInput,
  UpdateFocusSessionInput,
  TodayFocusStats,
} from '@/types/focus'

/**
 * 专注会话组合式函数
 */
export function useFocus() {
  const sessions = ref<FocusSession[]>([])
  const todayStats = ref<TodayFocusStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 创建专注会话 */
  async function createFocusSession(
    input: CreateFocusSessionInput,
  ): Promise<FocusSession | null> {
    error.value = null
    try {
      const session = await db.createFocusSession(input)
      return session as FocusSession
    } catch (e) {
      error.value = `创建专注会话失败: ${e}`
      console.error(error.value)
      return null
    }
  }

  /** 获取指定 TODO 的专注历史 */
  async function fetchTodoSessions(todoId: string) {
    loading.value = true
    error.value = null
    try {
      sessions.value = (await db.getTodoFocusSessions(todoId)) as FocusSession[]
    } catch (e) {
      error.value = `获取专注历史失败: ${e}`
      console.error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** 获取最近的专注会话 */
  async function fetchRecentSessions(limit: number = 20) {
    loading.value = true
    error.value = null
    try {
      sessions.value = (await db.getRecentFocusSessions(limit)) as FocusSession[]
    } catch (e) {
      error.value = `获取专注历史失败: ${e}`
      console.error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** 获取今日专注统计 */
  async function fetchTodayStats() {
    error.value = null
    try {
      todayStats.value = await db.getTodayFocusStats()
    } catch (e) {
      error.value = `获取今日统计失败: ${e}`
      console.error(error.value)
    }
  }

  /** 更新专注会话 */
  async function updateFocusSession(
    id: string,
    input: UpdateFocusSessionInput,
  ): Promise<FocusSession | null> {
    error.value = null
    try {
      const session = await db.updateFocusSession(id, input as Record<string, unknown>)
      return session as FocusSession
    } catch (e) {
      error.value = `更新专注会话失败: ${e}`
      console.error(error.value)
      return null
    }
  }

  /** 删除专注会话 */
  async function deleteFocusSession(id: string): Promise<boolean> {
    error.value = null
    try {
      await db.deleteFocusSession(id)
      sessions.value = sessions.value.filter((s) => s.id !== id)
      return true
    } catch (e) {
      error.value = `删除专注会话失败: ${e}`
      console.error(error.value)
      return false
    }
  }

  return {
    sessions,
    todayStats,
    loading,
    error,
    createFocusSession,
    fetchTodoSessions,
    fetchRecentSessions,
    fetchTodayStats,
    updateFocusSession,
    deleteFocusSession,
  }
}
