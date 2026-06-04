/** TODO 项 */
export interface Todo {
  id: string
  title: string
  date: string
  notes: string
  completed: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 创建 TODO 的输入 */
export interface CreateTodoInput {
  title: string
  date: string
  notes?: string
}

/** 更新 TODO 的输入 */
export interface UpdateTodoInput {
  title?: string
  date?: string
  notes?: string
  completed?: number
  sortOrder?: number
}
