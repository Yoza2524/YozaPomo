import { ref } from 'vue'
import { db } from '@/utils/database'
import type { AppSettings } from '@/types/settings'
import { DEFAULT_SETTINGS } from '@/types/settings'

/**
 * 设置管理组合式函数
 */
export function useSettings() {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 从数据库加载所有设置 */
  async function loadSettings() {
    loading.value = true
    error.value = null
    try {
      const pairs = await db.getAllSettings()
      const map = Object.fromEntries(pairs) as Record<string, string>
      settings.value = {
        focusDuration: parseInt(map.focus_duration ?? String(DEFAULT_SETTINGS.focusDuration), 10),
        todoDisplayCount: parseInt(
          map.todo_display_count ?? String(DEFAULT_SETTINGS.todoDisplayCount),
          10,
        ),
        showCountdown: (map.show_countdown ?? String(DEFAULT_SETTINGS.showCountdown)) === 'true',
        notificationSound: map.notification_sound ?? DEFAULT_SETTINGS.notificationSound,
        restDuration: parseInt(map.rest_duration ?? String(DEFAULT_SETTINGS.restDuration), 10),
      }
    } catch (e) {
      error.value = `加载设置失败: ${e}`
      console.error(error.value)
      // 回退到默认值
      settings.value = { ...DEFAULT_SETTINGS }
    } finally {
      loading.value = false
    }
  }

  /** 更新单个设置 */
  async function updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<boolean> {
    error.value = null
    try {
      const dbKey = camelToSnake(key as string)
      const strValue = String(value)
      await db.setSetting(dbKey, strValue)
      settings.value[key] = value
      return true
    } catch (e) {
      error.value = `保存设置失败: ${e}`
      console.error(error.value)
      return false
    }
  }

  /** 批量更新设置 */
  async function saveAllSettings(newSettings: Partial<AppSettings>): Promise<boolean> {
    error.value = null
    try {
      const entries: [string, string][] = Object.entries(newSettings).map(([key, val]) => [
        camelToSnake(key),
        String(val),
      ])
      await db.updateSettings(entries)
      Object.assign(settings.value, newSettings)
      return true
    } catch (e) {
      error.value = `批量保存设置失败: ${e}`
      console.error(error.value)
      return false
    }
  }

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSetting,
    saveAllSettings,
  }
}

/** camelCase → snake_case */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
