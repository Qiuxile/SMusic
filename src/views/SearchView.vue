<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { formatDurationLong } from '../utils/format'
import TrackList from '../components/track/TrackList.vue'
import CoverArt from '../components/ui/CoverArt.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const route = useRoute()
const library = useLibraryStore()

const query = computed(() => String(route.query.q ?? '').trim())
const results = computed(() => library.search(query.value))
const hasResults = computed(
  () =>
    results.value.tracks.length > 0 ||
    results.value.albums.length > 0 ||
    results.value.artists.length > 0,
)
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
            {{ results.artists.length }} 位歌手
          </template>
          <template v-else>按歌曲名、歌手或专辑名检索本地曲库</template>
        </p>
      </div>
    </header>

    <template v-if="query">
      <template v-if="hasResults">
        <div v-if="results.tracks.length" class="section">
          <div class="section-title">歌曲</div>
          <TrackList :tracks="results.tracks" />
        </div>

        <div v-if="results.albums.length" class="section">
          <div class="section-title">专辑</div>
          <div class="grid-cards compact">
            <RouterLink
              v-for="album in results.albums"
              :key="album.key"
              :to="`/album/${album.key}`"
              class="album-card"
            >
              <CoverArt fluid :src="album.cover" :title="album.name" :hue="album.hue" :radius="10" />
              <div class="album-name">{{ album.name }}</div>
              <div class="album-sub">{{ album.artist }}</div>
            </RouterLink>
          </div>
        </div>

        <div v-if="results.artists.length" class="section">
          <div class="section-title">歌手</div>
          <div class="artist-list">
            <RouterLink
              v-for="artist in results.artists"
              :key="artist.key"
              :to="`/artist/${encodeURIComponent(artist.name)}`"
              class="artist-chip"
            >
              <Icon name="users" :size="14" />
              <span>{{ artist.name }}</span>
              <small>{{ artist.tracks.length }} 首</small>
            </RouterLink>
          </div>
        </div>
      </template>

      <EmptyState
        v-else
        icon="search"
        title="没有找到匹配的内容"
        description="试试更短的关键词，或直接浏览全部歌曲。"
      >
        <RouterLink to="/" class="btn">浏览全部歌曲</RouterLink>
      </EmptyState>
    </template>

    <template v-else>
      <div class="quick">
        <RouterLink to="/" class="quick-card">
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
      </div>
      <p class="hint">提示：在顶部搜索框输入关键词，按回车即可检索；输入时结果会实时更新。</p>
    </template>
  </section>
</template>

<style scoped>
.compact {
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 14px;
}

.album-name {
  margin-top: 7px;
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-sub {
  font-size: 11.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.artist-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 13px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12.5px;
  color: var(--text-soft);
  transition: border-color 0.16s ease, color 0.16s ease;
}

.artist-chip:hover {
  border-color: var(--accent);
  color: var(--text);
}

.artist-chip small {
  color: var(--muted);
  font-size: 11px;
}

.quick {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  transition: border-color 0.16s ease, background-color 0.16s ease;
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
  border-radius: 12px;
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
}
</style>
