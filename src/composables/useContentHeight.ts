import { computed, type Ref } from 'vue'

/**
 * 高度常量（px）
 * 与实际 CSS 精确对应，用于预计算窗口高度
 */
const TITLE_BAR_H = 40   // py-2(8+8) + pin-btn(24)
const TAG_H = 48          // 40px 内容 + 8px mb-2
const PLACEHOLDER_H = 48  // 40px + 8px mb-2（与单个 Tag 等高）
const ELLIPSIS_H = 22     // 18px 文字 + 2px mt + 2px padding
const BUTTON_AREA_H = 64  // pb-4(16) + pt-2(8) + button(40)
const MIN_H = 120         // 窗口最小高度

/**
 * 根据 TODO 数量预计算内容区高度
 *
 * @param todoCount  当前 todo 总数
 * @param maxDisplay 最大可见数
 * @returns 内容区总高度（px）
 */
export function calcContentHeight(todoCount: number, maxDisplay: number): number {
  if (todoCount === 0) {
    // 0 个 todo：显示 "暂无待办"（高度 = 1 个 Tag）
    return TITLE_BAR_H + PLACEHOLDER_H + BUTTON_AREA_H
  }

  const visibleCount = Math.min(todoCount, maxDisplay)
  const hasEllipsis = todoCount > maxDisplay
  const todoAreaH = visibleCount * TAG_H + (hasEllipsis ? ELLIPSIS_H : 0)

  return Math.max(TITLE_BAR_H + todoAreaH + BUTTON_AREA_H, MIN_H)
}

/**
 * 计算式内容高度 composable
 *
 * 基于 todo 数量预计算窗口高度，替代 ResizeObserver 响应式方案。
 * 返回的 targetHeight 绑定到内容容器的 style.height，
 * CSS transition 驱动平滑变化，ResizeObserver 自然捕获。
 */
export function useContentHeight(options: {
  todoCount: Ref<number>
  maxDisplay: Ref<number>
}) {
  const targetHeight = computed(() => calcContentHeight(options.todoCount.value, options.maxDisplay.value))

  return { targetHeight }
}
