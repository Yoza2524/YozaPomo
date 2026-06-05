import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings } from '@/types/settings'
import { DEFAULT_SETTINGS } from '@/types/settings'
import { db } from '@/utils/database'

export const useSettingsStore = defineStore('settings', () => {
  // --- State ---
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // --- Getters ---
  const focusDuration = computed(() => settings.value.focusDuration)
  const todoDisplayCount = computed(() => settings.value.todoDisplayCount)
  const showCountdown = computed(() => settings.value.showCountdown)
  const notificationSound = computed(() => settings.value.notificationSound)
  const restDuration = computed(() => settings.value.restDuration)
  const reminderInterval = computed(() => settings.value.reminderInterval)
  const overtimeReminderInterval = computed(() => settings.value.overtimeReminderInterval)
  const idleTimeout = computed(() => settings.value.idleTimeout)
  const floatingX = computed(() => settings.value.floatingX)
  const floatingY = computed(() => settings.value.floatingY)
  const floatingPinned = computed(() => settings.value.floatingPinned)

  // --- Actions ---

  /** 从数据库加载设置 */
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
        reminderInterval: parseInt(
          map.reminder_interval ?? String(DEFAULT_SETTINGS.reminderInterval),
          10,
        ),
        overtimeReminderInterval: parseInt(
          map.overtime_reminder_interval ?? String(DEFAULT_SETTINGS.overtimeReminderInterval),
          10,
        ),
        idleTimeout: parseInt(
          map.idle_timeout ?? String(DEFAULT_SETTINGS.idleTimeout),
          10,
        ),
        floatingX: map.floating_x ? parseInt(map.floating_x, 10) : DEFAULT_SETTINGS.floatingX,
        floatingY: map.floating_y ? parseInt(map.floating_y, 10) : DEFAULT_SETTINGS.floatingY,
        floatingPinned: (map.floating_pinned ?? String(DEFAULT_SETTINGS.floatingPinned)) === 'true',
      }
    } catch (e) {
      error.value = `加载设置失败: ${e}`
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
      const dbKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
      await db.setSetting(dbKey, String(value))
      settings.value[key] = value
      return true
    } catch (e) {
      error.value = `保存设置失败: ${e}`
      return false
    }
  }

  return {
    settings,
    loading,
    error,
    focusDuration,
    todoDisplayCount,
    showCountdown,
    notificationSound,
    restDuration,
    reminderInterval,
    overtimeReminderInterval,
    idleTimeout,
    floatingX,
    floatingY,
    floatingPinned,
    loadSettings,
    updateSetting,
  }
})
