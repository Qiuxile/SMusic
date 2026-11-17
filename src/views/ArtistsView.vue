<script setup lang="ts">
import { useLibraryStore } from '../stores/library'
import CoverArt from '../components/ui/CoverArt.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()

function coverOf(name: string): { src?: string; hue?: number } {
  const artist = library.artistByName(name)
  const first = artist?.tracks.find((track) => track.cover) ?? artist?.tracks[0]
  return { src: first?.cover, hue: first?.coverHue ?? artist?.hue }
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Artists</p>
        <h1 class="page-title">歌手</h1>
        <p class="page-sub">{{ library.artists.length }} 位歌手 · 依据标签中的艺术家字段</p>
      </div>
      <span class="chip"><Icon name="users" :size="12" />多人合作曲目会分别归入</span>
    </header>

    <div v-if="library.artists.length" class="artist-grid">
      <RouterLink
        v-for="artist in library.artists"
        :key="artist.key"
        :to="`/artist/${encodeURIComponent(artist.name)}`"
        class="artist-card"
      >
        <CoverArt
          :src="coverOf(artist.name).src"
          :title="artist.name"
          :hue="coverOf(artist.name).hue"
          :size="76"
          :radius="999"
        />
        <div class="info">
          <div class="name">{{ artist.name }}</div>
          <div class="meta">{{ artist.tracks.length }} 首 · {{ artist.albumCount }} 张专辑</div>
        </div>
      </RouterLink>
    </div>

    <EmptyState
      v-else
      title="还没有歌手信息"
      description="音频标签里缺少艺术家字段时，会归入「未知歌手」。"
    />
  </section>
</template>

<style scoped>
.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.artist-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  transition: background-color 0.16s ease, border-color 0.16s ease;
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
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--muted);
}
</style>
