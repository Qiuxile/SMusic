<script setup lang="ts">
import { useLibraryStore } from '../stores/library'
import { formatDurationLong } from '../utils/format'
import CoverArt from '../components/ui/CoverArt.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Albums</p>
        <h1 class="page-title">专辑</h1>
        <p class="page-sub">
          {{ library.albums.length }} 张专辑 · {{ formatDurationLong(library.totalDuration) }}
        </p>
      </div>
      <span class="chip"><Icon name="disc" :size="12" />按音频标签自动归集</span>
    </header>

    <div v-if="library.albums.length" class="grid-cards">
      <RouterLink
        v-for="album in library.albums"
        :key="album.key"
        :to="`/album/${album.key}`"
        class="album-card"
      >
        <div class="art">
          <CoverArt fluid :src="album.cover" :title="album.name" :hue="album.hue" :radius="12" />
          <span class="play"><Icon name="play" :size="16" filled /></span>
        </div>
        <div class="info">
          <div class="name">{{ album.name }}</div>
          <div class="sub">{{ album.artist }}</div>
          <div class="meta">{{ album.tracks.length }} 首 · {{ formatDurationLong(album.duration) }}</div>
        </div>
      </RouterLink>
    </div>

    <EmptyState
      v-else
      title="还没有专辑"
      description="把音频放入 music/ 目录后重新构建，专辑会根据标签自动生成。"
    />
  </section>
</template>

<style scoped>
.album-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.art {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}

.album-card:hover .art {
  transform: translateY(-3px);
}

.play {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #160c2b;
  background: var(--accent);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.album-card:hover .play {
  opacity: 1;
  transform: translateY(0);
}

.info {
  min-width: 0;
}

.name {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
