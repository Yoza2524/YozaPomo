<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Todo } from '@/types/todo'
import TodoContextMenu from './TodoContextMenu.vue'

const props = defineProps<{
  todo: Todo
  isActive: boolean
  isPaused: boolean
  /** 有另一个 TODO 在专注中 */
  isOtherActive: boolean
}>()

const emit = defineEmits<{
  start: [todo: Todo]
  pause: []
  resume: []
  end: [todo: Todo]
}>()

const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const tagClass = computed(() => {
  if (props.isActive && !props.isPaused) return 'todo-active'
  if (props.isPaused) return 'todo-paused'
  return 'todo-default'
})

function handleDoubleClick() {
  if (props.isOtherActive) return // 其他 TODO 在专注中
  if (props.isActive && !props.isPaused) {
    // 双击已激活 TODO → 暂停
    emit('pause')
  } else if (props.isPaused) {
    // 暂停中 → 恢复
    emit('resume')
  } else if (!props.isActive) {
    // 未激活 → 开始专注
    emit('start', props.todo)
  }
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

function handleEnd() {
  emit('end', props.todo)
}
</script>

<template>
  <div
    :class="[tagClass, 'todo-tag rounded-xl px-3 py-2 mb-2 transition-all duration-300 select-none']"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium truncate flex-1 mr-2" :class="{
        'text-gray-800': !isActive,
        'text-green-700': isActive && !isPaused,
        'text-amber-600': isPaused,
      }">
        {{ todo.title }}
      </span>
      <!-- 更多操作入口 -->
      <span
        class="text-xs shrink-0 cursor-pointer px-1 hover:text-gray-600"
        :class="{
          'text-gray-400': !isActive,
          'text-green-500': isActive && !isPaused,
          'text-amber-500': isPaused,
        }"
        @click.prevent.stop="handleContextMenu($event as unknown as MouseEvent)"
      >···</span>
    </div>

    <!-- 右键菜单（通过 Teleport 渲染到 body） -->
    <Teleport to="body">
      <TodoContextMenu
        v-if="showMenu"
        :x="menuX"
        :y="menuY"
        :is-active="isActive"
        :is-paused="isPaused"
        @start="emit('start', todo); showMenu = false"
        @pause="emit('pause'); showMenu = false"
        @resume="emit('resume'); showMenu = false"
        @end="handleEnd(); showMenu = false"
        @close="showMenu = false"
      />
    </Teleport>
  </div>
</template>

<style scoped>
/* 默认状态 */
.todo-default {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(229, 231, 235, 0.5);
}
.todo-default:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* 激活/专注中 — 呼吸灯 */
.todo-active {
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.25);
  animation: breathe 2s ease-in-out infinite;
}

/* 暂停状态 */
.todo-paused {
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.2);
}

/* 其他 TODO 在专注中 — 不可交互 */
.todo-blocked {
  opacity: 0.5;
  pointer-events: none;
}

.todo-tag {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes breathe {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
}
</style>
