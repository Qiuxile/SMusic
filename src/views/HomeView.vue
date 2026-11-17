<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '../stores/library'
import { usePlayerStore } from '../stores/player'
import { usePlaylistsStore } from '../stores/playlists'
import { dailyPicks } from '../utils/recommend'
import { formatDurationLong, formatTime } from '../utils/format'
import AlbumCard from '../components/library/AlbumCard.vue'
import ArtistCard from '../components/library/ArtistCard.vue'
import TrackCard from '../components/library/TrackCard.vue'
import TrackList from '../components/track/TrackList.vue'
import CoverArt from '../components/ui/CoverArt.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()
const player = usePlayerStore()
const playlists = usePlaylistsStore()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const daily = computed(() =>
  dailyPicks(library.tracks, {
    favorites: library.favorites,
    recent: library.recentIds,
    count: 6,
  }),
)

const resumeTrack = computed(() => {
  const current = player.current
  if (current && (player.currentTime > 0 || library.recentIds.includes(current.id))) {
    return current
  }
  return library.recentTracks[0] ?? library.tracks[0] ?? null
})

const resumeIsCurrent = computed(
  () => Boolean(resumeTrack.value && player.current?.id === resumeTrack.value.id),
)

const canResume = computed(
  () =>
    resumeIsCurrent.value &&
    (player.currentTime > 0 || library.recentIds.includes(resumeTrack.value?.id ?? '')),
)

const resumeProgress = computed(() => {
  if (!resumeIsCurrent.value) return 0
  const total = player.duration || resumeTrack.value?.duration || 0
  return total > 0 ? Math.min(1, player.currentTime / total) : 0
})

const resumeCaption = computed(() => {
  if (resumeIsCurrent.value && player.currentTime > 0) {
    return `上次听到 ${formatTime(player.currentTime)}`
  }
  if (canResume.value) return `最近播放 · ${library.recent.length} 首记录`
  return '从曲库的第一首开始'
})

const recentPreview = computed(() => library.recentTracks.slice(0, 5))
const allPreview = computed(() => library.tracks.slice(0, 6))

const topArtists = computed(() => {
  const recent = new Set(library.recentIds.slice(0, 30))
  return [...library.artists]
    .map((artist) => ({
      artist,
      score:
        artist.tracks.length * 2 +
        artist.tracks.reduce((sum, track) => sum + (recent.has(track.id) ? 5 : 0), 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.artist.name.localeCompare(b.artist.name, 'zh-Hans-CN'),
    )
    .slice(0, 6)
    .map((entry) => entry.artist)
})

const yearsAvailable = computed(
  () => library.albums.filter((album) => album.year != null).length,
)

const featuredAlbums = computed(() =>
  [...library.albums]
    .sort(
      (a, b) =>
        (b.year ?? 0) - (a.year ?? 0) ||
        a.name.localeCompare(b.name, 'zh-Hans-CN'),
    )
    .slice(0, 6),
)

const albumSectionTitle = computed(() =>
  yearsAvailable.value >= 3 ? '新发行专辑' : '专辑精选',
)
const albumSectionHint = computed(() =>
  yearsAvailable.value >= 3 ? '按音频标签中的发行年份排序' : '来自本地曲库的专辑',
)

function resume(): void {
  const track = resumeTrack.value
  if (!track) return
  if (resumeIsCurrent.value) player.toggle()
  else player.playTrack(track, library.tracks)
}
</script>

<template>
  <section v-if="library.tracks.length" class="page home">
    <header class="home-head">
      <div>
        <p class="eyebrow">{{ greeting }} · Local Library</p>
        <h1 class="home-title">今天想听点什么？</h1>
        <p class="home-sub">
          {{ library.tracks.length }} 首本地歌曲 · {{ formatDurationLong(library.totalDuration) }} ·
          {{ library.albums.length }} 张专辑
        </p>
      </div>
      <span class="chip"><Icon name="music" :size="12" />来自音频标签</span>
    </header>

    <section v-if="resumeTrack" class="resume-card">
      <div class="resume-copy">
        <p class="eyebrow">{{ canResume ? '继续收听' : '开始收听' }}</p>
        <h2>{{ resumeTrack.title }}</h2>
        <p class="resume-meta">
          {{ resumeTrack.artist }} · {{ resumeTrack.album }}
        </p>
        <p class="resume-caption">{{ resumeCaption }}</p>

        <div v-if="resumeIsCurrent && resumeProgress > 0" class="resume-progress">
          <span :style="{ width: `${resumeProgress * 100}%` }" />
        </div>

        <div class="resume-actions">
          <button class="btn primary" @click="resume">
            <Icon
              :name="resumeIsCurrent && player.playing ? 'pause' : 'play'"
              :size="14"
              filled
            />
            {{ resumeIsCurrent && player.playing ? '暂停' : canResume ? '继续播放' : '开始播放' }}
          </button>
          <RouterLink to="/library" class="btn">浏览曲库</RouterLink>
        </div>
      </div>

      <div class="resume-art">
        <CoverArt
          fluid
          :src="resumeTrack.cover"
          :title="resumeTrack.title"
          :hue="resumeTrack.coverHue"
          :radius="12"
        />
      </div>
    </section>

    <nav class="quick-grid" aria-label="音乐库快捷入口">
      <RouterLink to="/favorites" class="quick">
        <span class="quick-icon"><Icon name="heart" :size="17" /></span>
        <span class="quick-text"><strong>我的收藏</strong><small>{{ library.favorites.length }} 首</small></span>
      </RouterLink>
      <RouterLink to="/playlists" class="quick">
        <span class="quick-icon"><Icon name="playlist" :size="17" /></span>
        <span class="quick-text"><strong>我的歌单</strong><small>{{ playlists.playlists.length }} 个</small></span>
      </RouterLink>
      <RouterLink to="/recent" class="quick">
        <span class="quick-icon"><Icon name="clock" :size="17" /></span>
        <span class="quick-text"><strong>最近播放</strong><small>{{ library.recent.length }} 首</small></span>
      </RouterLink>
      <RouterLink to="/albums" class="quick">
        <span class="quick-icon"><Icon name="disc" :size="17" /></span>
        <span class="quick-text"><strong>专辑</strong><small>{{ library.albums.length }} 张</small></span>
      </RouterLink>
    </nav>

    <section v-if="daily.length" class="section">
      <div class="section-head">
        <div>
          <h2>今日推荐</h2>
          <p>根据本地收藏与最近播放生成，每天更新</p>
        </div>
        <RouterLink to="/library" class="see">全部歌曲<Icon name="arrow-right" :size="14" /></RouterLink>
      </div>

      <div class="track-grid">
        <TrackCard
          v-for="track in daily"
          :key="track.id"
          :track="track"
          :queue="daily"
        />
      </div>
    </section>

    <section v-if="recentPreview.length" class="section">
      <div class="section-head">
        <div>
          <h2>最近播放</h2>
          <p>只保存在这台设备的浏览器里</p>
        </div>
        <RouterLink to="/recent" class="see">查看记录<Icon name="arrow-right" :size="14" /></RouterLink>
      </div>
      <TrackList
        :tracks="recentPreview"
        :show-album="false"
        :show-add-to-playlist="false"
      />
    </section>

    <section v-if="topArtists.length" class="section">
      <div class="section-head">
        <div>
          <h2>{{ library.recent.length ? '常听歌手' : '曲库歌手' }}</h2>
          <p>结合最近播放与曲库曲目数量</p>
        </div>
        <RouterLink to="/artists" class="see">全部歌手<Icon name="arrow-right" :size="14" /></RouterLink>
      </div>
      <div class="artist-grid">
        <ArtistCard v-for="artist in topArtists" :key="artist.key" :artist="artist" />
      </div>
    </section>

    <section v-if="featuredAlbums.length" class="section">
      <div class="section-head">
        <div>
          <h2>{{ albumSectionTitle }}</h2>
          <p>{{ albumSectionHint }}</p>
        </div>
        <RouterLink to="/albums" class="see">全部专辑<Icon name="arrow-right" :size="14" /></RouterLink>
      </div>
      <div class="album-grid">
        <AlbumCard
          v-for="album in featuredAlbums"
          :key="album.key"
          :album="album"
          compact
        />
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>曲库</h2>
          <p>全部 {{ library.tracks.length }} 首，按歌曲、专辑或歌手检索</p>
        </div>
        <RouterLink to="/library" class="see">查看全部<Icon name="arrow-right" :size="14" /></RouterLink>
      </div>
      <TrackList :tracks="allPreview" :show-add-to-playlist="false" />
    </section>
  </section>

  <EmptyState
    v-else
    icon="music"
    title="曲库还是空的"
    description="把音频文件放进 music/ 目录后重新构建，歌曲、专辑与歌手会自动生成。"
  />
</template>

<style scoped>
.home {
  padding-top: var(--space-6);
}

.home-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.home-title {
  margin-top: 6px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: var(--leading-tight);
  letter-spacing: -0.03em;
  font-weight: 700;
}

.home-sub {
  margin-top: 7px;
  font-size: 13px;
  color: var(--muted);
}

.resume-card {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: 22px 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(520px 240px at 88% 10%, rgba(30, 215, 96, 0.13), transparent 68%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.025), rgba(30, 215, 96, 0.035)),
    var(--surface);
  overflow: hidden;
}

.resume-copy {
  flex: 1;
  min-width: 0;
}

.resume-copy h2 {
  margin-top: 6px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-meta {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-caption {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--muted);
}

.resume-progress {
  width: min(360px, 100%);
  height: 3px;
  margin-top: 14px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.resume-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.resume-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.resume-art {
  width: 168px;
  height: 168px;
  flex: none;
  box-shadow: var(--shadow-card);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.quick {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.025);
  transition: background-color var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out);
}

.quick:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.quick-icon {
  width: 32px;
  height: 32px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--accent);
  background: var(--accent-soft);
}

.quick-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.quick-text strong {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-text small {
  font-size: 10.5px;
  color: var(--muted);
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.section-head h2 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.section-head p {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--muted);
}

.see {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  color: var(--muted);
  font-size: 12px;
  transition: color var(--motion-fast) var(--ease-out);
}

.see:hover {
  color: var(--text);
}

.track-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1120px) {
  .track-grid,
  .album-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .home {
    padding-top: var(--space-4);
  }

  .home-head {
    align-items: flex-start;
  }

  .home-head .chip {
    display: none;
  }

  .resume-card {
    gap: var(--space-4);
    padding: 18px;
  }

  .resume-art {
    width: 96px;
    height: 96px;
    order: -1;
  }

  .resume-copy h2 {
    font-size: 22px;
  }

  .resume-caption {
    display: none;
  }

  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .track-grid,
  .album-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .artist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-head {
    align-items: flex-start;
  }

  .see {
    padding-top: 2px;
  }
}

@media (max-width: 520px) {
  .track-grid,
  .album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .artist-grid {
    grid-template-columns: 1fr;
  }

  .resume-art {
    display: none;
  }
}
</style>
