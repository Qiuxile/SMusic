<script setup lang="ts">
import { useLibraryStore } from '../stores/library'
import { usePlayerStore } from '../stores/player'
import { formatDurationLong } from '../utils/format'
import TrackList from '../components/track/TrackList.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()
const player = usePlayerStore()

function playAll(): void {
  if (!library.recentTracks.length) return
  player.playTrack(library.recentTracks[0], library.recentTracks)
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Recently Played</p>
        <h1 class="page-title">最近播放</h1>
        <p class="page-sub">
          {{ library.recentTracks.length }} 首 ·
          {{ formatDurationLong(library.recentTracks.reduce((sum, track) => sum + track.duration, 0)) }}
        </p>
      </div>
      <div class="head-actions">
        <button v-if="library.recentTracks.length" class="btn" @click="library.clearRecent()">
          <Icon name="trash" :size="14" />清空记录
        </button>
        <button v-if="library.recentTracks.length" class="btn primary" @click="playAll">
          <Icon name="play" :size="14" filled />播放全部
        </button>
      </div>
    </header>

    <TrackList
      v-if="library.recentTracks.length"
      :tracks="library.recentTracks"
      empty-text="还没有播放记录"
    />

    <EmptyState
      v-else
      icon="clock"
      title="还没有播放记录"
      description="播放过的歌曲会按时间倒序出现在这里，记录仅保存在本机。"
    >
      <RouterLink to="/" class="btn">去曲库逛逛</RouterLink>
    </EmptyState>
  </section>
</template>

<style scoped>
.head-actions {
  display: flex;
  gap: 8px;
}
</style>
