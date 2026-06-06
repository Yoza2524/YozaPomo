<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Todo } from '@/types/todo'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { UnlistenFn } from '@tauri-apps/api/event'
import TodoContextMenu from './TodoContextMenu.vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  opacity: number
}

const props = defineProps<{
  todo: Todo
  isActive: boolean
  /** 有另一个 TODO 在专注中 */
  isOtherActive: boolean
  /** 是否是新创建的 TODO */
  isNew?: boolean
  /** 新建时列表已满（溢出），动画不占据高度 */
  isOverflow?: boolean
  /** 触发粉碎动画（粒子 + 收起） */
  shatter?: boolean
  /** 正在收起动画中 */
  collapsing?: boolean
  /** 正在展开动画中（从省略号出现） */
  appearing?: boolean
}>()

const emit = defineEmits<{
  start: [todo: Todo]
  endFocus: []
  end: [todo: Todo]
  collapseDone: [todoId: string]
  appearDone: [todoId: string]
}>()

const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)

// 粉碎动画状态
const isShattering = ref(false)
const tagRef = ref<HTMLElement | null>(null)
const particles = ref<Particle[]>([])
let animFrame = 0

// 窗口失焦时关闭右键菜单
let unlistenFocusChanged: UnlistenFn | null = null
onMounted(async () => {
  unlistenFocusChanged = await getCurrentWindow().onFocusChanged(({ payload }) => {
    if (!payload) showMenu.value = false
  })
})
onUnmounted(() => {
  unlistenFocusChanged?.()
  if (animFrame) cancelAnimationFrame(animFrame)
})

const tagClass = computed(() => {
  if (props.isActive) return 'todo-active'
  return 'todo-default'
})

function handleDoubleClick() {
  if (isShattering.value) return
  if (props.isOtherActive) return
  if (!props.isActive) {
    emit('start', props.todo)
  } else {
    emit('endFocus')
  }
}

function handleContextMenu(e: MouseEvent) {
  if (isShattering.value) return
  e.preventDefault()
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

function handleEnd() {
  if (isShattering.value) return
  emit('end', props.todo)
}

// 外部触发粉碎动画（备注确认后）
watch(() => props.shatter, (val) => {
  if (val) startShatter()
})

/** 粉碎动画：粒子飞散（收起由 collapsing CSS class 驱动） */
function startShatter() {
  showMenu.value = false
  isShattering.value = true

  const tag = tagRef.value
  if (!tag) return

  // 碎片参数
  const count = 18
  const gravity = 1200
  const spread = 250
  const duration = 400
  const colors = [
    'rgba(255,255,255,0.9)',
    'rgba(229,231,235,0.8)',
    'rgba(209,213,219,0.7)',
    'rgba(156,163,175,0.6)',
  ]

  // 以 Tag 位置为基准生成碎片
  const rect = tag.getBoundingClientRect()
  const startX = rect.left + rect.width / 2
  const startY = rect.top + rect.height / 2

  particles.value = Array.from({ length: count }, () => ({
    x: startX,
    y: startY,
    vx: (Math.random() - 0.5) * spread * 2,
    vy: -Math.random() * spread * 0.5,
    size: 3 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 900,
    opacity: 1,
  }))

  const start = performance.now()

  function update(now: number) {
    const elapsed = now - start
    const dt = 1 / 60

    particles.value.forEach(p => {
      p.vy += gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.rotationSpeed * dt
      p.opacity = Math.max(0, 1 - elapsed / duration)
    })

    if (elapsed < duration) {
      animFrame = requestAnimationFrame(update)
    } else {
      particles.value = []
      animFrame = 0
      // 粒子完成，不做任何 emit —— 收起动画由 CSS transition 驱动
      // collapseDone 在 onTransitionEnd 中触发
    }
  }

  animFrame = requestAnimationFrame(update)
}

/** 过渡/动画结束 → 通知父组件 */
function onTransitionEnd(e: TransitionEvent) {
  // 只处理 height 变化，避免重复触发
  if (e.propertyName !== 'height') return
  if (props.collapsing) {
    emit('collapseDone', props.todo.id)
  }
}

function onAnimationEnd(_e: AnimationEvent) {
  if (props.appearing) {
    emit('appearDone', props.todo.id)
  }
}

defineExpose({ startShatter, isShattering })
</script>

<template>
  <div
    ref="tagRef"
    :class="[
      tagClass,
      'todo-tag rounded-xl px-3 py-2 mb-2 select-none',
      {
        'overflow-hidden': !isActive && !isShattering && !collapsing && !appearing,
        'todo-new': isNew && !isOverflow,
        'todo-new-overflow': isNew && isOverflow,
        'todo-shattering': isShattering,
        'todo-collapsing': collapsing,
        'todo-appearing': appearing,
      },
    ]"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
    @transitionend="onTransitionEnd"
    @animationend="onAnimationEnd"
  >
    <div class="flex items-center justify-between">
      <span
        class="text-sm font-medium truncate flex-1 mr-2"
        :class="{
          'text-gray-800': !isActive,
          'text-green-700': isActive,
        }"
      >
        {{ todo.title }}
      </span>
    </div>

    <!-- 粉碎粒子（Teleport 到 body，不受 overflow 裁剪） -->
    <Teleport to="body">
      <div
        v-for="(p, i) in particles"
        :key="i"
        class="fixed pointer-events-none z-50"
        :style="{
          left: p.x + 'px',
          top: p.y + 'px',
          width: p.size + 'px',
          height: p.size + 'px',
          background: p.color,
          borderRadius: '1px',
          opacity: p.opacity,
          transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
        }"
      />
    </Teleport>

    <!-- 右键菜单（通过 Teleport 渲染到 body） -->
    <Teleport to="body">
      <TodoContextMenu
        v-if="showMenu"
        :x="menuX"
        :y="menuY"
        :is-active="isActive"
        @start="emit('start', todo); showMenu = false"
        @end-focus="emit('endFocus'); showMenu = false"
        @end="showMenu = false; handleEnd()"
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

/* 粉碎动画：粒子飞散阶段，仅禁用交互 */
.todo-shattering {
  pointer-events: none;
}

/* 收起动画：高度从 40px → 0，同步淡出 */
.todo-collapsing {
  pointer-events: none;
  height: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  opacity: 0 !important;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 展开动画：从省略号位置放大出现，高度从 0 → 40px */
.todo-appearing {
  height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  overflow: hidden;
  animation: todoAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes todoAppear {
  0% {
    height: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
    transform: translateY(8px) scale(0.4);
  }
  60% {
    opacity: 1;
    transform: translateY(-2px) scale(1.05);
  }
  100% {
    height: 40px;
    margin-bottom: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
