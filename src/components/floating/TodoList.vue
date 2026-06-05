<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Todo } from '@/types/todo'
import { useFocusStore } from '@/stores/focusStore'
import { emitTo } from '@tauri-apps/api/event'
import TodoTag from './TodoTag.vue'
import OverflowAnim from './OverflowAnim.vue'

const props = defineProps<{
  todos: Todo[]
  maxDisplay: number
  loading: boolean
  newTodoId?: string | null
}>()

const emit = defineEmits<{
  start: [todo: Todo]
  endFocus: []
  end: [todo: Todo]
}>()

const focusStore = useFocusStore()

const visibleTodos = computed(() => props.todos.slice(0, props.maxDisplay))
const hiddenCount = computed(() => Math.max(0, props.todos.length - props.maxDisplay))

/** 新建的 TODO 是否在隐藏区域（溢出） */
const isNewOverflow = computed(() => {
  if (!props.newTodoId) return false
  const idx = props.todos.findIndex(t => t.id === props.newTodoId)
  return idx >= props.maxDisplay
})

const showOverflowAnim = ref(false)
let lastAnimTodoId: string | null = null

watch(() => [props.newTodoId, props.todos], () => {
  if (props.newTodoId && isNewOverflow.value && lastAnimTodoId !== props.newTodoId) {
    lastAnimTodoId = props.newTodoId
    showOverflowAnim.value = true
  }
}, { deep: true })

// 省略号动画状态
const ellipsisVisible = ref(false)
const ellipsisAnimClass = ref('')

watch(hiddenCount, (newVal, oldVal) => {
  if (newVal > 0 && oldVal === 0) {
    // 首次出现：缓慢撑开
    ellipsisVisible.value = true
    ellipsisAnimClass.value = 'ellipsis-enter'
  } else if (newVal === 0 && oldVal > 0) {
    // 消失：缓慢收起
    ellipsisAnimClass.value = 'ellipsis-leave'
    setTimeout(() => {
      ellipsisVisible.value = false
      ellipsisAnimClass.value = ''
    }, 350)
  } else if (newVal > 0) {
    // 数量变化但省略号仍在：无动画
    ellipsisAnimClass.value = ''
  }
})

/** 双击打开管理界面并导航到今日 TODO */
async function openManagement() {
  await emitTo('management', 'navigate', 'today')
}
</script>

<template>
  <div class="todo-list h-full overflow-hidden">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <span class="text-xs text-gray-400">加载中...</span>
    </div>

    <template v-else>
      <!-- 无 TODO -->
      <Transition name="fade" mode="out-in">
        <div
          v-if="todos.length === 0"
          key="empty"
          class="flex items-center justify-center h-full"
          @dblclick="openManagement"
        >
          <div class="text-center">
            <p class="text-sm" style="color: rgba(0, 0, 0, 0.35);">暂无待办</p>
            <p class="text-xs mt-1" style="color: rgba(0, 0, 0, 0.25);">双击添加 TODO</p>
          </div>
        </div>

        <!-- TODO 列表 -->
        <div v-else key="list" class="relative">
          <TodoTag
            v-for="todo in visibleTodos"
            :key="todo.id"
            :todo="todo"
            :is-active="focusStore.activeTodoId === todo.id && focusStore.isTimerActive"
            :is-other-active="focusStore.hasActiveTodo && focusStore.activeTodoId !== todo.id"
            :is-new="todo.id === newTodoId"
            :is-overflow="todo.id === newTodoId && todos.length > maxDisplay"
            @start="emit('start', $event)"
            @end-focus="emit('endFocus')"
            @end="emit('end', $event)"
          />

          <!-- 溢出动画：新建 TODO 达上限时，Tag 向下融入省略号 -->
          <OverflowAnim
            v-if="showOverflowAnim"
            :ellipsis-exists="hiddenCount > 1"
            @done="showOverflowAnim = false"
          />

          <!-- 超出上限时显示省略号 -->
          <div v-if="ellipsisVisible" class="text-center ellipsis-container" :class="ellipsisAnimClass">
            <span class="ellipsis-text">...</span>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* 空状态 ↔ 列表 切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 省略号容器 */
.ellipsis-container {
  margin-top: 2px;
  padding: 2px 0;
}

/* 省略号出现动画 - 从上方滑入，不改变高度 */
.ellipsis-enter {
  animation: ellipsisIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 省略号消失动画 - 向上滑出，不改变高度 */
.ellipsis-leave {
  animation: ellipsisOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes ellipsisIn {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ellipsisOut {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.ellipsis-text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(0, 0, 0, 0.35);
  line-height: 1;
  -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.2);
}
</style>
