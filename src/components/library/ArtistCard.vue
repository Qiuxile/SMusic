<script setup lang="ts">
import type { Artist } from '../../stores/library'
import CoverArt from '../ui/CoverArt.vue'

const props = withDefaults(
  defineProps<{ artist: Artist; meta?: string; compact?: boolean }>(),
  { meta: '', compact: false },
)

function cover(): { src?: string; hue?: number } {
  const first =
    props.artist.tracks.find((track) => track.cover) ?? props.artist.tracks[0]
  return { src: first?.cover, hue: first?.coverHue ?? props.artist.hue }
}
</script>

<template>
  <RouterLink
    :to="`/artist/${encodeURIComponent(artist.name)}`"
    class="artist-card"
    :class="{ compact }"
  >
    <CoverArt
      :src="cover().src"
      :title="artist.name"
      :hue="cover().hue"
      :size="compact ? 48 : 64"
      :radius="999"
    />
    <div class="info">
      <div class="name">{{ artist.name }}</div>
      <div class="meta">
        {{ meta || `${artist.tracks.length} 首 · ${artist.albumCount} 张专辑` }}
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.artist-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition: background-color var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out);
  content-visibility: auto;
  contain-intrinsic-size: auto 84px;
}

.artist-card:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.info {
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact {
  padding: 8px 10px;
}

.compact .name {
  font-size: 12.5px;
}

.compact .meta {
  font-size: 10.5px;
}
</style>
