<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  NConfigProvider,
  zhCN,
  dateZhCN,
  NMessageProvider,
} from 'naive-ui'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import TodayTodos from './TodayTodos.vue'
import YesterdayTodos from './YesterdayTodos.vue'
import TodoListPage from './TodoListPage.vue'
import FocusHistoryPage from './FocusHistoryPage.vue'
import SettingsPage from './SettingsPage.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

const activeTab = ref('today')

const tabs = [
  { key: 'today', label: 'TODOs' },
  { key: 'yesterday', label: '昨日未完成' },
  { key: 'all', label: 'TODO 列表' },
  { key: 'history', label: '专注列表' },
  { key: 'settings', label: '设置' },
]

// 监听 Rust 端的导航事件（托盘"设置"菜单项）
let unlisten: (() => void) | null = null

onMounted(async () => {
  await settingsStore.loadSettings()

  try {
    unlisten = await listen<string>('navigate', async (event) => {
      const validTabs = ['today', 'yesterday', 'all', 'history', 'settings']
      if (validTabs.includes(event.payload)) {
        activeTab.value = event.payload
        // 确保管理窗口显示
        const win = getCurrentWebviewWindow()
        await win.show()
        await win.setFocus()
      }
    })
  } catch {
    // 事件监听失败时忽略
  }
})

onUnmounted(() => {
  if (unlisten) unlisten()
})

async function openGitHub() {
  const { openUrl } = await import('@tauri-apps/plugin-opener')
  await openUrl('https://github.com/Yoza2524/YozaPomo')
}
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <div class="h-screen flex bg-gray-50" @contextmenu.prevent>
        <!-- 左侧 Tab 栏 -->
        <div class="sidebar shrink-0 flex flex-col pt-3 px-2 gap-1">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </div>
          <div class="mt-auto flex items-center justify-between pr-1" style="padding-left: 0px; padding-bottom: 4px;">
            <span class="text-xl select-none">🍊🍅</span>
            <svg
              class="github-icon"
              @click="openGitHub"
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </div>
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

<style scoped>
.sidebar {
  width: 160px;
  background: #fff;
  border-right: 1px solid #f0f0f0;
}

.tab-item {
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.tab-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.tab-item.active {
  background: #18a058;
  color: #fff;
  font-weight: 600;
}

</style>

<style>
.github-icon {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.github-icon:hover {
  opacity: 1;
}
</style>
