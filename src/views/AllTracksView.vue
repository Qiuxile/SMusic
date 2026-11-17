<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '../stores/library'
import { usePlayerStore } from '../stores/player'
import { formatDurationLong } from '../utils/format'
import TrackList from '../components/track/TrackList.vue'
import CoverArt from '../components/ui/CoverArt.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()
const player = usePlayerStore()

const heroCovers = computed(() => library.albums.slice(0, 3))

function playAll(): void {
  if (!library.tracks.length) return
  player.playTrack(library.tracks[0], library.tracks)
}

function shuffleAll(): void {
  if (!library.tracks.length) return
  const shuffled = [...library.tracks].sort(() => Math.random() - 0.5)
  player.shuffle = true
  player.playTrack(shuffled[0], shuffled)
}
</script>

<template>
  <section class="page">
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Local Library</p>
        <h1 class="hero-title">全部歌曲</h1>
        <p class="hero-sub">
          {{ library.tracks.length }} 首 · {{ formatDurationLong(library.totalDuration) }} ·
          标签与封面来自音频文件
        </p>
        <div class="hero-actions">
          <button class="btn primary" @click="playAll">
            <Icon name="play" :size="14" filled />播放全部
          </button>
          <button class="btn" @click="shuffleAll">
            <Icon name="shuffle" :size="14" />随机播放
          </button>
          <RouterLink to="/albums" class="btn ghost">
            <Icon name="disc" :size="14" />浏览专辑
          </RouterLink>
        </div>
      </div>

      <div v-if="heroCovers.length" class="hero-art" aria-hidden="true">
        <div v-for="(album, index) in heroCovers" :key="album.key" class="art" :class="`art-${index}`">
          <CoverArt
            fluid
            :src="album.cover"
            :title="album.name"
            :hue="album.hue"
            :radius="14"
          />
        </div>
      </div>
    </header>

    <details v-if="library.warnings.length" class="warnings">
      <summary>曲库提示（{{ library.warnings.length }}）</summary>
      <ul>
        <li v-for="warning in library.warnings" :key="warning">{{ warning }}</li>
      </ul>
    </details>

    <div class="section">
      <TrackList :tracks="library.tracks" show-album />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 32px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background:
    radial-gradient(600px 300px at 85% 20%, rgba(167, 139, 250, 0.22), transparent 65%),
    linear-gradient(135deg, rgba(34, 211, 238, 0.07), rgba(124, 92, 240, 0.12)),
    var(--surface);
  overflow: hidden;
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 520px;
}

.hero-title {
  margin-top: 8px;
  font-size: 38px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 700;
}

.hero-sub {
  margin-top: 10px;
  color: var(--text-soft);
  font-size: 13px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.hero-art {
  position: relative;
  width: 240px;
  height: 190px;
  flex: none;
}

.art {
  position: absolute;
  width: 148px;
  height: 148px;
  border-radius: 14px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45);
  transition: transform 0.3s ease;
}

.art-0 {
  left: 0;
  top: 26px;
  transform: rotate(-8deg);
  z-index: 1;
}

.art-1 {
  left: 58px;
  top: 0;
  transform: rotate(3deg);
  z-index: 2;
}

.art-2 {
  left: 108px;
  top: 38px;
  transform: rotate(11deg);
  z-index: 0;
  opacity: 0.9;
}

.hero-art:hover .art-0 {
  transform: rotate(-11deg) translateY(-4px);
}

.hero-art:hover .art-1 {
  transform: rotate(1deg) translateY(-6px);
}

.hero-art:hover .art-2 {
  transform: rotate(14deg) translateY(-2px);
}

.warnings {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  background: rgba(251, 191, 36, 0.06);
  color: #fcd34d;
  font-size: 12px;
}

.warnings summary {
  cursor: pointer;
}

.warnings ul {
  margin: 8px 0 0;
  padding-left: 18px;
  line-height: 1.8;
  color: var(--text-soft);
}

@media (max-width: 900px) {
  .hero {
    padding: 22px 20px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-art {
    display: none;
  }
}
</style>
