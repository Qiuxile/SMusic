<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlaylistsStore } from '../stores/playlists'
import { usePlayerStore } from '../stores/player'
import { formatDurationLong } from '../utils/format'
import PlaylistCover from '../components/playlist/PlaylistCover.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const playlists = usePlaylistsStore()
const player = usePlayerStore()
const router = useRouter()
const route = useRoute()

const name = ref('')
const error = ref('')
const deleted = computed(() =>
  typeof route.query.deleted === 'string' ? route.query.deleted : '',
)

function create(): void {
  const playlist = playlists.createPlaylist(name.value)
  if (!playlist) {
    error.value = '请输入歌单名称（最多 60 个字符）'
    return
  }
  name.value = ''
  error.value = ''
  void router.push(`/playlist/${playlist.id}`)
}

function play(playlistId: string): void {
  const tracks = playlists.tracksOf(playlistId)
  if (!tracks.length) return
  player.playTrack(tracks[0], tracks)
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Playlists</p>
        <h1 class="page-title">我的歌单</h1>
        <p class="page-sub">
          {{ playlists.playlists.length }} 个歌单 · 保存在这台设备的浏览器里
        </p>
      </div>
      <form class="create" @submit.prevent="create">
        <label class="sr-only" for="new-playlist">新歌单名称</label>
        <input
          id="new-playlist"
          v-model="name"
          type="text"
          maxlength="60"
          placeholder="新歌单名称"
          autocomplete="off"
        />
        <button type="submit" class="btn primary" :disabled="!name.trim()">
          <Icon name="plus" :size="14" />新建歌单
        </button>
      </form>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="deleted" class="notice" role="status">已删除歌单「{{ deleted }}」</p>

    <div v-if="playlists.orderedPlaylists.length" class="playlist-grid">
      <article
        v-for="playlist in playlists.orderedPlaylists"
        :key="playlist.id"
        class="playlist-card"
      >
        <RouterLink :to="`/playlist/${playlist.id}`" class="cover-link">
          <PlaylistCover :playlist="playlist" />
          <span class="cover-badge">{{ playlist.trackIds.length }} 首</span>
        </RouterLink>

        <div class="card-body">
          <RouterLink :to="`/playlist/${playlist.id}`" class="name">
            {{ playlist.name }}
          </RouterLink>
          <p class="meta">
            {{ playlist.trackIds.length }} 首 ·
            {{ formatDurationLong(playlists.durationOf(playlist)) }}
          </p>
          <button
            class="btn sm"
            :disabled="!playlist.trackIds.length"
            @click="play(playlist.id)"
          >
            <Icon name="play" :size="12" filled />播放
          </button>
        </div>
      </article>
    </div>

    <EmptyState
      v-else
      icon="playlist"
      title="还没有歌单"
      description="用歌单把本地曲目按场景分组。歌单只保存在当前浏览器，不会上传。"
    />
  </section>
</template>

<style scoped>
.create {
  display: flex;
  align-items: center;
  gap: 8px;
}

.create input {
  width: min(240px, 46vw);
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.045);
  outline: none;
  font-size: 12.5px;
}

.create input:focus {
  border-color: var(--accent);
}

.create .btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.error {
  margin-bottom: 12px;
  color: var(--danger);
  font-size: 12px;
}

.notice {
  margin-bottom: 12px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
}

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}

.playlist-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cover-link {
  position: relative;
  display: block;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.cover-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.62);
  color: var(--text);
  font-size: 10.5px;
  backdrop-filter: blur(8px);
}

.card-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding-top: 9px;
}

.name {
  max-width: 100%;
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name:hover {
  text-decoration: underline;
}

.meta {
  font-size: 11px;
  color: var(--muted);
}

.card-body .btn {
  margin-top: 3px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 900px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .create {
    width: 100%;
  }

  .create input {
    flex: 1;
    width: auto;
  }

  .playlist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
