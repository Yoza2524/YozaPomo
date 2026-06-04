/** 专注状态 */
export type FocusStatus = 'idle' | 'focusing' | 'paused' | 'completed' | 'abnormal'

/** 专注会话 */
export interface FocusSession {
  id: string
  todoId: string | null
  startTime: string
  endTime: string | null
  plannedDuration: number
  actualDuration: number
  status: FocusStatus
  notes: string
  createdAt: string
}

/** 创建专注会话的输入 */
export interface CreateFocusSessionInput {
  todoId?: string | null
  plannedDuration: number
}

/** 更新专注会话的输入 */
export interface UpdateFocusSessionInput {
  todoId?: string | null
  endTime?: string
  actualDuration?: number
  status?: FocusStatus
  notes?: string
}

/** 今日专注统计 */
export interface TodayFocusStats {
  totalMinutes: number
  sessionCount: number
}
