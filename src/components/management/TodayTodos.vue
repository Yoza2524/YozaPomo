<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NInput, NSpace, NSpin, NEmpty, NPopconfirm, NTag, useMessage } from 'naive-ui'
import { useTodoStore } from '@/stores/todoStore'
import type { Todo } from '@/types/todo'
import { formatTime } from '@/utils/format'
import TodoDetail from './TodoDetail.vue'

const todoStore = useTodoStore()
const message = useMessage()

const editingId = ref<string | null>(null)
const editTitle = ref('')
const showDetail = ref(false)
const detailTodo = ref<Todo | null>(null)

onMounted(async () => {
  await todoStore.fetchTodayTodos()
})

// 添加新 TODO
const newTitle = ref('')
const adding = ref(false)

async function handleAdd() {
  if (!newTitle.value.trim()) {
    message.warning('请输入标题')
    return
  }
  adding.value = true
  await todoStore.createTodo(newTitle.value.trim())
  await todoStore.fetchTodayTodos()
  newTitle.value = ''
  adding.value = false
}

function startEdit(todo: Todo) {
  editingId.value = todo.id
  editTitle.value = todo.title
}

async function saveEdit(todo: Todo) {
  if (!editTitle.value.trim()) return
  await todoStore.updateTodo(todo.id, { title: editTitle.value.trim() })
  await todoStore.fetchTodayTodos()
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

async function handleComplete(todo: Todo) {
  await todoStore.updateTodo(todo.id, { completed: 1 })
  await todoStore.fetchTodayTodos()
  message.success('已标记完成')
}

async function handleDelete(todo: Todo) {
  await todoStore.deleteTodo(todo.id)
  await todoStore.fetchTodayTodos()
  message.success('已删除')
}

function handleDetail(todo: Todo) {
  detailTodo.value = todo
  showDetail.value = true
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center gap-2 mb-4">
      <NInput
        v-model:value="newTitle"
        placeholder="添加今日 TODO..."
        class="flex-1"
        @keyup.enter="handleAdd"
      />
      <NButton type="primary" :loading="adding" @click="handleAdd">添加</NButton>
    </div>

    <NSpin :show="todoStore.loading">
      <NEmpty v-if="todoStore.todayTodos.length === 0 && !todoStore.loading" description="今日暂无 TODO" />
      <div v-else class="space-y-2">
        <div
          v-for="todo in todoStore.todayTodos"
          :key="todo.id"
          class="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <!-- 编辑模式 -->
              <div v-if="editingId === todo.id" class="flex items-center gap-2">
                <NInput
                  v-model:value="editTitle"
                  size="small"
                  class="flex-1"
                  @keyup.enter="saveEdit(todo)"
                />
                <NButton size="tiny" type="primary" @click="saveEdit(todo)">保存</NButton>
                <NButton size="tiny" @click="cancelEdit">取消</NButton>
              </div>
              <!-- 显示模式 -->
              <template v-else>
                <div class="flex items-center gap-2">
                  <span
                    class="text-sm font-medium truncate"
                    :class="{ 'line-through text-gray-400': todo.completed }"
                  >
                    {{ todo.title }}
                  </span>
                  <NTag v-if="todo.completed" type="success" size="small">完成</NTag>
                </div>
                <div class="text-xs text-gray-400 mt-0.5">
                  创建于 {{ formatTime(todo.createdAt) }}
                </div>
              </template>
            </div>
            <!-- 操作按钮 -->
            <NSpace v-if="editingId !== todo.id" size="small" class="ml-2 shrink-0">
              <NButton size="tiny" @click="handleDetail(todo)">详情</NButton>
              <NButton size="tiny" @click="startEdit(todo)">编辑</NButton>
              <NButton
                v-if="!todo.completed"
                size="tiny"
                type="success"
                @click="handleComplete(todo)"
              >
                完成
              </NButton>
              <NPopconfirm @positive-click="() => handleDelete(todo)">
                <template #trigger>
                  <NButton size="tiny" type="error">删除</NButton>
                </template>
                确定删除？
              </NPopconfirm>
            </NSpace>
          </div>
        </div>
      </div>
    </NSpin>

    <!-- 详情弹窗 -->
    <n-modal v-model:show="showDetail" title="TODO 详情">
      <TodoDetail
        v-if="detailTodo"
        :todo="detailTodo"
        @close="showDetail = false"
        @refresh="todoStore.fetchTodayTodos()"
      />
    </n-modal>
  </div>
</template>
