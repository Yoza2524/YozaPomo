/** 应用设置 */
export interface AppSettings {
  focusDuration: number
  todoDisplayCount: number
  showCountdown: boolean
  notificationSound: string
  restDuration: number
}

/** 设置项的默认值 */
export const DEFAULT_SETTINGS: AppSettings = {
  focusDuration: 1500,
  todoDisplayCount: 3,
  showCountdown: true,
  notificationSound: 'default',
  restDuration: 300,
}
