<script setup lang="ts">
import type { Album } from '../../stores/library'
import { usePlayerStore } from '../../stores/player'
import { formatDurationLong } from '../../utils/format'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'

const props = withDefaults(defineProps<{ album: Album; compact?: boolean }>(), {
  compact: false,
})

const player = usePlayerStore()

function playAlbum(): void {
  if (!props.album.tracks.length) return
  player.playTrack(props.album.tracks[0], props.album.tracks)
}
</script>

<template>
  <article class="album-card" :class="{ compact }">
    <div class="art">
      <RouterLink :to="`/album/${album.key}`" :aria-label="`打开专辑 ${album.name}`">
        <CoverArt fluid :src="album.cover" :title="album.name" :hue="album.hue" :radius="10" />
      </RouterLink>
      <button class="play" :aria-label="`播放专辑 ${album.name}`" @click="playAlbum">
        <Icon name="play" :size="16" filled />
      </button>
    </div>
    <div class="info">
      <RouterLink :to="`/album/${album.key}`" class="name">{{ album.name }}</RouterLink>
      <div class="sub">{{ album.artist }}</div>
      <div v-if="!compact" class="meta">
        {{ album.tracks.length }} 首 · {{ formatDurationLong(album.duration) }}
      </div>
    </div>
  </article>
</template>

<style scoped>
.album-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 250px;
}

.art {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
}

.art :deep(.cover) {
  transition: transform var(--motion-base) var(--ease-out);
}

.album-card:hover .art :deep(.cover) {
  transform: translateY(-2px);
}

.play {
  position: absolute;
  right: 9px;
  bottom: 9px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-circle);
  color: var(--accent-contrast);
  background: var(--accent);
  box-shadow: var(--shadow-accent);
  opacity: 0;
  transform: translateY(5px);
  transition: opacity var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out);
}

.album-card:hover .play,
.album-card:focus-within .play {
  opacity: 1;
  transform: translateY(0);
}

.info {
  min-width: 0;
}

.name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name:hover {
  text-decoration: underline;
}

.sub {
  font-size: 12px;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted);
}

.compact .name {
  font-size: 12.5px;
}

.compact .sub,
.compact .meta {
  font-size: 11px;
}
</style>
