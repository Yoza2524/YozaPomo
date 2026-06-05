import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Todo, UpdateTodoInput } from '@/types/todo'
import { db } from '@/utils/database'
import { getTodayDate, getYesterdayDate } from '@/utils/format'

export const useTodoStore = defineStore('todo', () => {
  // --- State ---
  const todayTodos = ref<Todo[]>([])
  const yesterdayIncomplete = ref<Todo[]>([])
  const allTodos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const newTodoId = ref<string | null>(null)

  // --- Getters ---
  const todayCount = computed(() => todayTodos.value.length)
  const hasIncompleteFromYesterday = computed(() => yesterdayIncomplete.value.length > 0)

  // --- Actions ---

  /** 加载今日 TODO（仅未完成） */
  async function fetchTodayTodos(retryCount = 0) {
    // 首次加载才显示 loading，避免刷新时组件销毁重建导致闪烁
    if (todayTodos.value.length === 0) loading.value = true
    error.value = null
    try {
      const today = getTodayDate()
      const todos = await db.getTodos(today)
      todayTodos.value = todos.filter((t: Todo) => t.completed === 0)
    } catch (e) {
      // 首次失败时重试一次（可能是数据库连接未就绪）
      if (retryCount < 1) {
        setTimeout(() => fetchTodayTodos(retryCount + 1), 500)
        return
      }
      error.value = `加载今日 TODO 失败: ${e}`
    } finally {
      loading.value = false
    }
  }

  /** 加载昨日未完成 TODO */
  async function fetchYesterdayIncomplete() {
    loading.value = true
    error.value = null
    try {
      const yesterday = getYesterdayDate()
      const todos = await db.getTodos(yesterday)
      yesterdayIncomplete.value = todos.filter((t: Todo) => t.completed === 0)
    } catch (e) {
      error.value = `加载昨日 TODO 失败: ${e}`
    } finally {
      loading.value = false
    }
  }

  /** 加载所有 TODO */
  async function fetchAllTodos() {
    loading.value = true
    error.value = null
    try {
      allTodos.value = await db.getAllTodos()
    } catch (e) {
      error.value = `加载 TODO 列表失败: ${e}`
    } finally {
      loading.value = false
    }
  }

  /** 创建 TODO */
  async function createTodo(title: string, notes?: string): Promise<Todo | null> {
    error.value = null
    try {
      const today = getTodayDate()
      const todo = await db.createTodo(title, today, notes ?? '') as Todo
      if (todo.date === today) {
        todayTodos.value.push(todo)
        // 标记新创建的 TODO，用于动画
        newTodoId.value = todo.id
        setTimeout(() => { newTodoId.value = null }, 500)
      }
      return todo
    } catch (e) {
      error.value = `创建 TODO 失败: ${e}`
      return null
    }
  }

  /** 更新 TODO */
  async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo | null> {
    error.value = null
    try {
      const todo = await db.updateTodo(id, input as Record<string, unknown>) as Todo
      // 更新各缓存列表
      const updateInList = (list: Todo[]) => {
        const i = list.findIndex((t) => t.id === id)
        if (i !== -1) list[i] = todo
      }
      updateInList(todayTodos.value)
      updateInList(yesterdayIncomplete.value)
      updateInList(allTodos.value)
      return todo
    } catch (e) {
      error.value = `更新 TODO 失败: ${e}`
      return null
    }
  }

  /** 删除 TODO */
  async function deleteTodo(id: string): Promise<boolean> {
    error.value = null
    try {
      await db.deleteTodo(id)
      todayTodos.value = todayTodos.value.filter((t) => t.id !== id)
      yesterdayIncomplete.value = yesterdayIncomplete.value.filter((t) => t.id !== id)
      allTodos.value = allTodos.value.filter((t) => t.id !== id)
      return true
    } catch (e) {
      error.value = `删除 TODO 失败: ${e}`
      return false
    }
  }

  return {
    todayTodos,
    yesterdayIncomplete,
    allTodos,
    loading,
    error,
    newTodoId,
    todayCount,
    hasIncompleteFromYesterday,
    fetchTodayTodos,
    fetchYesterdayIncomplete,
    fetchAllTodos,
    createTodo,
    updateTodo,
    deleteTodo,
  }
})
