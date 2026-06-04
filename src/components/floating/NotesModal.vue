<script setup lang="ts">
import { ref } from 'vue'

const { title, placeholder } = defineProps<{
  title: string
  placeholder?: string
}>()

const emit = defineEmits<{
  confirm: [notes: string]
  cancel: []
}>()

const notes = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function handleConfirm() {
  emit('confirm', notes.value)
}

// 打开时自动聚焦
defineExpose({
  focus: () => {
    setTimeout(() => textareaRef.value?.focus(), 100)
  },
})
</script>

<template>
  <!-- 遮罩 -->
  <div class="fixed inset-0 z-50 bg-black/20 flex items-center justify-center" @click="emit('cancel')">
    <!-- 弹窗 -->
    <div
      class="bg-white rounded-2xl shadow-xl p-5 w-[260px] animate-scale-in"
      @click.stop
    >
      <h3 class="text-sm font-semibold text-gray-800 mb-3">{{ title }}</h3>

      <textarea
        ref="textareaRef"
        v-model="notes"
        class="w-full h-24 resize-none rounded-lg border border-gray-200 p-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-300 transition-colors"
        :placeholder="placeholder ?? '写点什么...（支持 Markdown）'"
        @keydown.escape="emit('cancel')"
      />

      <div class="flex gap-2 mt-3">
        <button
          class="flex-1 h-9 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          class="flex-1 h-9 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          @click="handleConfirm"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
