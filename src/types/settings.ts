/** 应用设置 */
export interface AppSettings {
  focusDuration: number
  todoDisplayCount: number
  showCountdown: boolean
  notificationSound: string
  restDuration: number
  /** 专注状态下提醒间隔（秒） */
  reminderInterval: number
  /** 超时状态下提醒间隔（秒） */
  overtimeReminderInterval: number
  /** 异常检测持续时长：按钮出现后多久异常结束（秒，范围 3-90） */
  idleTimeout: number
}

/** 设置项的默认值 */
export const DEFAULT_SETTINGS: AppSettings = {
  focusDuration: 1500,
  todoDisplayCount: 3,
  showCountdown: true,
  notificationSound: 'default',
  restDuration: 300,
  reminderInterval: 300,
  overtimeReminderInterval: 180,
  idleTimeout: 30,
}
