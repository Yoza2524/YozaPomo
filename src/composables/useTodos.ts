import { ref } from 'vue'
import { db } from '@/utils/database'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@/types/todo'

/**
 * TODO CRUD 组合式函数
 * 封装所有 TODO 相关的数据库操作
 */
export function useTodos() {
  const todos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 获取指定日期的 TODO 列表 */
  async function fetchTodosByDate(date: string) {
    loading.value = true
    error.value = null
    try {
      todos.value = await db.getTodos(date)
    } catch (e) {
      error.value = `获取 TODO 失败: ${e}`
      console.error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** 获取所有 TODO */
  async function fetchAllTodos() {
    loading.value = true
    error.value = null
    try {
      todos.value = await db.getAllTodos()
    } catch (e) {
      error.value = `获取所有 TODO 失败: ${e}`
      console.error(error.value)
    } finally {
      loading.value = false
    }
  }

  /** 创建 TODO */
  async function createTodo(input: CreateTodoInput): Promise<Todo | null> {
    error.value = null
    try {
      const todo = await db.createTodo(input.title, input.date, input.notes)
      return todo as Todo
    } catch (e) {
      error.value = `创建 TODO 失败: ${e}`
      console.error(error.value)
      return null
    }
  }

  /** 更新 TODO */
  async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo | null> {
    error.value = null
    try {
      const todo = await db.updateTodo(id, input as Record<string, unknown>)
      // 更新本地列表
      const index = todos.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        todos.value[index] = todo as Todo
      }
      return todo as Todo
    } catch (e) {
      error.value = `更新 TODO 失败: ${e}`
      console.error(error.value)
      return null
    }
  }

  /** 删除 TODO */
  async function deleteTodo(id: string): Promise<boolean> {
    error.value = null
    try {
      await db.deleteTodo(id)
      todos.value = todos.value.filter((t) => t.id !== id)
      return true
    } catch (e) {
      error.value = `删除 TODO 失败: ${e}`
      console.error(error.value)
      return false
    }
  }

  return {
    todos,
    loading,
    error,
    fetchTodosByDate,
    fetchAllTodos,
    createTodo,
    updateTodo,
    deleteTodo,
  }
}
