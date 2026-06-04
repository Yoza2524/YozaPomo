<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NButton,
  NInput,
  NSpace,
  NSpin,
  NEmpty,
  NPopconfirm,
  useMessage,
} from 'naive-ui'
import { useTodoStore } from '@/stores/todoStore'
import type { Todo } from '@/types/todo'
import { formatTime, getTodayDate } from '@/utils/format'
import TodoDetail from './TodoDetail.vue'

const todoStore = useTodoStore()
const message = useMessage()

const editingId = ref<string | null>(null)
const editTitle = ref('')
const showDetail = ref(false)
const detailTodo = ref<Todo | null>(null)

onMounted(async () => {
  await todoStore.fetchYesterdayIncomplete()
})

function startEdit(todo: Todo) {
  editingId.value = todo.id
  editTitle.value = todo.title
}

async function saveEdit(todo: Todo) {
  if (!editTitle.value.trim()) return
  await todoStore.updateTodo(todo.id, { title: editTitle.value.trim() })
  await todoStore.fetchYesterdayIncomplete()
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

/** 移到今日 */
async function handleMoveToToday(todo: Todo) {
  const today = getTodayDate()
  await todoStore.updateTodo(todo.id, { date: today })
  await todoStore.fetchYesterdayIncomplete()
  message.success('已移到今日')
}

async function handleDelete(todo: Todo) {
  await todoStore.deleteTodo(todo.id)
  await todoStore.fetchYesterdayIncomplete()
  message.success('已删除')
}

function handleDetail(todo: Todo) {
  detailTodo.value = todo
  showDetail.value = true
}
</script>

<template>
  <div class="p-4">
    <div class="mb-3">
      <h3 class="text-sm font-semibold text-gray-600">昨日未完成的 TODO</h3>
      <p class="text-xs text-gray-400 mt-1">这些 TODO 可以移到今天继续完成</p>
    </div>

    <NSpin :show="todoStore.loading">
      <NEmpty
        v-if="todoStore.yesterdayIncomplete.length === 0 && !todoStore.loading"
        description="昨日没有未完成的 TODO，继续保持！"
      />
      <div v-else class="space-y-2">
        <div
          v-for="todo in todoStore.yesterdayIncomplete"
          :key="todo.id"
          class="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
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
              <template v-else>
                <span class="text-sm font-medium truncate">{{ todo.title }}</span>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ todo.date }} {{ formatTime(todo.createdAt) }}
                </div>
              </template>
            </div>
            <NSpace v-if="editingId !== todo.id" size="small" class="ml-2 shrink-0">
              <NButton size="tiny" @click="handleDetail(todo)">详情</NButton>
              <NButton size="tiny" type="primary" @click="handleMoveToToday(todo)">移到今日</NButton>
              <NButton size="tiny" @click="startEdit(todo)">编辑</NButton>
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
        @refresh="todoStore.fetchYesterdayIncomplete()"
      />
    </n-modal>
  </div>
</template>
