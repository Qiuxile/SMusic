<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLibraryStore } from '../stores/library'
import { usePlayerStore } from '../stores/player'
import { formatDurationLong } from '../utils/format'
import { loadJSON, saveJSON } from '../utils/storage'
import {
  TRACK_FILTER_OPTIONS,
  TRACK_SORT_OPTIONS,
  filterTracks,
  sortTracks,
} from '../utils/track-view'
import type { SortDirection, TrackFilter, TrackSortKey } from '../utils/track-view'
import AddToPlaylistMenu from '../components/playlist/AddToPlaylistMenu.vue'
import TrackList from '../components/track/TrackList.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

interface LibraryViewPrefs {
  filter: TrackFilter
  sortKey: TrackSortKey
  direction: SortDirection
  artistFilter: string
  albumFilter: string
}

const STORAGE_KEY = 'mp.library.view.v1'
const library = useLibraryStore()
const player = usePlayerStore()

const saved = loadJSON<Partial<LibraryViewPrefs>>(STORAGE_KEY, {})
const filter = ref<TrackFilter>(
  TRACK_FILTER_OPTIONS.some((option) => option.value === saved.filter)
    ? (saved.filter as TrackFilter)
    : 'all',
)
const sortKey = ref<TrackSortKey>(
  TRACK_SORT_OPTIONS.some((option) => option.value === saved.sortKey)
    ? (saved.sortKey as TrackSortKey)
    : 'default',
)
const direction = ref<SortDirection>(saved.direction === 'desc' ? 'desc' : 'asc')
const artistFilter = ref(typeof saved.artistFilter === 'string' ? saved.artistFilter : '')
const albumFilter = ref(typeof saved.albumFilter === 'string' ? saved.albumFilter : '')

const selectMode = ref(false)
const selectedIds = ref<string[]>([])
const message = ref('')
let messageTimer = 0

const filtered = computed(() => {
  let list = filterTracks(library.tracks, filter.value, library.favoriteSet)
  if (artistFilter.value) {
    list = list.filter((track) => track.artists.includes(artistFilter.value))
  }
  if (albumFilter.value) {
    list = list.filter((track) => track.albumKey === albumFilter.value)
  }
  return sortTracks(list, sortKey.value, direction.value)
})

const filterCounts = computed<Record<TrackFilter, number>>(() => ({
  all: library.tracks.length,
  favorite: library.favoriteSet.size,
  cover: library.tracks.filter((track) => Boolean(track.cover)).length,
  lyrics: library.tracks.filter((track) => Boolean(track.lyrics)).length,
  lossless: filterTracks(library.tracks, 'lossless').length,
}))

const selectedSet = computed(() => new Set(selectedIds.value))
const selectedTracks = computed(() =>
  filtered.value.filter((track) => selectedSet.value.has(track.id)),
)
const allSelected = computed(
  () =>
    filtered.value.length > 0 &&
    filtered.value.every((track) => selectedSet.value.has(track.id)),
)
const favoriteAllSelected = computed(
  () =>
    selectedTracks.value.length > 0 &&
    selectedTracks.value.every((track) => library.isFavorite(track.id)),
)
const hasFilters = computed(
  () => filter.value !== 'all' || Boolean(artistFilter.value) || Boolean(albumFilter.value),
)

watch(
  [filter, sortKey, direction, artistFilter, albumFilter],
  () => {
    saveJSON<LibraryViewPrefs>(STORAGE_KEY, {
      filter: filter.value,
      sortKey: sortKey.value,
      direction: direction.value,
      artistFilter: artistFilter.value,
      albumFilter: albumFilter.value,
    })
  },
)

watch([filter, artistFilter, albumFilter], () => {
  selectedIds.value = []
})

function notify(text: string): void {
  message.value = text
  window.clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => {
    message.value = ''
  }, 2800)
}

function playAll(): void {
  if (!filtered.value.length) return
  player.playTrack(filtered.value[0], filtered.value)
}

function shuffleAll(): void {
  if (!filtered.value.length) return
  player.playShuffled(filtered.value)
}

function toggleSelectMode(): void {
  selectMode.value = !selectMode.value
  selectedIds.value = []
  message.value = ''
}

function toggleSelect(id: string): void {
  selectedIds.value = selectedSet.value.has(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

function selectAll(): void {
  selectedIds.value = filtered.value.map((track) => track.id)
}

function clearSelection(): void {
  selectedIds.value = []
}

function batchQueue(): void {
  if (!selectedTracks.value.length) return
  const added = player.enqueueTracks(selectedTracks.value)
  notify(added ? `已加入队列 ${added} 首` : '所选歌曲已在队列中')
}

function batchFavorite(): void {
  if (!selectedTracks.value.length) return
  const favorite = !favoriteAllSelected.value
  const count = library.setFavorites(
    selectedTracks.value.map((track) => track.id),
    favorite,
  )
  notify(favorite ? `已收藏 ${count} 首` : `已取消收藏 ${count} 首`)
}

function resetFilters(): void {
  filter.value = 'all'
  artistFilter.value = ''
  albumFilter.value = ''
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Library</p>
        <h1 class="page-title">全部歌曲</h1>
        <p class="page-sub">
          {{ library.tracks.length }} 首 · {{ formatDurationLong(library.totalDuration) }} ·
          排序与筛选会保存在本机
        </p>
      </div>
      <div class="head-actions">
        <button class="btn" @click="toggleSelectMode">
          <Icon :name="selectMode ? 'x' : 'check'" :size="14" />
          {{ selectMode ? '退出批量' : '批量管理' }}
        </button>
        <button class="btn primary" :disabled="!filtered.length" @click="playAll">
          <Icon name="play" :size="14" filled />播放全部
        </button>
        <button class="btn" :disabled="!filtered.length" @click="shuffleAll">
          <Icon name="shuffle" :size="14" />随机播放
        </button>
      </div>
    </header>

    <details v-if="library.warnings.length" class="warnings">
      <summary>曲库提示（{{ library.warnings.length }}）</summary>
      <ul>
        <li v-for="warning in library.warnings" :key="warning">{{ warning }}</li>
      </ul>
    </details>

    <div class="toolbar">
      <div class="filters" role="group" aria-label="筛选曲目">
        <button
          v-for="option in TRACK_FILTER_OPTIONS"
          :key="option.value"
          class="filter-chip"
          :class="{ active: filter === option.value }"
          :aria-pressed="filter === option.value"
          @click="filter = option.value"
        >
          {{ option.label }}
          <small>{{ filterCounts[option.value] }}</small>
        </button>
      </div>

      <div class="sort-row">
        <label class="select-field">
          <span>排序</span>
          <select v-model="sortKey">
            <option v-for="option in TRACK_SORT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <button
          class="icon-btn direction"
          :aria-label="direction === 'asc' ? '切换为降序' : '切换为升序'"
          :title="direction === 'asc' ? '升序' : '降序'"
          @click="direction = direction === 'asc' ? 'desc' : 'asc'"
        >
          <Icon :name="direction === 'asc' ? 'arrow-up' : 'arrow-down'" :size="15" />
        </button>

        <label class="select-field">
          <span>歌手</span>
          <select v-model="artistFilter">
            <option value="">全部歌手</option>
            <option v-for="artist in library.artists" :key="artist.key" :value="artist.name">
              {{ artist.name }}
            </option>
          </select>
        </label>

        <label class="select-field">
          <span>专辑</span>
          <select v-model="albumFilter">
            <option value="">全部专辑</option>
            <option v-for="album in library.albums" :key="album.key" :value="album.key">
              {{ album.name }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="result-row">
      <span>
        {{ filtered.length }} 首
        <template v-if="hasFilters"> · 已筛选</template>
      </span>
      <button v-if="hasFilters" class="text-btn" @click="resetFilters">重置筛选</button>
    </div>

    <div v-if="selectMode" class="batch-bar">
      <button class="text-btn" @click="allSelected ? clearSelection() : selectAll()">
        <Icon :name="allSelected ? 'x' : 'check'" :size="14" />
        {{ allSelected ? '取消全选' : '全选' }}
      </button>
      <span class="batch-count">已选 {{ selectedIds.length }} 首</span>
      <div class="batch-actions">
        <AddToPlaylistMenu
          variant="button"
          :track-ids="selectedIds"
          label="添加到歌单"
        />
        <button class="btn sm" :disabled="!selectedIds.length" @click="batchFavorite">
          <Icon name="heart" :size="13" :filled="favoriteAllSelected" />
          {{ favoriteAllSelected ? '取消收藏' : '收藏' }}
        </button>
        <button class="btn sm" :disabled="!selectedIds.length" @click="batchQueue">
          <Icon name="queue" :size="13" />加入队列
        </button>
        <button class="text-btn" @click="clearSelection">清空选择</button>
      </div>
    </div>

    <p v-if="message" class="message" role="status">{{ message }}</p>

    <TrackList
      v-if="filtered.length"
      :tracks="filtered"
      :selectable="selectMode"
      :selected-ids="selectedIds"
      @toggle-select="toggleSelect"
    />

    <EmptyState
      v-else
      icon="search"
      title="没有符合条件的歌曲"
      description="当前筛选组合没有结果，可以重置筛选或换一个条件。"
    >
      <button class="btn" @click="resetFilters">重置筛选</button>
    </EmptyState>
  </section>
</template>

<style scoped>
.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.warnings {
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: var(--radius-md);
  background: rgba(251, 191, 36, 0.06);
  color: var(--warning);
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

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 12px;
  transition: color var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    background-color var(--motion-fast) var(--ease-out);
}

.filter-chip:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.filter-chip.active {
  color: var(--text);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.filter-chip small {
  color: var(--muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.select-field {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 11px;
  background: rgba(255, 255, 255, 0.03);
}

.select-field select {
  max-width: 130px;
  border: 0;
  outline: none;
  color: var(--text-soft);
  background: transparent;
  font-size: 11.5px;
}

.select-field option {
  background: var(--surface-2);
  color: var(--text);
}

.direction {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 10px 2px 8px;
  font-size: 11.5px;
  color: var(--muted);
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

.batch-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.batch-count {
  font-size: 12px;
  color: var(--text-soft);
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: auto;
}

.message {
  margin-bottom: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
}

@media (max-width: 1100px) {
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .sort-row {
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .head-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar {
    gap: 10px;
  }

  .select-field select {
    max-width: 100px;
  }

  .batch-bar {
    align-items: flex-start;
  }

  .batch-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
