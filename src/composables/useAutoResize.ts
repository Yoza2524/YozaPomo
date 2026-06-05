import { onMounted, onUnmounted, type Ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/window'
import { logWithSource } from '@/utils/logger'

/**
 * 使悬浮窗大小适应内容
 *
 * 原理：
 * 1. 监测内容容器的大小变化
 * 2. 动态调整窗口大小，只覆盖有内容的区域
 * 3. 透明区域不存在，点击自然穿透到下方窗口
 */
export function useAutoResize(containerRef: Ref<HTMLElement | null>) {
  let resizeObserver: ResizeObserver | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let animationFrame: number | null = null
  let isAnimating = false

  // 动画期间主动驱动 resize（fire-and-forget，不等待 API 返回）
  // 只调整高度，不改变位置
  function resizeImmediate() {
    const el = containerRef.value
    if (!el) return
    const win = getCurrentWebviewWindow()
    const rect = el.getBoundingClientRect()
    const contentHeight = Math.ceil(rect.height)
    const contentWidth = Math.max(Math.ceil(rect.width), 280)
    const finalHeight = Math.max(contentHeight, 120)
    // fire-and-forget，只改大小不改位置
    win.setSize(new LogicalSize(contentWidth, finalHeight)).catch(() => {})
  }

  function onAnimStart() {
    isAnimating = true
    function frame() {
      resizeImmediate()
      if (isAnimating) animationFrame = requestAnimationFrame(frame)
    }
    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = requestAnimationFrame(frame)
  }

  function onAnimEnd() {
    isAnimating = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    updateWindowSize()
  }

  async function updateWindowSize() {
    const el = containerRef.value
    if (!el) {
      logWithSource('warn', 'useAutoResize[floating]', '容器元素不存在，跳过调整')
      return
    }

    try {
      const win = getCurrentWebviewWindow()
      const rect = el.getBoundingClientRect()

      // 获取内容的实际尺寸（包括 padding）
      const contentHeight = Math.ceil(rect.height)
      const contentWidth = Math.max(Math.ceil(rect.width), 280)

      logWithSource('info', 'useAutoResize[floating]', `内容尺寸: ${contentWidth}x${contentHeight}`)

      // 设置最小高度，避免窗口太小
      const minHeight = 120
      const finalHeight = Math.max(contentHeight, minHeight)

      // 获取当前窗口位置和大小
      const currentSize = await win.outerSize()
      const currentPos = await win.outerPosition()

      logWithSource('info', 'useAutoResize[floating]', `当前窗口: 位置=(${currentPos.x}, ${currentPos.y}), 尺寸=${currentSize.width}x${currentSize.height}`)

      // 获取屏幕尺寸（用于限制窗口位置）
      const screenWidth = window.screen.width
      const screenHeight = window.screen.height

      // 计算新位置：保持右上角对齐
      // 右上角坐标 = 当前位置.x + 当前宽度, 当前位置.y
      const rightTopX = currentPos.x + currentSize.width
      const rightTopY = currentPos.y

      // 新位置 = 右上角坐标 - 新宽度
      let newX = rightTopX - contentWidth
      let newY = rightTopY

      // 限制窗口位置在屏幕范围内（留 10px 边距）
      newX = Math.max(10, Math.min(newX, screenWidth - contentWidth - 10))
      newY = Math.max(10, Math.min(newY, screenHeight - finalHeight - 10))

      logWithSource('info', 'useAutoResize[floating]', `屏幕尺寸: ${screenWidth}x${screenHeight}`)
      logWithSource('info', 'useAutoResize[floating]', `调整窗口: 新尺寸=${contentWidth}x${finalHeight}, 新位置=(${newX}, ${newY})`)

      // 调整窗口大小和位置
      await win.setSize(new LogicalSize(contentWidth, finalHeight))
      await win.setPosition(new LogicalPosition(newX, newY))

      logWithSource('info', 'useAutoResize[floating]', '窗口调整完成')
    } catch (e) {
      logWithSource('error', 'useAutoResize[floating]', `调整窗口大小失败: ${e}`)
    }
  }

  // ResizeObserver 触发时只调整大小，不改位置，避免闪跳
  function debounceUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(resizeImmediate, 16)
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) {
      logWithSource('warn', 'useAutoResize[floating]', 'onMounted: 容器元素不存在')
      return
    }

    logWithSource('info', 'useAutoResize[floating]', '初始化自动调整大小')

    // 初始调整
    updateWindowSize()

    // 监测内容大小变化
    resizeObserver = new ResizeObserver(debounceUpdate)
    resizeObserver.observe(el)

    // 监听动画，动画期间主动驱动 resize
    el.addEventListener('animationstart', onAnimStart)
    el.addEventListener('animationend', onAnimEnd)
  })

  onUnmounted(() => {
    logWithSource('info', 'useAutoResize[floating]', '清理自动调整大小')
    const el = containerRef.value
    if (el) {
      el.removeEventListener('animationstart', onAnimStart)
      el.removeEventListener('animationend', onAnimEnd)
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  })

  // 暴露立即调整方法，供 pin 状态变化时调用
  return { immediateResize: updateWindowSize }
}
