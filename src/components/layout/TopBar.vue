<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../../stores/library'
import { usePlayerStore } from '../../stores/player'
import { usePlaylistsStore } from '../../stores/playlists'
import type { Track } from '../../types'
import { formatDurationLong } from '../../utils/format'
import Icon from '../ui/Icon.vue'

type SuggestionKind = 'history' | 'track' | 'album' | 'artist' | 'playlist' | 'action'

interface Suggestion {
  kind: SuggestionKind
  key: string
  label: string
  sub?: string
  query?: string
  to?: string
  track?: Track
}

const library = useLibraryStore()
const player = usePlayerStore()
const playlists = usePlaylistsStore()
const route = useRoute()
const router = useRouter()

const query = ref(String(route.query.q ?? ''))
const form = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const showSuggestions = ref(false)
const activeIndex = ref(-1)

const keyword = computed(() => query.value.trim())

const suggestions = computed<Suggestion[]>(() => {
  if (!keyword.value) {
    const history = library.searchHistory.slice(0, 6).map((item) => ({
      kind: 'history' as const,
      key: `history-${item}`,
      label: item,
      sub: '最近搜索',
      query: item,
    }))
    return [
      ...history,
      {
        kind: 'action',
        key: 'action-library',
        label: '浏览全部歌曲',
        sub: `${library.tracks.length} 首本地曲目`,
        to: '/library',
      },
    ]
  }

  const results = library.search(keyword.value)
  const playlistHits = playlists.searchPlaylists(keyword.value)
  const items: Suggestion[] = []

  for (const track of results.tracks.slice(0, 4)) {
    items.push({
      kind: 'track',
      key: `track-${track.id}`,
      label: track.title,
      sub: `${track.artist} · ${track.album}`,
      track,
    })
  }
  for (const album of results.albums.slice(0, 2)) {
    items.push({
      kind: 'album',
      key: `album-${album.key}`,
      label: album.name,
      sub: `${album.artist} · 专辑`,
      to: `/album/${album.key}`,
    })
  }
  for (const artist of results.artists.slice(0, 2)) {
    items.push({
      kind: 'artist',
      key: `artist-${artist.key}`,
      label: artist.name,
      sub: `${artist.tracks.length} 首 · 歌手`,
      to: `/artist/${encodeURIComponent(artist.name)}`,
    })
  }
  for (const playlist of playlistHits.slice(0, 2)) {
    items.push({
      kind: 'playlist',
      key: `playlist-${playlist.id}`,
      label: playlist.name,
      sub: `${playlist.trackIds.length} 首 · 歌单`,
      to: `/playlist/${playlist.id}`,
    })
  }
  items.push({
    kind: 'action',
    key: 'action-search',
    label: `查看“${keyword.value}”的全部结果`,
    sub: `${results.tracks.length} 首歌曲 · ${results.albums.length} 张专辑 · ${results.artists.length} 位歌手`,
    query: keyword.value,
  })

  return items.slice(0, 10)
})

const activeDescendant = computed(() =>
  activeIndex.value >= 0 ? `search-option-${activeIndex.value}` : undefined,
)

watch(
  () => route.query.q,
  (value) => {
    if (route.name === 'search') query.value = String(value ?? '')
  },
)

watch(
  () => route.name,
  (name) => {
    if (name !== 'search') closeSuggestions()
  },
)

function closeSuggestions(): void {
  showSuggestions.value = false
  activeIndex.value = -1
}

function submit(): void {
  const text = keyword.value
  if (text) library.pushSearch(text)
  closeSuggestions()
  void router.push({ name: 'search', query: text ? { q: text } : {} })
}

function liveSearch(): void {
  if (route.name !== 'search') return
  void router.replace({ name: 'search', query: keyword.value ? { q: keyword.value } : {} })
}

function clear(): void {
  query.value = ''
  activeIndex.value = -1
  if (route.name === 'search') void router.replace({ name: 'search', query: {} })
  void nextTick(() => input.value?.focus())
}

function onInput(): void {
  showSuggestions.value = true
  activeIndex.value = -1
  liveSearch()
}

function activate(suggestion: Suggestion): void {
  closeSuggestions()
  if (suggestion.kind === 'track' && suggestion.track) {
    if (keyword.value) library.pushSearch(keyword.value)
    player.playTrack(suggestion.track, library.tracks)
    input.value?.blur()
    return
  }
  if (suggestion.kind === 'history' && suggestion.query) {
    query.value = suggestion.query
    library.pushSearch(suggestion.query)
    void router.push({ name: 'search', query: { q: suggestion.query } })
    input.value?.blur()
    return
  }
  if (suggestion.kind === 'action' && suggestion.query) {
    query.value = suggestion.query
    library.pushSearch(suggestion.query)
    void router.push({ name: 'search', query: { q: suggestion.query } })
    input.value?.blur()
    return
  }
  if (suggestion.to) {
    if (keyword.value) library.pushSearch(keyword.value)
    void router.push(suggestion.to)
    input.value?.blur()
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    showSuggestions.value = true
    if (!suggestions.value.length) return
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    showSuggestions.value = true
    if (!suggestions.value.length) return
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
    return
  }
  if (event.key === 'Escape') {
    closeSuggestions()
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (showSuggestions.value && activeIndex.value >= 0) {
      const suggestion = suggestions.value[activeIndex.value]
      if (suggestion) activate(suggestion)
      return
    }
    submit()
  }
}

function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next && form.value?.contains(next)) return
  closeSuggestions()
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target as Node | null
  if (target && form.value?.contains(target)) return
  closeSuggestions()
}

function typeLabel(kind: SuggestionKind): string {
  return (
    {
      history: '历史',
      track: '歌曲',
      album: '专辑',
      artist: '歌手',
      playlist: '歌单',
      action: '搜索',
    } as const
  )[kind]
}

function iconOf(suggestion: Suggestion): string {
  return (
    {
      history: 'clock',
      track: 'music',
      album: 'disc',
      artist: 'users',
      playlist: 'playlist',
      action: 'search',
    } as const
  )[suggestion.kind]
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))

const mobileNav = [
  { to: '/', label: '首页', icon: 'home' },
  { to: '/library', label: '全部', icon: 'music' },
  { to: '/albums', label: '专辑', icon: 'disc' },
  { to: '/artists', label: '歌手', icon: 'users' },
  { to: '/playlists', label: '歌单', icon: 'playlist' },
  { to: '/favorites', label: '收藏', icon: 'heart' },
  { to: '/recent', label: '最近', icon: 'clock' },
]

function mobileActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  if (to === '/albums') return route.path.startsWith('/album')
  if (to === '/artists') return route.path.startsWith('/artist')
  if (to === '/playlists') return route.path.startsWith('/playlist')
  return route.path === to
}
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="mobile-brand">
      <span class="logo"><Icon name="music" :size="16" /></span>
      <strong>SMusic</strong>
    </RouterLink>

    <form
      ref="form"
      class="search"
      role="search"
      @submit.prevent="submit"
      @focusout="onFocusOut"
    >
      <Icon name="search" :size="16" />
      <input
        id="global-search"
        ref="input"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="搜索歌曲、专辑或歌手（按 / 聚焦）"
        aria-label="搜索歌曲、专辑或歌手"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        :aria-expanded="showSuggestions"
        :aria-activedescendant="activeDescendant"
        @focus="showSuggestions = true"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button v-if="query" type="button" class="icon-btn clear" aria-label="清空搜索" @click="clear">
        <Icon name="x" :size="14" />
      </button>

      <div
        v-if="showSuggestions"
        id="search-suggestions"
        class="suggestions"
        role="listbox"
        aria-label="搜索建议"
      >
        <div class="suggestions-head">
          <span>{{ keyword ? '搜索建议' : '最近搜索' }}</span>
          <button
            v-if="!keyword && library.searchHistory.length"
            type="button"
            class="head-action"
            @click="library.clearSearchHistory()"
          >
            清除历史
          </button>
        </div>

        <button
          v-for="(suggestion, index) in suggestions"
          :id="`search-option-${index}`"
          :key="suggestion.key"
          type="button"
          class="suggestion"
          :class="{ active: index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="activate(suggestion)"
        >
          <span class="s-icon"><Icon :name="iconOf(suggestion)" :size="14" /></span>
          <span class="s-text">
            <span class="s-label">{{ suggestion.label }}</span>
            <span v-if="suggestion.sub" class="s-sub">{{ suggestion.sub }}</span>
          </span>
          <span class="s-type">{{ typeLabel(suggestion.kind) }}</span>
        </button>

        <p v-if="keyword && suggestions.length === 1" class="suggestions-empty">
          没有匹配的歌曲、专辑或歌手，按回车查看完整搜索。
        </p>
      </div>
    </form>

    <div class="meta">
      <span class="chip">
        {{ library.tracks.length }} 首 · {{ formatDurationLong(library.totalDuration) }}
      </span>
    </div>

    <nav class="mobile-nav" aria-label="主导航">
      <RouterLink
        v-for="item in mobileNav"
        :key="item.to"
        :to="item.to"
        class="m-item"
        :class="{ active: mobileActive(item.to) }"
      >
        <Icon :name="item.icon" :size="16" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--border);
  background: rgba(18, 18, 18, 0.82);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.mobile-brand {
  display: none;
  align-items: center;
  gap: 8px;
}

.mobile-brand .logo {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--accent-contrast);
  background: var(--accent);
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(460px, 100%);
  height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.045);
  color: var(--muted);
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.search:focus-within {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text-soft);
}

.search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 13px;
}

.search input::placeholder {
  color: var(--muted);
}

.search input::-webkit-search-cancel-button {
  display: none;
}

.clear {
  width: 24px;
  height: 24px;
}

.suggestions {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  right: 0;
  z-index: 40;
  max-height: min(440px, 70vh);
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: #1b1b1b;
  box-shadow: var(--shadow);
}

.suggestions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.head-action {
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0;
  text-transform: none;
}

.head-action:hover {
  color: var(--text);
}

.suggestion {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  text-align: left;
}

.suggestion:hover,
.suggestion.active {
  background: var(--surface-hover);
}

.s-icon {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  color: var(--accent);
  background: var(--accent-soft);
}

.s-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.s-label {
  font-size: 12.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-sub {
  font-size: 10.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-type {
  flex: none;
  color: var(--muted);
  font-size: 10px;
}

.suggestions-empty {
  padding: 14px 8px;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.7;
}

.meta {
  margin-left: auto;
}

.mobile-nav {
  display: none;
}

@media (max-width: 900px) {
  .topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 14px;
  }

  .mobile-brand {
    display: flex;
  }

  .search {
    order: 3;
    width: 100%;
    height: 36px;
  }

  .meta {
    margin-left: auto;
  }

  .meta .chip {
    height: 20px;
    font-size: 10px;
  }

  .mobile-nav {
    order: 4;
    display: flex;
    gap: 4px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .m-item {
    display: inline-flex;
    flex: 1 1 0;
    min-width: 0;
    justify-content: center;
    align-items: center;
    gap: 4px;
    padding: 6px 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--muted);
    font-size: 11.5px;
    white-space: nowrap;
  }

  .m-item.active {
    color: var(--text);
    background: var(--accent-soft);
  }

  @media (max-width: 480px) {
    .mobile-nav {
      gap: 6px;
    }

    .m-item {
      flex: 0 0 auto;
      padding: 6px 10px;
    }
  }

  .suggestions {
    max-height: 60vh;
  }
}
</style>
