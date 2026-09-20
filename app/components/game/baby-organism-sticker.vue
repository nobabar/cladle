<script setup lang="ts">
interface Props {
  emoji: string;
  name: string;
  size?: "sm" | "md";
}

withDefaults(defineProps<Props>(), {
  size: "md",
});
</script>

<template>
  <span
    class="baby-organism-sticker"
    :class="{
      'baby-organism-sticker--sm': size === 'sm',
      'baby-organism-sticker--md': size === 'md',
    }"
  >
    <span class="baby-organism-sticker__emoji" aria-hidden="true">{{ emoji }}</span>
    <span class="baby-organism-sticker__name">{{ name }}</span>
  </span>
</template>

<style scoped>
.baby-organism-sticker {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
}

.baby-organism-sticker--sm {
  gap: 0.25rem;
  min-height: 44px;
}

.baby-organism-sticker__emoji {
  flex-shrink: 0;
  line-height: 1;
}

.baby-organism-sticker--sm .baby-organism-sticker__emoji {
  font-size: 1rem;
}

.baby-organism-sticker--md .baby-organism-sticker__emoji {
  font-size: 1.125rem;
}

.baby-organism-sticker__name {
  font-weight: 500;
}
</style>
