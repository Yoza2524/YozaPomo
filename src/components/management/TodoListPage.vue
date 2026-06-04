<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import {
  NButton,
  NInput,
  NModal,
  NCard,
  NSpace,
  NSpin,
  NPopconfirm,
  NTag,
  NEmpty,
  NDataTable,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useTodoStore } from '@/stores/todoStore'
import type { Todo } from '@/types/todo'
import TodoDetail from './TodoDetail.vue'
import { formatTime } from '@/utils/format'

const todoStore = useTodoStore()
const message = useMessage()

const searchQuery = ref('')
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const editingTodo = ref<Todo | null>(null)
const detailTodo = ref<Todo | null>(null)
const newTitle = ref('')
const newNotes = ref('')
const createLoading = ref(false)

onMounted(async () => {
  await todoStore.fetchAllTodos()
})

// 过滤
const filteredTodos = computed(() => {
  let list = todoStore.allTodos
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)),
    )
  }
  return list
})

function handleCreate() {
  showCreateModal.value = true
  newTitle.value = ''
  newNotes.value = ''
}

async function handleCreateConfirm() {
  if (!newTitle.value.trim()) {
    message.warning('请输入 TODO 标题')
    return
  }
  createLoading.value = true
  await todoStore.createTodo(newTitle.value.trim(), newNotes.value.trim())
  await todoStore.fetchAllTodos()
  createLoading.value = false
  showCreateModal.value = false
}

function handleEdit(todo: Todo) {
  editingTodo.value = todo
  newTitle.value = todo.title
  newNotes.value = todo.notes
  showCreateModal.value = true
}

async function handleEditConfirm() {
  if (!editingTodo.value || !newTitle.value.trim()) return
  createLoading.value = true
  await todoStore.updateTodo(editingTodo.value.id, {
    title: newTitle.value.trim(),
    notes: newNotes.value.trim(),
  })
  await todoStore.fetchAllTodos()
  createLoading.value = false
  showCreateModal.value = false
  editingTodo.value = null
}

async function handleDelete(todo: Todo) {
  await todoStore.deleteTodo(todo.id)
  await todoStore.fetchAllTodos()
  message.success('已删除')
}

function handleViewDetail(todo: Todo) {
  detailTodo.value = todo
  showDetailModal.value = true
}

function handleDetailClose() {
  showDetailModal.value = false
  detailTodo.value = null
}

const columns: DataTableColumns<Todo> = [
  {
    title: '标题',
    key: 'title',
    sorter: 'default' as const,
    render(row) {
      return h('span', { class: row.completed ? 'line-through text-gray-400' : '' }, row.title)
    },
  },
  {
    title: '日期',
    key: 'date',
    width: 120,
    sorter: 'default' as const,
  },
  {
    title: '状态',
    key: 'completed',
    width: 80,
    render(row) {
      return row.completed
        ? h(NTag, { type: 'success', size: 'small' }, { default: () => '完成' })
        : h(NTag, { type: 'default', size: 'small' }, { default: () => '待办' })
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 100,
    render(row) {
      return formatTime(row.createdAt)
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render(row) {
      return h(
        NSpace,
        { size: 'small' },
        {
          default: () => [
            h(
              NButton,
              { size: 'tiny', onClick: () => handleViewDetail(row) },
              { default: () => '详情' },
            ),
            h(
              NButton,
              { size: 'tiny', onClick: () => handleEdit(row) },
              { default: () => '编辑' },
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row) },
              {
                trigger: () => h(NButton, { size: 'tiny', type: 'error' }, { default: () => '删除' }),
                default: () => '确定删除？',
              },
            ),
          ],
        },
      )
    },
  },
]
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <NInput
        v-model:value="searchQuery"
        placeholder="搜索 TODO..."
        clearable
        class="w-64"
      />
      <NButton type="primary" @click="handleCreate">+ 新建 TODO</NButton>
    </div>

    <NSpin :show="todoStore.loading">
      <NEmpty v-if="filteredTodos.length === 0 && !todoStore.loading" description="暂无 TODO" />
      <n-data-table
        v-else
        :columns="columns"
        :data="filteredTodos"
        :row-key="(row: Todo) => row.id"
        :pagination="{ pageSize: 20 }"
        size="small"
        bordered
      />
    </NSpin>

    <!-- 新建/编辑弹窗 -->
    <NModal v-model:show="showCreateModal" :title="editingTodo ? '编辑 TODO' : '新建 TODO'">
      <NCard class="w-[420px] max-w-[90vw]">
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-gray-700">标题</label>
            <NInput v-model:value="newTitle" placeholder="TODO 标题" class="mt-1" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700">备注 (Markdown)</label>
            <NInput
              v-model:value="newNotes"
              type="textarea"
              placeholder="可选备注..."
              :rows="3"
              class="mt-1"
            />
          </div>
          <div class="flex justify-end gap-2">
            <NButton @click="showCreateModal = false">取消</NButton>
            <NButton
              type="primary"
              :loading="createLoading"
              @click="editingTodo ? handleEditConfirm() : handleCreateConfirm()"
            >
              {{ editingTodo ? '保存' : '创建' }}
            </NButton>
          </div>
        </div>
      </NCard>
    </NModal>

    <!-- 详情弹窗 -->
    <NModal v-model:show="showDetailModal" title="TODO 详情">
      <TodoDetail
        v-if="detailTodo"
        :todo="detailTodo"
        @close="handleDetailClose"
        @refresh="todoStore.fetchAllTodos()"
      />
    </NModal>
  </div>
</template>

<script lang="ts">
import { computed } from 'vue'
</script>
