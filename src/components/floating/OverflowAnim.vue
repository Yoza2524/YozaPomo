<script setup lang="ts">
/**
 * 溢出动画组件
 * 当 TODO 达到上限时新建，一个小 Tag 移动到省略号位置并消失
 * 不占布局空间，不影响下方元素
 */
defineProps<{
  /** 省略号是否已存在（hiddenCount > 1 时为 true） */
  ellipsisExists: boolean
}>()

const emit = defineEmits<{
  done: []
}>()

function onAnimEnd() {
  emit('done')
}
</script>

<template>
  <div class="overflow-anim" @animationstart.stop @animationend.stop="onAnimEnd">
    <div
      class="overflow-tag"
      :class="{ 'merge-mode': ellipsisExists }"
    />
  </div>
</template>

<style scoped>
.overflow-anim {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  overflow: visible;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

/* 小 Tag */
.overflow-tag {
  width: 80px;
  height: 18px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(229, 231, 235, 0.5);
  animation: tagFall 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.overflow-tag.merge-mode {
  animation: tagFallMerge 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Tag 出现后向下移动到省略号位置并消失 */
@keyframes tagFall {
  0% {
    opacity: 0;
    transform: translateY(-6px) scale(0.6);
  }
  25% {
    opacity: 0.9;
    transform: translateY(0) scale(0.85);
  }
  70% {
    opacity: 0.5;
    transform: translateY(14px) scale(0.3);
  }
  100% {
    opacity: 0;
    transform: translateY(18px) scale(0.1);
  }
}

/* 省略号已存在时，更快汇聚 */
@keyframes tagFallMerge {
  0% {
    opacity: 0;
    transform: translateY(-6px) scale(0.6);
  }
  20% {
    opacity: 0.9;
    transform: translateY(0) scale(0.7);
  }
  100% {
    opacity: 0;
    transform: translateY(14px) scale(0);
  }
}
</style>
