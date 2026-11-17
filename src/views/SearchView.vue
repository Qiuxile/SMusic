<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { usePlaylistsStore } from '../stores/playlists'
import { formatDurationLong } from '../utils/format'
import AlbumCard from '../components/library/AlbumCard.vue'
import ArtistCard from '../components/library/ArtistCard.vue'
import PlaylistCover from '../components/playlist/PlaylistCover.vue'
import TrackList from '../components/track/TrackList.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

type ResultTab = 'all' | 'tracks' | 'albums' | 'artists' | 'playlists'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const playlists = usePlaylistsStore()

const query = computed(() => String(route.query.q ?? '').trim())
const results = computed(() => library.search(query.value))
const playlistResults = computed(() => playlists.searchPlaylists(query.value))
const total = computed(
  () =>
    results.value.tracks.length +
    results.value.albums.length +
    results.value.artists.length +
    playlistResults.value.length,
)
const hasResults = computed(() => total.value > 0)
const activeTab = ref<ResultTab>('all')

const tabs = computed(() => [
  { key: 'all' as const, label: '全部', count: total.value },
  { key: 'tracks' as const, label: '歌曲', count: results.value.tracks.length },
  { key: 'albums' as const, label: '专辑', count: results.value.albums.length },
  { key: 'artists' as const, label: '歌手', count: results.value.artists.length },
  { key: 'playlists' as const, label: '歌单', count: playlistResults.value.length },
])

let historyTimer = 0

watch(
  query,
  (value) => {
    activeTab.value = 'all'
    window.clearTimeout(historyTimer)
    if (!value) return
    historyTimer = window.setTimeout(() => library.pushSearch(value), 900)
  },
  { immediate: true },
)

onBeforeUnmount(() => window.clearTimeout(historyTimer))

function applyHistory(value: string): void {
  void router.push({ name: 'search', query: { q: value } })
}

function removeHistory(value: string): void {
  library.removeSearch(value)
}

function clearQuery(): void {
  void router.replace({ name: 'search', query: {} })
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Search</p>
        <h1 class="page-title">
          <template v-if="query">“{{ query }}” 的搜索结果</template>
          <template v-else>搜索</template>
        </h1>
        <p class="page-sub">
          <template v-if="query">
            {{ results.tracks.length }} 首歌曲 · {{ results.albums.length }} 张专辑 ·
            {{ results.artists.length }} 位歌手 · {{ playlistResults.length }} 个歌单
          </template>
          <template v-else>按歌曲名、歌手、专辑或歌单名检索本地曲库</template>
        </p>
      </div>
      <button v-if="query" class="btn" @click="clearQuery">
        <Icon name="x" :size="14" />清空搜索
      </button>
    </header>

    <template v-if="query">
      <template v-if="hasResults">
        <div class="result-tabs" role="group" aria-label="搜索结果分类">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="result-tab"
            :class="{ active: activeTab === tab.key }"
            :aria-pressed="activeTab === tab.key"
            :disabled="tab.count === 0"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}<span>{{ tab.count }}</span>
          </button>
        </div>

        <div v-if="(activeTab === 'all' || activeTab === 'tracks') && results.tracks.length" class="section">
          <div class="section-title">歌曲</div>
          <TrackList :tracks="results.tracks" />
        </div>

        <div v-if="(activeTab === 'all' || activeTab === 'albums') && results.albums.length" class="section">
          <div class="section-title">专辑</div>
          <div class="grid-cards compact">
            <AlbumCard
              v-for="album in results.albums"
              :key="album.key"
              :album="album"
              compact
            />
          </div>
        </div>

        <div v-if="(activeTab === 'all' || activeTab === 'artists') && results.artists.length" class="section">
          <div class="section-title">歌手</div>
          <div class="artist-grid">
            <ArtistCard
              v-for="artist in results.artists"
              :key="artist.key"
              :artist="artist"
            />
          </div>
        </div>

        <div v-if="(activeTab === 'all' || activeTab === 'playlists') && playlistResults.length" class="section">
          <div class="section-title">歌单</div>
          <div class="playlist-results">
            <RouterLink
              v-for="playlist in playlistResults"
              :key="playlist.id"
              :to="`/playlist/${playlist.id}`"
              class="playlist-result"
            >
              <div class="pl-cover"><PlaylistCover :playlist="playlist" /></div>
              <div class="pl-info">
                <strong>{{ playlist.name }}</strong>
                <small>{{ playlist.trackIds.length }} 首 · 本地歌单</small>
              </div>
              <Icon name="arrow-right" :size="14" class="pl-arrow" />
            </RouterLink>
          </div>
        </div>
      </template>

      <EmptyState
        v-else
        icon="search"
        title="没有找到匹配的内容"
        description="试试更短的关键词，或检查一下歌手、专辑名称的拼写。"
      >
        <RouterLink to="/library" class="btn">浏览全部歌曲</RouterLink>
      </EmptyState>
    </template>

    <template v-else>
      <section v-if="library.searchHistory.length" class="section history-section">
        <div class="section-title">
          <span>最近搜索</span>
          <button class="text-btn" @click="library.clearSearchHistory()">清除全部</button>
        </div>
        <div class="history-row">
          <span v-for="item in library.searchHistory" :key="item" class="history-chip">
            <button class="history-main" @click="applyHistory(item)">
              <Icon name="clock" :size="13" />{{ item }}
            </button>
            <button
              class="history-remove"
              :aria-label="`删除搜索记录 ${item}`"
              @click="removeHistory(item)"
            >
              <Icon name="x" :size="12" />
            </button>
          </span>
        </div>
      </section>

      <div class="quick">
        <RouterLink to="/library" class="quick-card">
          <span class="qi"><Icon name="music" :size="20" /></span>
          <div>
            <strong>全部歌曲</strong>
            <small>{{ library.tracks.length }} 首 · {{ formatDurationLong(library.totalDuration) }}</small>
          </div>
        </RouterLink>
        <RouterLink to="/albums" class="quick-card">
          <span class="qi"><Icon name="disc" :size="20" /></span>
          <div>
            <strong>专辑</strong>
            <small>{{ library.albums.length }} 张</small>
          </div>
        </RouterLink>
        <RouterLink to="/artists" class="quick-card">
          <span class="qi"><Icon name="users" :size="20" /></span>
          <div>
            <strong>歌手</strong>
            <small>{{ library.artists.length }} 位</small>
          </div>
        </RouterLink>
        <RouterLink to="/playlists" class="quick-card">
          <span class="qi"><Icon name="playlist" :size="20" /></span>
          <div>
            <strong>歌单</strong>
            <small>{{ playlists.playlists.length }} 个</small>
          </div>
        </RouterLink>
      </div>
      <p class="hint">
        提示：输入时顶部会显示搜索建议，支持 ↑ ↓ 选择、回车打开；拼写错误也会尝试匹配。
      </p>
    </template>
  </section>
</template>

<style scoped>
.result-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.result-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 12px;
}

.result-tab:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--border-strong);
}

.result-tab.active {
  color: var(--text);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.result-tab:disabled {
  opacity: 0.35;
  cursor: default;
}

.result-tab span {
  font-size: 10px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.compact {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.playlist-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
}

.playlist-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  transition: background-color var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out);
}

.playlist-result:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.pl-cover {
  width: 54px;
  height: 54px;
  flex: none;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.pl-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pl-info strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-info small {
  font-size: 11px;
  color: var(--muted);
}

.pl-arrow {
  margin-left: auto;
  color: var(--muted);
}

.history-section {
  margin-top: 0;
}

.text-btn {
  color: var(--muted);
  font-size: 12px;
}

.text-btn:hover {
  color: var(--text);
}

.history-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  overflow: hidden;
}

.history-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  color: var(--text-soft);
  font-size: 12px;
}

.history-main:hover {
  color: var(--text);
}

.history-remove {
  width: 26px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--muted);
  border-left: 1px solid var(--border);
}

.history-remove:hover {
  color: var(--danger);
}

.quick {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  transition: border-color var(--motion-fast) var(--ease-out),
    background-color var(--motion-fast) var(--ease-out);
}

.quick-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-2);
}

.qi {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  color: var(--accent);
  background: var(--accent-soft);
  flex: none;
}

.quick-card div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.quick-card strong {
  font-size: 13.5px;
}

.quick-card small {
  font-size: 11.5px;
  color: var(--muted);
}

.hint {
  margin-top: 16px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
}
</style>
