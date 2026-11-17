<script setup lang="ts">
import { useLibraryStore } from '../stores/library'
import { formatDurationLong } from '../utils/format'
import AlbumCard from '../components/library/AlbumCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Albums</p>
        <h1 class="page-title">专辑</h1>
        <p class="page-sub">
          {{ library.albums.length }} 张专辑 · {{ formatDurationLong(library.totalDuration) }}
        </p>
      </div>
      <span class="chip"><Icon name="disc" :size="12" />按音频标签自动归集</span>
    </header>

    <div v-if="library.albums.length" class="grid-cards">
      <AlbumCard v-for="album in library.albums" :key="album.key" :album="album" />
    </div>

    <EmptyState
      v-else
      title="还没有专辑"
      description="把音频放入 music/ 目录后重新构建，专辑会根据标签自动生成。"
    />
  </section>
</template>
