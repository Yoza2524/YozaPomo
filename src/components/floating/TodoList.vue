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
  /** 触发粉碎动画的 todo id（由 FloatingWindow 设置） */
  shatterTodoId?: string | null
}>()

const emit = defineEmits<{
  start: [todo: Todo]
  endFocus: []
  end: [todo: Todo]
  shatterDone: [todoId: string]
}>()

const focusStore = useFocusStore()

// ---- 省略号引用 & 粒子 ----
const ellipsisRef = ref<HTMLElement | null>(null)
const showEllipsisParticles = ref(false)

/** 动画期间冻结的 todo 快照（避免动画过程中 todos 更新导致错乱） */
const snapshotTodos = ref<Todo[] | null>(null)
const collapseFallbackTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const effectiveTodos = computed(() => snapshotTodos.value ?? props.todos)
const visibleTodos = computed(() => effectiveTodos.value.slice(0, props.maxDisplay))
const hiddenTodos = computed(() => effectiveTodos.value.slice(props.maxDisplay))
const hiddenCount = computed(() => hiddenTodos.value.length)
/** 隐藏区域的第一个 todo（用于 appearing 动画） */
const firstHiddenTodo = computed(() => hiddenTodos.value[0] ?? null)

// ---- 删除动画状态机 ----

/** 正在收起的 todo id（触发粒子 + height collapse） */
const collapsingTodoId = ref<string | null>(null)
/** 从省略号展开的 todo id（height 0→40） */
const appearingTodoId = ref<string | null>(null)
/** 是否是最后一个 tag（触发"暂无待办"同步出现） */
const isLastTagCollapsing = ref(false)
/** 省略号是否正在渐隐（删除最后一个隐藏项时） */
const ellipsisFadingOut = ref(false)

/** 独立完成标记（collapse 和 appear 同时播放，谁先完成谁设标记） */
const collapseCompleted = ref(false)
const appearCompleted = ref(false)

// 监听 shatterTodoId 变化 → 启动动画状态机
watch(() => props.shatterTodoId, (id) => {
  if (!id) return

  // 检查被删除的 todo 是否还在列表中（todoStore 可能已经刷新）
  const todoInList = props.todos.some(t => t.id === id)
  if (!todoInList) {
    // todo 已经不在列表中，跳过动画，直接通知完成
    emit('shatterDone', id)
    return
  }

  // 冻结当前 todos 快照（避免动画过程中 todos 更新导致错乱）
  snapshotTodos.value = [...props.todos]

  // 判断删除的是可见项还是隐藏项
  const isVisible = visibleTodos.value.some(t => t.id === id)

  if (isVisible) {
    // === 可见项删除：collapse + appear 同时播放 ===
    collapsingTodoId.value = id

    if (hiddenTodos.value.length > 0) {
      // 有隐藏项：同时从省略号中展开第一个隐藏 todo
      appearingTodoId.value = hiddenTodos.value[0].id
    }
  } else {
    // === 隐藏项删除：粒子 → 省略号渐隐 ===
    showEllipsisParticles.value = true
    ellipsisFadingOut.value = true

    // 阶段1：粒子动画 400ms（期间省略号文字保持可见）
    // 阶段2：省略号渐隐 400ms（CSS transition opacity 0.4s）
    // 总计 800ms 后清理状态
    collapseFallbackTimer.value = setTimeout(() => {
      emit('shatterDone', id)
      resetAnimState()
    }, 800)
    return
  }

  // 判断是否是最后一个 tag
  if (props.todos.length <= 1) {
    isLastTagCollapsing.value = true
  }

  // 兜底超时：如果动画事件未触发，500ms 后强制完成
  collapseFallbackTimer.value = setTimeout(() => {
    if (collapsingTodoId.value || appearingTodoId.value) {
      finalizeAnimation()
    }
  }, 500)
})

/** 收起动画完成（height → 0） */
function handleCollapseDone(_todoId: string) {
  if (!collapsingTodoId.value) return
  collapseCompleted.value = true
  checkBothDone()
}

/** 展开动画完成（height 0→40） */
function handleAppearDone(_todoId: string) {
  if (!appearingTodoId.value) return
  appearCompleted.value = true
  checkBothDone()
}

/** 两个动画都完成后通知父组件 */
function checkBothDone() {
  const hasCollapse = !!collapsingTodoId.value
  const hasAppear = !!appearingTodoId.value

  if (hasCollapse && hasAppear) {
    // 双动画：等两个都完成
    if (collapseCompleted.value && appearCompleted.value) {
      finalizeAnimation()
    }
  } else if (hasCollapse) {
    // 仅 collapse：直接完成
    finalizeAnimation()
  }
}

/** 最终完成：通知父组件 + 重置状态 */
function finalizeAnimation() {
  const doneId = appearingTodoId.value || collapsingTodoId.value
  if (doneId) {
    emit('shatterDone', doneId)
  }
  resetAnimState()
}

/** 重置动画状态 */
function resetAnimState() {
  if (collapseFallbackTimer.value) {
    clearTimeout(collapseFallbackTimer.value)
    collapseFallbackTimer.value = null
  }
  collapsingTodoId.value = null
  appearingTodoId.value = null
  isLastTagCollapsing.value = false
  ellipsisFadingOut.value = false
  showEllipsisParticles.value = false
  collapseCompleted.value = false
  appearCompleted.value = false
  snapshotTodos.value = null
}

// ---- 省略号动画（非删除场景：新建溢出） ----

const ellipsisVisible = computed(() => {
  // 渐隐期间保持可见（等待粒子播放完再消失）
  if (ellipsisFadingOut.value) return true
  // 动画期间，如果有隐藏项（基于快照）或正在展开，显示省略号
  if (snapshotTodos.value) {
    return hiddenCount.value > 0 || !!appearingTodoId.value
  }
  return hiddenCount.value > 0
})
const ellipsisAnimClass = ref('')

watch(hiddenCount, (newVal, oldVal) => {
  // 删除动画期间不触发这里的逻辑
  if (collapsingTodoId.value) return

  if (newVal > 0 && oldVal === 0) {
    ellipsisAnimClass.value = 'ellipsis-enter'
  } else if (newVal === 0 && oldVal > 0) {
    ellipsisAnimClass.value = 'ellipsis-leave'
    setTimeout(() => {
      ellipsisAnimClass.value = ''
    }, 350)
  } else if (newVal > 0) {
    ellipsisAnimClass.value = ''
  }
})

// ---- 新建溢出动画 ----

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
      <!-- TODO 列表 + 空状态（justify-end 让内容从底部向上生长，省略号锚定不动） -->
      <div class="relative h-full flex flex-col justify-end">
        <!-- "暂无待办"：无 TODO 或最后一个正在收起时同步显示 -->
        <Transition :name="isLastTagCollapsing ? 'fade-sync' : 'fade'">
          <div
            v-if="visibleTodos.length === 0 || isLastTagCollapsing"
            key="empty"
            class="flex items-center justify-center empty-placeholder"
            @dblclick="openManagement"
          >
            <div class="text-center">
              <p class="text-sm" style="color: rgba(0, 0, 0, 0.35);">暂无待办</p>
              <p class="text-xs mt-1" style="color: rgba(0, 0, 0, 0.25);">双击添加 TODO</p>
            </div>
          </div>
        </Transition>

        <!-- 可见 TODO 列表 -->
        <TodoTag
          v-for="todo in visibleTodos"
          :key="todo.id"
          :todo="todo"
          :is-active="focusStore.activeTodoId === todo.id && focusStore.isTimerActive"
          :is-other-active="focusStore.hasActiveTodo && focusStore.activeTodoId !== todo.id"
          :is-new="todo.id === newTodoId"
          :is-overflow="todo.id === newTodoId && todos.length > maxDisplay"
          :shatter="todo.id === shatterTodoId"
          :collapsing="todo.id === collapsingTodoId"
          @start="emit('start', $event)"
          @end-focus="emit('endFocus')"
          @end="emit('end', $event)"
          @collapse-done="handleCollapseDone"
        />

        <!-- 从省略号展开的 todo（appearing 动画） -->
        <TodoTag
          v-if="appearingTodoId && firstHiddenTodo"
          :key="'appearing-' + appearingTodoId"
          :todo="firstHiddenTodo"
          :is-active="false"
          :is-other-active="false"
          :appearing="true"
          @appear-done="handleAppearDone"
        />

        <!-- 溢出动画：新建 TODO 达上限时，Tag 向下融入省略号 -->
        <OverflowAnim
          v-if="showOverflowAnim"
          :ellipsis-exists="hiddenCount > 1"
          @done="showOverflowAnim = false"
        />

        <!-- 超出上限时显示省略号（删除最后一个隐藏项时渐隐） -->
        <div
          v-if="ellipsisVisible"
          ref="ellipsisRef"
          class="text-center ellipsis-container"
          :class="[ellipsisAnimClass, { 'ellipsis-fading': ellipsisFadingOut }]"
        >
          <span class="ellipsis-text">...</span>
        </div>

        <!-- 省略号位置粒子（删除隐藏项时） -->
        <Teleport to="body">
          <div
            v-if="showEllipsisParticles && ellipsisRef"
            class="ellipsis-particles"
            :style="{
              left: (ellipsisRef.getBoundingClientRect().left + ellipsisRef.getBoundingClientRect().width / 2) + 'px',
              top: (ellipsisRef.getBoundingClientRect().top + ellipsisRef.getBoundingClientRect().height / 2) + 'px',
            }"
            @animationend="showEllipsisParticles = false"
          >
            <div v-for="i in 9" :key="i" class="ellipsis-particle" :style="{ '--i': i }" />
          </div>
        </Teleport>
      </div>
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

/* 最后一个 tag 删除时，"暂无待办"与 tag 收起同步淡入 */
.fade-sync-enter-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-sync-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-sync-enter-from,
.fade-sync-leave-to {
  opacity: 0;
}

/* "暂无待办"容器：固定一个 Tag 高度 */
.empty-placeholder {
  height: 40px;
  margin-bottom: 8px;
}

/* 省略号容器 */
.ellipsis-container {
  margin-top: 2px;
  padding: 2px 0;
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              margin 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 省略号淡出（删除动画期间，与 tag 收起同步渐变） */
.ellipsis-fading {
  opacity: 0;
  margin-top: 0;
  padding: 0;
}

/* 省略号出现动画 - 从上方滑入 */
.ellipsis-enter {
  animation: ellipsisIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 省略号消失动画（非删除场景） */
.ellipsis-leave {
  animation: ellipsisOut 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  overflow: hidden;
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
    height: 18px;
    margin-top: 2px;
    padding: 2px 0;
  }
  100% {
    opacity: 0;
    height: 0;
    margin-top: 0;
    padding: 0;
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

/* 省略号位置粒子（删除隐藏项时） */
.ellipsis-particles {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  animation: ellipsisParticleContainer 0.4s ease-out forwards;
}

.ellipsis-particle {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  animation: ellipsisParticleBurst 0.4s ease-out forwards;
  /* 9 个粒子均匀分布，半径 12px */
  --angle: calc(var(--i) * 40deg);
  --radius: 12px;
  left: calc(cos(var(--angle)) * var(--radius) - 1.5px);
  top: calc(sin(var(--angle)) * var(--radius) - 1.5px);
}

@keyframes ellipsisParticleContainer {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes ellipsisParticleBurst {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translate(calc(cos(var(--angle)) * 6px), calc(sin(var(--angle)) * 6px + 8px)) scale(0.3);
    opacity: 0;
  }
}
</style>
