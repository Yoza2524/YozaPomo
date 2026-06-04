import { invoke } from '@tauri-apps/api/core'

/**
 * Tauri 命令调用封装
 * 所有数据库操作通过 invoke 调用 Rust 端命令
 */

// --- TODO 命令 ---
export const db = {
  // TODO
  createTodo: (title: string, date: string, notes?: string) =>
    invoke<any>('create_todo', { input: { title, date, notes } }),

  getTodos: (date: string) => invoke<any[]>('get_todos', { date }),

  getAllTodos: () => invoke<any[]>('get_all_todos'),

  getTodo: (id: string) => invoke<any>('get_todo', { id }),

  updateTodo: (id: string, input: Record<string, unknown>) =>
    invoke<any>('update_todo', { id, input }),

  deleteTodo: (id: string) => invoke<void>('delete_todo', { id }),

  // Focus sessions
  createFocusSession: (input: { todoId?: string | null; plannedDuration: number }) =>
    invoke<any>('create_focus_session', { input }),

  getFocusSession: (id: string) => invoke<any>('get_focus_session', { id }),

  getTodoFocusSessions: (todoId: string) =>
    invoke<any[]>('get_todo_focus_sessions', { todoId }),

  getTodayFocusStats: () =>
    invoke<{ totalMinutes: number; sessionCount: number }>('get_today_focus_stats'),

  getRecentFocusSessions: (limit: number) =>
    invoke<any[]>('get_recent_focus_sessions', { limit }),

  updateFocusSession: (id: string, input: Record<string, unknown>) =>
    invoke<any>('update_focus_session', { id, input }),

  deleteFocusSession: (id: string) => invoke<void>('delete_focus_session', { id }),

  // Settings
  getAllSettings: () => invoke<[string, string][]>('get_all_settings'),

  getSetting: (key: string) => invoke<string>('get_setting', { key }),

  setSetting: (key: string, value: string) =>
    invoke<void>('set_setting', { key, value }),

  updateSettings: (settings: [string, string][]) =>
    invoke<void>('update_settings', { settings }),
}
