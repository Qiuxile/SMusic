<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '../../stores/library'
import { formatDurationLong } from '../../utils/format'
import Icon from '../ui/Icon.vue'

const library = useLibraryStore()
const route = useRoute()

const items = computed(() => [
  {
    to: '/',
    label: '全部歌曲',
    icon: 'music',
    count: library.tracks.length,
    match: (path: string) => path === '/',
  },
  {
    to: '/albums',
    label: '专辑',
    icon: 'disc',
    count: library.albums.length,
    match: (path: string) => path.startsWith('/album'),
  },
  {
    to: '/artists',
    label: '歌手',
    icon: 'users',
    count: library.artists.length,
    match: (path: string) => path.startsWith('/artist'),
  },
  {
    to: '/favorites',
    label: '我的收藏',
    icon: 'heart',
    count: library.favorites.length,
    match: (path: string) => path === '/favorites',
  },
  {
    to: '/recent',
    label: '最近播放',
    icon: 'clock',
    count: library.recent.length,
    match: (path: string) => path === '/recent',
  },
])
</script>

<template>
  <aside class="sidebar">
    <RouterLink to="/" class="brand">
      <span class="logo"><Icon name="music" :size="19" /></span>
      <span class="brand-text">
        <strong>SMusic</strong>
        <small>LOCAL LIBRARY</small>
      </span>
    </RouterLink>

    <nav class="nav">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: item.match(route.path) }"
      >
        <Icon :name="item.icon" :size="18" />
        <span class="label">{{ item.label }}</span>
        <span class="count">{{ item.count }}</span>
      </RouterLink>
    </nav>

    <div class="foot">
      <div class="stat">
        <span class="value">{{ library.tracks.length }}</span>
        <span class="key">首歌曲</span>
      </div>
      <div class="stat">
        <span class="value">{{ formatDurationLong(library.totalDuration) }}</span>
        <span class="key">总时长</span>
      </div>
      <p class="tip">
        曲目信息与封面直接读取音频标签<br />
        <kbd>/</kbd> 搜索 · <kbd>空格</kbd> 播放 · <kbd>L</kbd> 歌词
      </p>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 14px 18px;
  height: 100%;
  min-height: 0;
  background: linear-gradient(180deg, rgba(20, 22, 31, 0.92), rgba(10, 11, 15, 0.96));
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 8px;
}

.logo {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #150c26;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 8px 24px rgba(124, 92, 240, 0.35);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text strong {
  font-size: 15px;
  letter-spacing: 0.02em;
}

.brand-text small {
  font-size: 9.5px;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  border-radius: 10px;
  color: var(--muted);
  font-size: 13.5px;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.nav-item:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: var(--text);
  background: var(--accent-soft);
}

.nav-item.active .label {
  font-weight: 600;
}

.nav-item.active :deep(svg) {
  color: var(--accent);
}

.label {
  flex: 1;
}

.count {
  font-size: 11.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.foot {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 14px 10px 4px;
  border-top: 1px solid var(--border);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.key {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.tip {
  width: 100%;
  font-size: 11px;
  line-height: 1.8;
  color: var(--muted);
}

kbd {
  display: inline-block;
  min-width: 17px;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid var(--border-strong);
  background: rgba(255, 255, 255, 0.05);
  font-family: inherit;
  font-size: 10px;
  text-align: center;
  color: var(--text-soft);
}
</style>
