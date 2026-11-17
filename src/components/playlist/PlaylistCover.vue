<script setup lang="ts">
import { computed } from 'vue'
import type { Playlist } from '../../stores/playlists'
import { usePlaylistsStore } from '../../stores/playlists'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'

const props = defineProps<{ playlist: Playlist }>()
const playlists = usePlaylistsStore()

const covers = computed(() =>
  playlists
    .tracksOf(props.playlist)
    .filter((track) => Boolean(track.cover))
    .slice(0, 4),
)

const tiles = computed(() => {
  if (!covers.value.length) return []
  return Array.from({ length: 4 }, (_, index) => covers.value[index % covers.value.length])
})
</script>

<template>
  <div class="pl-cover" :class="{ single: tiles.length === 1 }">
    <template v-if="tiles.length">
      <div v-for="(track, index) in tiles" :key="`${track.id}-${index}`" class="tile">
        <CoverArt fluid :src="track.cover" :title="track.title" :hue="track.coverHue" :radius="0" />
      </div>
    </template>
    <span v-else class="placeholder"><Icon name="playlist" :size="28" /></span>
  </div>
</template>

<style scoped>
.pl-cover {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 20%, rgba(30, 215, 96, 0.2), transparent 60%),
    var(--surface-2);
}

.pl-cover.single {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.tile {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.placeholder {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  display: grid;
  place-items: center;
  color: var(--accent);
}
</style>
