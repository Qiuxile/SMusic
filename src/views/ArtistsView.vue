<script setup lang="ts">
import { useLibraryStore } from '../stores/library'
import ArtistCard from '../components/library/ArtistCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'

const library = useLibraryStore()
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Artists</p>
        <h1 class="page-title">歌手</h1>
        <p class="page-sub">{{ library.artists.length }} 位歌手 · 依据标签中的艺术家字段</p>
      </div>
      <span class="chip"><Icon name="users" :size="12" />多人合作曲目会分别归入</span>
    </header>

    <div v-if="library.artists.length" class="artist-grid">
      <ArtistCard
        v-for="artist in library.artists"
        :key="artist.key"
        :artist="artist"
      />
    </div>

    <EmptyState
      v-else
      title="还没有歌手信息"
      description="音频标签里缺少艺术家字段时，会归入「未知歌手」。"
    />
  </section>
</template>

<style scoped>
.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
</style>
