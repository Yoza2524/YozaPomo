/**
 * 格式化秒数为 mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60)
  const secs = Math.floor(Math.abs(seconds) % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化秒数为 hh:mm:ss
 */
export function formatDurationLong(seconds: number): string {
  const hours = Math.floor(Math.abs(seconds) / 3600)
  const mins = Math.floor((Math.abs(seconds) % 3600) / 60)
  const secs = Math.floor(Math.abs(seconds) % 60)
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化 ISO 时间字符串为 HH:mm
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化 ISO 时间字符串为 MM-DD HH:mm
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const time = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${month}-${day} ${time}`
}

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取昨日日期字符串 YYYY-MM-DD
 */
export function getYesterdayDate(): string {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
