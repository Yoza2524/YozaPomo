<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 粒子动画 Canvas 组件
 * 可复用的粒子爆发动画，支持自定义粒子数量、颜色、大小和时长
 */

export interface ParticleConfig {
  /** 粒子数量 */
  count?: number
  /** 粒子颜色列表 */
  colors?: string[]
  /** 粒子最小半径 */
  minRadius?: number
  /** 粒子最大半径 */
  maxRadius?: number
  /** 动画持续时间 (ms) */
  duration?: number
  /** 爆发速度系数 */
  speed?: number
  /** 是否从中心爆发 (false = 从顶部中心) */
  fromCenter?: boolean
}

const props = withDefaults(defineProps<ParticleConfig>(), {
  count: 40,
  colors: () => ['#6366f1', '#818cf8', '#22c55e', '#4f46e5'],
  minRadius: 2,
  maxRadius: 6,
  duration: 2500,
  speed: 1,
  fromCenter: true,
})

const emit = defineEmits<{
  done: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null
let startTime = 0

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
  decay: number
}

let particles: Particle[] = []

function createParticles(width: number, height: number) {
  const originX = width / 2
  const originY = height * 2 / 9

  particles = Array.from({ length: props.count! }, () => {
    const angle = Math.random() * Math.PI * 2
    const force = (0.5 + Math.random() * 1.5) * props.speed!
    return {
      x: originX + (Math.random() - 0.5) * 20,
      y: originY + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force - 1.5, // 轻微向上
      radius: props.minRadius! + Math.random() * (props.maxRadius! - props.minRadius!),
      color: props.colors![Math.floor(Math.random() * props.colors!.length)],
      alpha: 1,
      decay: 0.008 + Math.random() * 0.012,
    }
  })
}

function animate(timestamp: number) {
  if (!startTime) startTime = timestamp
  const elapsed = timestamp - startTime
  const progress = Math.min(elapsed / props.duration!, 1)

  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 使用 ease-out 缓动
  const easeOut = 1 - Math.pow(1 - progress, 3)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let allDone = true
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.012 // 重力（更慢下落）
    p.alpha = Math.max(0, 1 - progress * 0.8)

    if (p.alpha > 0.01) {
      allDone = false
      ctx.save()
      ctx.globalAlpha = p.alpha * (1 - easeOut * 0.3)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = p.radius * 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  if (progress < 1 && !allDone) {
    animFrameId = requestAnimationFrame(animate)
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    emit('done')
  }
}

function start() {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return

  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight

  startTime = 0
  createParticles(canvas.width, canvas.height)
  animFrameId = requestAnimationFrame(animate)
}

function stop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  particles = []
}

defineExpose({ start, stop })

onMounted(() => {
  start()
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="particle-canvas absolute inset-0 pointer-events-none"
  />
</template>
