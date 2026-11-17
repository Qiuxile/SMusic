<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '../../stores/library'
import { formatDurationLong } from '../../utils/format'
import Icon from '../ui/Icon.vue'

const library = useLibraryStore()
const route = useRoute()
const router = useRouter()

const query = ref(String(route.query.q ?? ''))

watch(
  () => route.query.q,
  (value) => {
    if (route.name === 'search') query.value = String(value ?? '')
  },
)

function submit(): void {
  const keyword = query.value.trim()
  void router.push({ name: 'search', query: keyword ? { q: keyword } : {} })
}

function liveSearch(): void {
  if (route.name !== 'search') return
  const keyword = query.value.trim()
  void router.replace({ name: 'search', query: keyword ? { q: keyword } : {} })
}

function clear(): void {
  query.value = ''
  if (route.name === 'search') void router.replace({ name: 'search', query: {} })
}

const mobileNav = [
  { to: '/', label: '全部', icon: 'music' },
  { to: '/albums', label: '专辑', icon: 'disc' },
  { to: '/artists', label: '歌手', icon: 'users' },
  { to: '/favorites', label: '收藏', icon: 'heart' },
  { to: '/recent', label: '最近', icon: 'clock' },
]
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="mobile-brand">
      <span class="logo"><Icon name="music" :size="16" /></span>
      <strong>SMusic</strong>
    </RouterLink>

    <form class="search" role="search" @submit.prevent="submit">
      <Icon name="search" :size="16" />
      <input
        id="global-search"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="搜索歌曲、专辑或歌手（按 / 聚焦）"
        aria-label="搜索歌曲、专辑或歌手"
        @input="liveSearch"
      />
      <button v-if="query" type="button" class="icon-btn clear" aria-label="清空搜索" @click="clear">
        <Icon name="x" :size="14" />
      </button>
    </form>

    <div class="meta">
      <span class="chip">
        {{ library.tracks.length }} 首 · {{ formatDurationLong(library.totalDuration) }}
      </span>
    </div>

    <nav class="mobile-nav" aria-label="主导航">
      <RouterLink v-for="item in mobileNav" :key="item.to" :to="item.to" class="m-item">
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
  background: rgba(10, 11, 15, 0.72);
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
  color: #150c26;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}

.search {
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
  border-color: rgba(167, 139, 250, 0.6);
  background: rgba(167, 139, 250, 0.08);
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
    gap: 6px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .m-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .m-item.router-link-active {
    color: var(--text);
    background: var(--accent-soft);
  }
}
</style>
