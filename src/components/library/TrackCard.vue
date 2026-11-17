<script setup lang="ts">
import { computed } from 'vue'
import type { Track } from '../../types'
import { usePlayerStore } from '../../stores/player'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'

const props = withDefaults(defineProps<{ track: Track; queue?: Track[] }>(), {
  queue: undefined,
})

const player = usePlayerStore()
const isCurrent = computed(() => player.current?.id === props.track.id)
const isPlaying = computed(() => isCurrent.value && player.playing)

function toggle(): void {
  if (isCurrent.value) player.toggle()
  else player.playTrack(props.track, props.queue?.length ? props.queue : [props.track])
}
</script>

<template>
  <article class="track-card" :class="{ active: isCurrent }">
    <div class="art">
      <CoverArt
        fluid
        :src="track.cover"
        :title="track.title"
        :hue="track.coverHue"
        :radius="8"
      />
      <button
        class="play"
        :aria-label="isPlaying ? `暂停 ${track.title}` : `播放 ${track.title}`"
        @click="toggle"
      >
        <Icon :name="isPlaying ? 'pause' : 'play'" :size="16" filled />
      </button>
    </div>
    <RouterLink :to="`/album/${track.albumKey}`" class="name">{{ track.title }}</RouterLink>
    <div class="sub">{{ track.artist }}</div>
  </article>
</template>

<style scoped>
.track-card {
  min-width: 0;
}

.art {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
}

.play {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-circle);
  color: var(--accent-contrast);
  background: var(--accent);
  box-shadow: var(--shadow-accent);
  opacity: 0;
  transform: translateY(5px);
  transition: opacity var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
}

.track-card:hover .play,
.track-card:focus-within .play,
.track-card.active .play {
  opacity: 1;
  transform: translateY(0);
}

.name {
  display: block;
  margin-top: 7px;
  font-size: 12.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name:hover {
  text-decoration: underline;
}

.track-card.active .name {
  color: var(--accent);
}

.sub {
  font-size: 11.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
