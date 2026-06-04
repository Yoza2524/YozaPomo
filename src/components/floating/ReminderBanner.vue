<script setup lang="ts">
import { useFocusStore } from '@/stores/focusStore'

const focusStore = useFocusStore()

function handleStillHere() {
  focusStore.dismissReminder()
}
</script>

<template>
  <div
    class="reminder-banner flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 animate-fade-in"
  >
    <span class="text-xs text-amber-700">还在专注吗？</span>
    <button
      class="text-xs px-3 py-1 rounded-md bg-amber-500 text-white font-medium hover:bg-amber-600 active:bg-amber-700 transition-colors"
      @click="handleStillHere"
    >
      我还在
    </button>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
