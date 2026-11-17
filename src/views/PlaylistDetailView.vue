<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Track } from '../types'
import { usePlaylistsStore } from '../stores/playlists'
import { usePlayerStore } from '../stores/player'
import { formatDurationLong } from '../utils/format'
import PlaylistCover from '../components/playlist/PlaylistCover.vue'
import TrackList from '../components/track/TrackList.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const route = useRoute()
const router = useRouter()
const playlists = usePlaylistsStore()
const player = usePlayerStore()

const id = computed(() => String(route.params.id ?? ''))
const playlist = computed(() => playlists.playlistById(id.value))
const tracks = computed(() => (playlist.value ? playlists.tracksOf(playlist.value) : []))
const duration = computed(() =>
  tracks.value.reduce((sum, track) => sum + track.duration, 0),
)

const editing = ref(false)
const draft = ref('')
const error = ref('')
const confirmDelete = ref(false)
const deleting = ref(false)
const notice = ref('')

watch(id, () => {
  editing.value = false
  confirmDelete.value = false
  notice.value = ''
  error.value = ''
  deleting.value = false
})

function startEdit(): void {
  if (!playlist.value) return
  draft.value = playlist.value.name
  editing.value = true
  error.value = ''
}

function saveName(): void {
  if (!playlist.value) return
  if (!playlists.renamePlaylist(playlist.value.id, draft.value)) {
    error.value = '歌单名称不能为空'
    return
  }
  editing.value = false
  error.value = ''
  notice.value = '歌单名称已更新'
}

function removePlaylist(): void {
  if (!playlist.value) return
  const name = playlist.value.name
  deleting.value = true
  playlists.deletePlaylist(playlist.value.id)
  void router.push({ name: 'playlists', query: { deleted: name } })
}

function playAll(): void {
  if (!tracks.value.length) return
  player.playTrack(tracks.value[0], tracks.value)
}

function shuffleAll(): void {
  if (!tracks.value.length) return
  player.playShuffled(tracks.value)
}

function removeTrack(track: Track): void {
  if (!playlist.value) return
  if (playlists.removeTrack(playlist.value.id, track.id)) {
    notice.value = `已从歌单移除「${track.title}」`
  }
}
</script>

<template>
  <section v-if="playlist && !deleting" class="page">
    <header class="playlist-head">
      <div class="cover">
        <PlaylistCover :playlist="playlist" />
      </div>

      <div class="head-info">
        <p class="eyebrow">Playlist</p>
        <div v-if="!editing" class="title-row">
          <h1 class="page-title">{{ playlist.name }}</h1>
          <button class="icon-btn" aria-label="重命名歌单" title="重命名" @click="startEdit">
            <Icon name="edit" :size="16" />
          </button>
        </div>
        <form v-else class="rename" @submit.prevent="saveName">
          <input
            v-model="draft"
            type="text"
            maxlength="60"
            aria-label="歌单名称"
            autofocus
          />
          <button type="submit" class="btn sm primary">保存</button>
          <button type="button" class="btn sm" @click="editing = false">取消</button>
        </form>
        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <p class="meta">
          {{ playlist.trackIds.length }} 首 · {{ formatDurationLong(duration) }} · 本地歌单
        </p>

        <div class="actions">
          <button class="btn primary" :disabled="!tracks.length" @click="playAll">
            <Icon name="play" :size="14" filled />播放全部
          </button>
          <button class="btn" :disabled="!tracks.length" @click="shuffleAll">
            <Icon name="shuffle" :size="14" />随机播放
          </button>
          <RouterLink to="/library" class="btn">
            <Icon name="plus" :size="14" />添加歌曲
          </RouterLink>

          <div class="delete-zone">
            <button
              v-if="!confirmDelete"
              class="text-btn danger"
              @click="confirmDelete = true"
            >
              <Icon name="trash" :size="14" />删除歌单
            </button>
            <template v-else>
              <span>确认删除？</span>
              <button class="text-btn danger" @click="removePlaylist">确认</button>
              <button class="text-btn" @click="confirmDelete = false">取消</button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <TrackList
      v-if="tracks.length"
      :tracks="tracks"
      removable
      @remove="removeTrack"
    />

    <EmptyState
      v-else
      icon="playlist"
      title="这个歌单还是空的"
      description="去曲库点歌曲右侧的歌单按钮，把喜欢的曲目加进来。"
    >
      <RouterLink to="/library" class="btn">去曲库添加</RouterLink>
    </EmptyState>
  </section>

  <EmptyState
    v-else-if="!deleting"
    icon="playlist"
    title="歌单不存在"
    description="它可能已经被删除，或链接中的歌单编号不正确。"
  >
    <RouterLink to="/playlists" class="btn">返回我的歌单</RouterLink>
  </EmptyState>
</template>

<style scoped>
.playlist-head {
  display: flex;
  align-items: flex-end;
  gap: clamp(20px, 4vw, 40px);
  margin-bottom: var(--space-6);
}

.cover {
  width: clamp(150px, 22vw, 220px);
  aspect-ratio: 1;
  flex: none;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.head-info {
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.title-row .page-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.title-row .icon-btn {
  flex: none;
}

.rename {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.rename input {
  width: min(360px, 100%);
  height: 36px;
  padding: 0 11px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  outline: none;
  font-size: 18px;
  font-weight: 700;
}

.error {
  margin-top: 5px;
  color: var(--danger);
  font-size: 12px;
}

.meta {
  margin-top: 7px;
  color: var(--muted);
  font-size: 12px;
}

.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: var(--space-5);
}

.actions .btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.delete-zone {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.text-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 12px;
}

.text-btn:hover {
  color: var(--text);
}

.text-btn.danger {
  color: var(--danger);
}

.notice {
  margin-bottom: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
}

@media (max-width: 900px) {
  .playlist-head {
    align-items: center;
    gap: var(--space-4);
  }

  .cover {
    width: 120px;
  }

  .title-row .page-title {
    font-size: 22px;
  }

  .actions {
    gap: 6px;
  }

  .delete-zone {
    width: 100%;
    margin-left: 0;
    padding-left: 0;
    border-left: 0;
  }
}

@media (max-width: 520px) {
  .playlist-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .cover {
    width: 150px;
  }
}
</style>
