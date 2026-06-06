<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Todo } from '@/types/todo'
import TodoContextMenu from './TodoContextMenu.vue'

const props = defineProps<{
  todo: Todo
  isActive: boolean
  /** 有另一个 TODO 在专注中 */
  isOtherActive: boolean
  /** 是否是新创建的 TODO */
  isNew?: boolean
  /** 新建时列表已满（溢出），动画不占据高度 */
  isOverflow?: boolean
}>()

const emit = defineEmits<{
  start: [todo: Todo]
  endFocus: []
  end: [todo: Todo]
}>()

const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const tagClass = computed(() => {
  if (props.isActive) return 'todo-active'
  return 'todo-default'
})

function handleDoubleClick() {
  if (props.isOtherActive) return // 其他 TODO 在专注中
  if (!props.isActive) {
    // 未激活 → 开始专注
    emit('start', props.todo)
  } else {
    // 已激活（专注中或暂停）→ 结束专注
    emit('endFocus')
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
    :class="[tagClass, 'todo-tag rounded-xl px-3 py-2 mb-2 transition-all duration-300 select-none', { 'overflow-hidden': !isActive, 'todo-new': isNew && !isOverflow, 'todo-new-overflow': isNew && isOverflow }]"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium truncate flex-1 mr-2" :class="{
        'text-gray-800': !isActive,
        'text-green-700': isActive,
      }">
        {{ todo.title }}
      </span>
    </div>

    <!-- 右键菜单（通过 Teleport 渲染到 body） -->
    <Teleport to="body">
      <TodoContextMenu
        v-if="showMenu"
        :x="menuX"
        :y="menuY"
        :is-active="isActive"
        @start="emit('start', todo); showMenu = false"
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
  border: 2px solid rgba(229, 231, 235, 0.5);
}
.todo-default:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* 激活/专注中 — 增强呼吸灯 */
.todo-active {
  background: rgba(255, 255, 255, 0.95);
  background-clip: padding-box;
  border: 2px solid transparent;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
  animation: breathe 3s ease-in-out infinite;
}

/* 其他 TODO 在专注中 — 不可交互 */
.todo-blocked {
  opacity: 0.5;
  pointer-events: none;
}

/* 新创建的 TODO 动画 - 从上往下展开，推动下方按钮和边框 */
.todo-new {
  animation: todoExpand 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

@keyframes todoExpand {
  0% {
    opacity: 0;
    height: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  100% {
    opacity: 1;
    height: 40px;
    margin-bottom: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
}

/* 列表已满时新建 - 用 transform 动画，不占据高度，不推动下方内容 */
.todo-new-overflow {
  animation: todoFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes todoFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 更自然的呼吸动画 - 对称式节奏 + 平滑过渡 */
@keyframes breathe {
  0% {
    border-color: #a1cab0;
    box-shadow: 0 0 0px rgba(34, 197, 94, 0.2), 0 0 0 0 rgba(34, 197, 94, 0);
  }
  50% {
    border-color: #22c55e;
    box-shadow: 0 0 0px rgba(34, 197, 94, 0.6), 0 0 0 2px rgba(34, 197, 94, 0.2);
  }
  100% {
    border-color: #a1cab0;
    box-shadow: 0 0 0px rgba(34, 197, 94, 0.2), 0 0 0 0 rgba(34, 197, 94, 0);
  }
}
</style>
