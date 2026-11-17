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

const name = computed(() => String(route.params.name ?? ''))
const artist = computed(() => library.artistByName(name.value))
const tracks = computed(() => artist.value?.tracks ?? [])
const albums = computed(() =>
  library.albums.filter((album) => album.tracks.some((track) => track.artists.includes(name.value))),
)
const duration = computed(() => tracks.value.reduce((sum, track) => sum + track.duration, 0))
const avatar = computed(() => {
  const first = tracks.value.find((track) => track.cover) ?? tracks.value[0]
  return { src: first?.cover, hue: first?.coverHue ?? 270 }
})

function playAll(): void {
  if (!tracks.value.length) return
  player.playTrack(tracks.value[0], tracks.value)
}
</script>

<template>
  <section v-if="artist" class="page">
    <RouterLink to="/artists" class="back">
      <Icon name="chevron-left" :size="14" />返回歌手
    </RouterLink>

    <header class="artist-head">
      <CoverArt
        :src="avatar.src"
        :title="artist.name"
        :hue="avatar.hue"
        :size="128"
        :radius="999"
        class="avatar"
      />
      <div class="head-info">
        <p class="eyebrow">Artist</p>
        <h1 class="artist-name">{{ artist.name }}</h1>
        <p class="meta">
          {{ tracks.length }} 首歌曲 · {{ albums.length }} 张专辑 · {{ formatDurationLong(duration) }}
        </p>
        <div class="actions">
          <button class="btn primary" @click="playAll">
            <Icon name="play" :size="14" filled />播放全部
          </button>
        </div>
      </div>
    </header>

    <div v-if="albums.length" class="section">
      <div class="section-title">专辑</div>
      <div class="grid-cards small">
        <RouterLink
          v-for="album in albums"
          :key="album.key"
          :to="`/album/${album.key}`"
          class="album-card"
        >
          <CoverArt fluid :src="album.cover" :title="album.name" :hue="album.hue" :radius="11" />
          <div class="album-name">{{ album.name }}</div>
        </RouterLink>
      </div>
    </div>

    <div class="section">
      <div class="section-title">歌曲</div>
      <TrackList :tracks="tracks" />
    </div>
  </section>

  <section v-else class="page">
    <EmptyState title="找不到这位歌手" description="标签可能已变化，或者链接已失效。">
      <RouterLink to="/artists" class="btn">返回歌手列表</RouterLink>
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

.artist-head {
  display: flex;
  align-items: center;
  gap: 26px;
  padding-bottom: 10px;
}

.avatar {
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
  flex: none;
}

.artist-name {
  margin-top: 6px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.meta {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--muted);
}

.actions {
  margin-top: 18px;
}

.grid-cards.small {
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 14px;
}

.album-name {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .artist-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .avatar {
    width: 96px !important;
    height: 96px !important;
  }

  .artist-name {
    font-size: 24px;
  }
}
</style>
