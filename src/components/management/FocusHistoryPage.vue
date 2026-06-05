<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NInput, NModal, NCard, NSpace, NSpin, NTag, NEmpty, NSelect, useMessage } from 'naive-ui'
import { useFocusStore } from '@/stores/focusStore'
import { useTodoStore } from '@/stores/todoStore'
import { db } from '@/utils/database'
import type { FocusSession } from '@/types/focus'
import { formatTime, formatDuration } from '@/utils/format'

const focusStore = useFocusStore()
const todoStore = useTodoStore()
const message = useMessage()

const showEditModal = ref(false)
const editingSession = ref<FocusSession | null>(null)
const editStartTime = ref('')
const editEndTime = ref('')
const editNotes = ref('')
const editTodoId = ref('')
const editLoading = ref(false)

onMounted(async () => {
  await Promise.all([
    focusStore.fetchRecentSessions(100),
    focusStore.fetchTodayStats(),
    todoStore.fetchAllTodos(),
  ])
})

// 按日期分组
const groupedSessions = computed(() => {
  const groups: Record<string, FocusSession[]> = {}
  for (const s of focusStore.recentSessions) {
    const date = s.startTime?.split('T')[0] ?? s.startTime?.split(' ')[0] ?? '未知'
    if (!groups[date]) groups[date] = []
    groups[date].push(s)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
})

function getTodoTitle(todoId: string | null): string {
  if (!todoId) return '—'
  const todo = todoStore.allTodos.find((t) => t.id === todoId)
  return todo?.title ?? '(已删除)'
}

function startEdit(session: FocusSession) {
  editingSession.value = session
  editStartTime.value = session.startTime
    ? new Date(session.startTime).toISOString().slice(0, 16)
    : ''
  editEndTime.value = session.endTime
    ? new Date(session.endTime).toISOString().slice(0, 16)
    : ''
  editNotes.value = session.notes || ''
  editTodoId.value = session.todoId || ''
  showEditModal.value = true
}

async function handleEditConfirm() {
  if (!editingSession.value) return
  editLoading.value = true
  try {
    const startTime = editStartTime.value
      ? new Date(editStartTime.value).toISOString()
      : undefined
    const endTime = editEndTime.value
      ? new Date(editEndTime.value).toISOString()
      : undefined

    // 计算实际时长
    let actualDuration: number | undefined
    if (startTime && endTime) {
      actualDuration = Math.round(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000,
      )
    }

    await db.updateFocusSession(editingSession.value.id, {
      startTime,
      endTime,
      actualDuration,
      notes: editNotes.value.trim(),
      todoId: editTodoId.value || null,
    })

    await focusStore.fetchRecentSessions(100)
    message.success('已更新')
    showEditModal.value = false
  } catch (e) {
    message.error(`更新失败: ${e}`)
  } finally {
    editLoading.value = false
  }
}

async function handleDelete(session: FocusSession) {
  try {
    await db.deleteFocusSession(session.id)
    await focusStore.fetchRecentSessions(100)
    message.success('已删除')
  } catch (e) {
    message.error(`删除失败: ${e}`)
  }
}

const statusMap: Record<string, { label: string; type: 'success' | 'error' | 'warning' | 'default' }> = {
  completed: { label: '完成', type: 'success' },
  abnormal: { label: '异常', type: 'error' },
  focusing: { label: '专注中', type: 'warning' },
  active: { label: '进行中', type: 'warning' },
}
</script>

<template>
  <div class="p-4">
    <!-- 今日统计 -->
    <div class="flex gap-4 mb-4">
      <div class="bg-white rounded-lg border border-gray-100 px-4 py-3 flex-1">
        <div class="text-2xl font-bold text-indigo-500">
          {{ focusStore.todayMinutes }}
        </div>
        <div class="text-xs text-gray-500">今日专注（分钟）</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-100 px-4 py-3 flex-1">
        <div class="text-2xl font-bold text-indigo-500">
          {{ focusStore.todaySessionCount }}
        </div>
        <div class="text-xs text-gray-500">今日专注次数</div>
      </div>
    </div>

    <!-- 专注列表 -->
    <NSpin :show="focusStore.loading">
      <NEmpty
        v-if="groupedSessions.length === 0 && !focusStore.loading"
        description="暂无专注记录"
      />
      <div v-else class="space-y-4">
        <div v-for="[date, sessions] in groupedSessions" :key="date">
          <h3 class="text-sm font-semibold text-gray-600 mb-2">{{ date }}</h3>
          <div class="space-y-1.5">
            <div
              v-for="s in sessions"
              :key="s.id"
              class="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-700">
                    {{ s.startTime ? formatTime(s.startTime) : '—' }}
                    ~
                    {{ s.endTime ? formatTime(s.endTime) : '—' }}
                  </span>
                  <span class="text-sm text-gray-500">
                    {{ s.actualDuration ? formatDuration(s.actualDuration) : '未完成' }}
                  </span>
                  <NTag
                    :type="(statusMap[s.status]?.type || 'default')"
                    size="small"
                  >
                    {{ statusMap[s.status]?.label || s.status }}
                  </NTag>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400">
                    {{ getTodoTitle(s.todoId) }}
                  </span>
                  <NSpace size="small">
                    <NButton size="tiny" @click="startEdit(s)">编辑</NButton>
                    <NButton size="tiny" type="error" @click="handleDelete(s)">删除</NButton>
                  </NSpace>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NSpin>

    <!-- 编辑弹窗 -->
    <NModal v-model:show="showEditModal" title="编辑专注记录">
      <NCard class="w-[420px] max-w-[90vw]">
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-gray-700">开始时间</label>
            <input
              v-model="editStartTime"
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-300 transition-colors"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700">结束时间</label>
            <input
              v-model="editEndTime"
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-300 transition-colors"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700">关联 TODO</label>
            <NSelect
              v-model:value="editTodoId"
              :options="[
                { label: '无', value: '' },
                ...todoStore.allTodos.map((t) => ({
                  label: t.title,
                  value: t.id,
                })),
              ]"
              placeholder="选择关联 TODO"
              clearable
              class="mt-1"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700">备注 (Markdown)</label>
            <NInput
              v-model:value="editNotes"
              type="textarea"
              placeholder="专注备注..."
              :rows="3"
              class="mt-1"
            />
          </div>
          <div class="flex justify-end gap-2">
            <NButton @click="showEditModal = false">取消</NButton>
            <NButton type="primary" :loading="editLoading" @click="handleEditConfirm">
              保存
            </NButton>
          </div>
        </div>
      </NCard>
    </NModal>
  </div>
</template>
