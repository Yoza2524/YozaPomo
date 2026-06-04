<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NButton, NSpin, NDivider, NTag, NEmpty } from 'naive-ui'
import type { Todo } from '@/types/todo'
import type { FocusSession } from '@/types/focus'
import { db } from '@/utils/database'
import { formatTime, formatDuration } from '@/utils/format'
import { marked } from 'marked'

const props = defineProps<{
  todo: Todo
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()

const sessions = ref<FocusSession[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    sessions.value = (await db.getTodoFocusSessions(props.todo.id)) as FocusSession[]
  } catch {
    sessions.value = []
  } finally {
    loading.value = false
  }
})

const totalFocusTime = computed(() => {
  return sessions.value.reduce((sum, s) => sum + (s.actualDuration || 0), 0)
})

const focusCount = computed(() => sessions.value.length)

function renderMarkdown(text: string | undefined | null): string {
  if (!text) return '<p class="text-gray-400 text-sm">暂无备注</p>'
  try {
    return marked.parse(text) as string
  } catch {
    return text.replace(/\n/g, '<br>')
  }
}

function sessionDuration(s: FocusSession): string {
  if (s.actualDuration) return formatDuration(s.actualDuration)
  if (s.plannedDuration) return `计划 ${formatDuration(s.plannedDuration)}`
  return '—'
}

const statusLabels: Record<string, string> = {
  completed: '完成',
  abnormal: '异常',
  active: '进行中',
}
const statusTypes: Record<string, 'success' | 'error' | 'default' | 'warning'> = {
  completed: 'success',
  abnormal: 'error',
  active: 'warning',
}
</script>

<template>
  <div class="w-[640px] max-w-[85vw] max-h-[70vh] overflow-auto p-4">
    <!-- TODO 基本信息 -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-800">{{ todo.title }}</h3>
      <div class="flex items-center gap-2 mt-1">
        <span class="text-sm text-gray-500">日期：{{ todo.date }}</span>
        <NTag v-if="todo.completed" type="success" size="small">已完成</NTag>
        <NTag v-else type="default" size="small">待办</NTag>
      </div>
      <div class="flex gap-4 mt-2 text-sm text-gray-500">
        <span>专注次数：{{ focusCount }}</span>
        <span>总时长：{{ formatDuration(totalFocusTime) }}</span>
      </div>
    </div>

    <NDivider />

    <!-- TODO 备注 -->
    <div class="mb-4">
      <h4 class="text-sm font-semibold text-gray-700 mb-2">TODO 备注</h4>
      <div class="prose prose-sm max-w-none" v-html="renderMarkdown(todo.notes)" />
    </div>

    <NDivider />

    <!-- 关联的专注会话 -->
    <div>
      <h4 class="text-sm font-semibold text-gray-700 mb-2">专注历史（{{ focusCount }} 次）</h4>
      <NSpin :show="loading">
        <NEmpty
          v-if="!loading && sessions.length === 0"
          description="暂无专注记录"
          size="small"
        />
        <div v-else class="space-y-2">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="bg-gray-50 rounded-lg p-3 text-sm"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-gray-600">
                  {{ s.startTime ? formatTime(s.startTime) : '—' }}
                  ~
                  {{ s.endTime ? formatTime(s.endTime) : '进行中' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-500">{{ sessionDuration(s) }}</span>
                <NTag
                  :type="statusTypes[s.status] || 'default'"
                  size="small"
                >
                  {{ statusLabels[s.status] || s.status }}
                </NTag>
              </div>
            </div>
            <!-- 专注备注 -->
            <div
              v-if="s.notes"
              class="mt-1 text-xs text-gray-500"
              v-html="renderMarkdown(s.notes)"
            />
          </div>
        </div>
      </NSpin>
    </div>

    <div class="flex justify-end mt-4">
      <NButton @click="emit('close')">关闭</NButton>
    </div>
  </div>
</template>
