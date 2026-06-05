import { emit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

export interface LogEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  message: string
}

const logs: LogEntry[] = []
const MAX_LOGS = 500

function now(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

function addLog(level: LogEntry['level'], message: string, source?: string) {
  const entry: LogEntry = { time: now(), level, message }
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.shift()
  // 广播到其他窗口
  try { emit('frontend-log', entry) } catch {}
  // 写入 Rust 端日志文件（使用 write_log 命令）
  try {
    invoke('write_log', {
      level,
      message,
      source: source || 'frontend',
    })
  } catch {}
}

export function getLogs(): LogEntry[] { return logs }
export function addExternalLog(entry: LogEntry) {
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.shift()
}
export function clearLogs() { logs.length = 0 }

/**
 * 带来源标识的日志输出
 */
export function logWithSource(
  level: LogEntry['level'],
  source: string,
  message: string,
): void {
  addLog(level, `[${source}] ${message}`, source)
}

// 拦截 console
const origLog = console.log.bind(console)
const origWarn = console.warn.bind(console)
const origError = console.error.bind(console)

console.log = (...args: any[]) => {
  addLog('info', args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '))
  origLog(...args)
}
console.warn = (...args: any[]) => {
  addLog('warn', args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '))
  origWarn(...args)
}
console.error = (...args: any[]) => {
  addLog('error', args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '))
  origError(...args)
}

// 全局异常捕获
window.addEventListener('error', (e) => {
  addLog('error', `[global] ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`, 'global-error')
})
window.addEventListener('unhandledrejection', (e) => {
  addLog('error', `[rejection] ${e.reason}`, 'unhandled-rejection')
})
