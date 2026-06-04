import { onMounted, onUnmounted, type Ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/window'

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

  async function updateWindowSize() {
    const el = containerRef.value
    if (!el) return

    try {
      const win = getCurrentWebviewWindow()
      const rect = el.getBoundingClientRect()

      // 获取内容的实际尺寸（包括 padding）
      const contentHeight = Math.ceil(rect.height)
      const contentWidth = Math.max(Math.ceil(rect.width), 280)

      // 设置最小高度，避免窗口太小
      const minHeight = 120
      const finalHeight = Math.max(contentHeight, minHeight)

      // 获取当前窗口位置和大小
      const currentSize = await win.outerSize()
      const currentPos = await win.outerPosition()

      // 计算新位置：保持右上角对齐
      // 右上角坐标 = 当前位置.x + 当前宽度, 当前位置.y
      const rightTopX = currentPos.x + currentSize.width
      const rightTopY = currentPos.y

      // 新位置 = 右上角坐标 - 新宽度
      const newX = rightTopX - contentWidth
      const newY = rightTopY

      // 调整窗口大小和位置
      await win.setSize(new LogicalSize(contentWidth, finalHeight))
      await win.setPosition(new LogicalPosition(newX, newY))
    } catch (e) {
      console.error('调整窗口大小失败:', e)
    }
  }

  function debounceUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(updateWindowSize, 100)
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return

    // 初始调整
    updateWindowSize()

    // 监测内容大小变化
    resizeObserver = new ResizeObserver(debounceUpdate)
    resizeObserver.observe(el)
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })
}
