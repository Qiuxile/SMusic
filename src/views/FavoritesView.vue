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
  if (!library.favoriteTracks.length) return
  player.playTrack(library.favoriteTracks[0], library.favoriteTracks)
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Favorites</p>
        <h1 class="page-title">我的收藏</h1>
        <p class="page-sub">
          {{ library.favoriteTracks.length }} 首 ·
          {{ formatDurationLong(library.favoriteTracks.reduce((sum, track) => sum + track.duration, 0)) }}
        </p>
      </div>
      <button v-if="library.favoriteTracks.length" class="btn primary" @click="playAll">
        <Icon name="play" :size="14" filled />播放收藏
      </button>
    </header>

    <TrackList
      v-if="library.favoriteTracks.length"
      :tracks="library.favoriteTracks"
      empty-text="还没有收藏歌曲"
    />

    <EmptyState
      v-else
      icon="heart"
      title="收藏列表还是空的"
      description="在歌曲右侧点一下爱心，收藏会保存在这台设备的浏览器里，不需要登录。"
    >
      <RouterLink to="/" class="btn">去曲库逛逛</RouterLink>
    </EmptyState>
  </section>
</template>
