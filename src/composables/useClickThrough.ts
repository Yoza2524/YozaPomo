import { onMounted, type Ref } from 'vue'

/**
 * 使悬浮窗透明区域支持点击穿透
 *
 * 通过 CSS pointer-events 实现：
 * - 根容器 pointer-events: none（透明区域不接收鼠标事件）
 * - 内容区域 pointer-events: auto（有内容的区域正常接收事件）
 *
 * 注意：这是窗口内的穿透效果，不是系统级别的穿透。
 * 系统级别穿透需要 Tauri 的 setIgnoreCursorEvents，
 * 但该 API 会让整个窗口穿透，无法区分透明/非透明区域。
 */
export function useClickThrough(_containerRef: Ref<HTMLElement | null>) {
  onMounted(() => {
    // CSS 已经在 FloatingWindow.vue 中设置
    // 这个 composable 预留用于未来扩展
  })
}
