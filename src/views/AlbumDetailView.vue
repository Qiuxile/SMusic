<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { usePlayerStore } from '../stores/player'
import { formatDurationLong } from '../utils/format'
import CoverArt from '../components/ui/CoverArt.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'
import TrackList from '../components/track/TrackList.vue'

const route = useRoute()
const library = useLibraryStore()
const player = usePlayerStore()

const album = computed(() => library.albumByKey(String(route.params.key)))
const tracks = computed(() => album.value?.tracks ?? [])

function playAll(): void {
  if (!tracks.value.length) return
  player.playTrack(tracks.value[0], tracks.value)
}

function enqueueAll(): void {
  for (const track of tracks.value) player.addToQueue(track)
}
</script>

<template>
  <section v-if="album" class="page">
    <RouterLink to="/albums" class="back">
      <Icon name="chevron-left" :size="14" />返回专辑
    </RouterLink>

    <header class="album-head">
      <CoverArt
        :src="album.cover"
        :title="album.name"
        :hue="album.hue"
        :size="184"
        :radius="16"
        class="cover"
      />
      <div class="head-info">
        <p class="eyebrow">Album</p>
        <h1 class="album-name">{{ album.name }}</h1>
        <p class="album-artist">
          <RouterLink :to="`/artist/${encodeURIComponent(album.artist)}`">{{ album.artist }}</RouterLink>
        </p>
        <div class="meta">
          <span v-if="album.year" class="chip">{{ album.year }}</span>
          <span class="chip">{{ album.tracks.length }} 首</span>
          <span class="chip">{{ formatDurationLong(album.duration) }}</span>
        </div>
        <div class="actions">
          <button class="btn primary" @click="playAll">
            <Icon name="play" :size="14" filled />播放全部
          </button>
          <button class="btn" @click="enqueueAll"><Icon name="queue" :size="14" />加入队列</button>
        </div>
      </div>
    </header>

    <div class="section">
      <TrackList :tracks="tracks" :show-album="false" />
    </div>
  </section>

  <section v-else class="page">
    <EmptyState title="找不到这张专辑" description="它可能已被移出 music/ 目录，或者链接已失效。">
      <RouterLink to="/albums" class="btn">返回专辑列表</RouterLink>
    </EmptyState>
  </section>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  color: var(--muted);
  font-size: 12px;
}

.back:hover {
  color: var(--text);
}

.album-head {
  display: flex;
  align-items: flex-end;
  gap: 26px;
  padding: 8px 0 24px;
}

.cover {
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.5);
  flex: none;
}

.head-info {
  min-width: 0;
  padding-bottom: 4px;
}

.album-name {
  margin-top: 6px;
  font-size: 34px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-weight: 700;
  word-break: break-word;
}

.album-artist {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-soft);
}

.album-artist a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .album-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .cover {
    width: 132px !important;
    height: 132px !important;
  }

  .album-name {
    font-size: 24px;
  }
}
</style>
