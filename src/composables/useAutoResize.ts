import { onMounted, onUnmounted, type Ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/window'
import { logWithSource } from '@/utils/logger'

/**
 * 使悬浮窗大小适应内容
 *
 * 原理：
 * 1. 监测内容容器的大小变化
 * 2. 动态调整窗口大小，只覆盖有内容的区域
 * 3. 透明区域不存在，窗口外的点击自然落到下方窗口
 *
 * 策略：
 * - 非动画时：ResizeObserver + debounce 调整大小
 * - 动画时：ResizeObserver 触发后启动 rAF 循环，每帧同步窗口与内容
 */
export function useAutoResize(containerRef: Ref<HTMLElement | null>) {
  let resizeObserver: ResizeObserver | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let animationFrame: number | null = null
  let animCount = 0 // 正在进行的动画数量
  let listenerAbortController: AbortController | null = null

  function resizeImmediate() {
    const el = containerRef.value
    if (!el) return
    const win = getCurrentWindow()
    const rect = el.getBoundingClientRect()
    const contentHeight = Math.ceil(rect.height)
    const contentWidth = Math.max(Math.ceil(rect.width), 280)
    // 容器尺寸为 0 说明尚未完成首次渲染，跳过避免窗口被调到极小尺寸
    if (contentHeight === 0) return
    const finalHeight = Math.max(contentHeight, 120)

    Promise.all([win.outerSize(), win.outerPosition()]).then(([currentSize, currentPos]) => {
      // outerPosition/outerSize 返回物理坐标，需转换为逻辑坐标
      const scale = window.devicePixelRatio || 1
      const logicalX = currentPos.x / scale
      const logicalY = currentPos.y / scale
      const rightTopX = logicalX + (currentSize.width / scale)
      const newX = rightTopX - contentWidth
      win.setSize(new LogicalSize(contentWidth, finalHeight)).catch(() => {})
      if (Math.round(newX) !== Math.round(logicalX)) {
        win.setPosition(new LogicalPosition(newX, logicalY)).catch(() => {})
      }
    })
  }

  // rAF 循环：动画期间每帧同步窗口大小
  function startAnimLoop() {
    if (animationFrame) return
    function frame() {
      resizeImmediate()
      if (animCount > 0) animationFrame = requestAnimationFrame(frame)
      else animationFrame = null
    }
    animationFrame = requestAnimationFrame(frame)
  }

  function stopAnimLoop() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  // ResizeObserver 回调：动画期间完全跳过，避免读到旧数据
  function onResize() {
    if (animCount > 0) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      // animationstart 可能在此期间触发
      if (animCount > 0) return
      resizeImmediate()
    }, 16)
  }

  async function updateWindowSize() {
    const el = containerRef.value
    if (!el) {
      logWithSource('warn', 'useAutoResize[floating]', '容器元素不存在，跳过调整')
      return
    }

    try {
      const win = getCurrentWindow()
      const rect = el.getBoundingClientRect()
      const contentHeight = Math.ceil(rect.height)
      const contentWidth = Math.max(Math.ceil(rect.width), 280)
      if (contentHeight === 0) return
      const finalHeight = Math.max(contentHeight, 120)
      const currentSize = await win.outerSize()
      const currentPos = await win.outerPosition()
      // outerPosition/outerSize 返回物理坐标，需转换为逻辑坐标
      const scale = window.devicePixelRatio || 1
      const screenWidth = window.screen.width
      const screenHeight = window.screen.height
      const logicalX = currentPos.x / scale
      const logicalY = currentPos.y / scale
      const rightTopX = logicalX + (currentSize.width / scale)
      let newX = rightTopX - contentWidth
      let newY = logicalY
      newX = Math.max(10, Math.min(newX, screenWidth - contentWidth - 10))
      newY = Math.max(10, Math.min(newY, screenHeight - finalHeight - 10))

      await win.setSize(new LogicalSize(contentWidth, finalHeight))
      await win.setPosition(new LogicalPosition(newX, newY))
    } catch (e) {
      logWithSource('error', 'useAutoResize[floating]', `调整窗口大小失败: ${e}`)
    }
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) {
      logWithSource('warn', 'useAutoResize[floating]', 'onMounted: 容器元素不存在')
      return
    }

    // 初始调整（延迟确保首次渲染完成后再读取容器尺寸）
    requestAnimationFrame(() => {
      resizeImmediate()
    })

    // 监测内容大小变化
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(el)

    // 动画/过渡事件：用计数器跟踪，期间由 rAF 驱动 resize
    // 使用 AbortController 统一管理生命周期，onUnmounted 时批量移除
    const ac = new AbortController()
    listenerAbortController = ac
    const opts = { signal: ac.signal }
    el.addEventListener('animationstart', () => {
      animCount++
      startAnimLoop()
    }, opts)
    el.addEventListener('animationend', () => {
      animCount = Math.max(0, animCount - 1)
      if (animCount === 0) {
        stopAnimLoop()
        resizeImmediate()
      }
    }, opts)
    el.addEventListener('transitionstart', () => {
      animCount++
      startAnimLoop()
    }, opts)
    el.addEventListener('transitionend', () => {
      animCount = Math.max(0, animCount - 1)
      if (animCount === 0) {
        stopAnimLoop()
        resizeImmediate()
      }
    }, opts)
    el.addEventListener('transitioncancel', () => {
      animCount = Math.max(0, animCount - 1)
      if (animCount === 0) {
        stopAnimLoop()
        resizeImmediate()
      }
    }, opts)
  })

  onUnmounted(() => {
    stopAnimLoop()
    if (listenerAbortController) {
      listenerAbortController.abort()
      listenerAbortController = null
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })

  // 暴露立即调整方法，供 pin 状态变化时调用
  return { immediateResize: updateWindowSize }
}
