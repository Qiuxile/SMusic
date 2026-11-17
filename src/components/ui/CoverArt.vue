<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    title: string
    hue?: number
    size?: number
    radius?: number
    fluid?: boolean
  }>(),
  { size: 48, radius: 10, fluid: false },
)

const failed = ref(false)

watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

const showImage = computed(() => Boolean(props.src) && !failed.value)
const hue = computed(() => props.hue ?? 262)
const initial = computed(() => (props.title || '?').trim().charAt(0).toUpperCase())

const style = computed(() => ({
  width: props.fluid ? '100%' : `${props.size}px`,
  height: props.fluid ? '100%' : `${props.size}px`,
  aspectRatio: props.fluid ? '1 / 1' : undefined,
  borderRadius: `${props.radius}px`,
  background: showImage.value
    ? '#0d0f16'
    : `linear-gradient(145deg, hsl(${hue.value} 58% 46%), hsl(${(hue.value + 46) % 360} 62% 24%))`,
}))
</script>

<template>
  <div class="cover" :style="style">
    <img
      v-if="showImage"
      :src="src"
      :alt="title"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
    <span v-else class="initial">{{ initial }}</span>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  flex: none;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.18), transparent 55%);
  pointer-events: none;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initial {
  font-size: calc(v-bind(size) * 0.34px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.35);
  user-select: none;
}
</style>
