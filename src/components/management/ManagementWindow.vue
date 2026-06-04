<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  NTabs,
  NTabPane,
  NConfigProvider,
  zhCN,
  dateZhCN,
  NMessageProvider,
} from 'naive-ui'
import { listen } from '@tauri-apps/api/event'
import TodayTodos from './TodayTodos.vue'
import YesterdayTodos from './YesterdayTodos.vue'
import TodoListPage from './TodoListPage.vue'
import FocusHistoryPage from './FocusHistoryPage.vue'
import SettingsPage from './SettingsPage.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

const activeTab = ref('today')

// 监听 Rust 端的导航事件（托盘"设置"菜单项）
let unlisten: (() => void) | null = null

onMounted(async () => {
  await settingsStore.loadSettings()

  try {
    unlisten = await listen<string>('navigate', (event) => {
      if (event.payload === 'settings') {
        activeTab.value = 'settings'
      }
    })
  } catch {
    // 事件监听失败时忽略
  }
})

onUnmounted(() => {
  if (unlisten) unlisten()
})
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <div class="h-screen flex flex-col bg-gray-50" @contextmenu.prevent>
        <!-- 顶部 Tab 栏 -->
        <div class="bg-white border-b border-gray-200 px-4 shrink-0">
          <NTabs v-model:value="activeTab" type="line" animated>
            <NTabPane name="today" tab="TODOs" />
            <NTabPane name="yesterday" tab="昨日未完成" />
            <NTabPane name="all" tab="TODO 列表" />
            <NTabPane name="history" tab="专注列表" />
            <NTabPane name="settings" tab="设置" />
          </NTabs>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-auto">
          <TodayTodos v-if="activeTab === 'today'" />
          <YesterdayTodos v-if="activeTab === 'yesterday'" />
          <TodoListPage v-if="activeTab === 'all'" />
          <FocusHistoryPage v-if="activeTab === 'history'" />
          <SettingsPage v-if="activeTab === 'settings'" />
        </div>
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>
