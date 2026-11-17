<script setup lang="ts">
import { computed } from 'vue'
import type { Track } from '../../types'
import { usePlayerStore } from '../../stores/player'
import { useLibraryStore } from '../../stores/library'
import { formatTime } from '../../utils/format'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'

const props = withDefaults(
  defineProps<{
    tracks: Track[]
    showAlbum?: boolean
    showCover?: boolean
    emptyText?: string
  }>(),
  { showAlbum: true, showCover: true, emptyText: '这里还没有歌曲' },
)

const player = usePlayerStore()
const library = useLibraryStore()

const activeId = computed(() => player.current?.id ?? '')

function play(track: Track): void {
  player.playTrack(track, props.tracks)
}
</script>

<template>
  <div v-if="tracks.length" class="tracks">
    <div
      v-for="(track, i) in tracks"
      :key="track.id"
      class="row"
      :class="{ active: track.id === activeId }"
      @dblclick="play(track)"
    >
      <button class="idx" :title="`播放 ${track.title}`" @click="play(track)">
        <span v-if="track.id !== activeId" class="num">{{ i + 1 }}</span>
        <span v-else class="eq" aria-label="正在播放"><i /><i /><i /></span>
        <Icon class="play-icon" name="play" :size="13" filled />
      </button>

      <CoverArt
        v-if="showCover"
        :src="track.cover"
        :title="track.title"
        :hue="track.coverHue"
        :size="40"
        :radius="8"
      />

      <div class="info" @click="play(track)">
        <div class="title-line">
          <span class="title">{{ track.title }}</span>
          <span v-if="track.bitrate && track.bitrate >= 256" class="badge">{{ track.bitrate }}k</span>
        </div>
        <div class="sub">{{ track.artist }}</div>
      </div>

      <RouterLink
        v-if="showAlbum"
        class="album"
        :to="`/album/${track.albumKey}`"
        :title="track.album"
      >
        {{ track.album }}
      </RouterLink>

      <div class="actions">
        <button class="icon-btn" title="下一首播放" @click.stop="player.addToQueue(track, true)">
          <Icon name="next-up" :size="15" />
        </button>
        <button class="icon-btn" title="加入队列" @click.stop="player.addToQueue(track)">
          <Icon name="queue" :size="15" />
        </button>
        <button
          class="icon-btn"
          :class="{ fav: library.isFavorite(track.id) }"
          :title="library.isFavorite(track.id) ? '取消收藏' : '收藏'"
          @click.stop="library.toggleFavorite(track.id)"
        >
          <Icon name="heart" :size="15" :filled="library.isFavorite(track.id)" />
        </button>
      </div>

      <span class="dur">{{ formatTime(track.duration) }}</span>
    </div>
  </div>

  <p v-else class="empty">{{ emptyText }}</p>
</template>

<style scoped>
.tracks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: background-color 0.14s ease;
}

.row:hover {
  background: rgba(255, 255, 255, 0.045);
}

.row.active {
  background: var(--accent-soft);
  border-color: rgba(167, 139, 250, 0.18);
}

.idx {
  position: relative;
  width: 26px;
  height: 26px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.idx .play-icon {
  position: absolute;
  opacity: 0;
  color: var(--text);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.row:hover .num {
  opacity: 0;
}

.row:hover .idx .play-icon {
  opacity: 1;
}

.row.active .idx {
  color: var(--accent);
}

.eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.eq i {
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: var(--accent);
  transform-origin: bottom;
  animation: eq 0.9s ease-in-out infinite;
}

.eq i:nth-child(2) {
  animation-delay: 0.18s;
}

.eq i:nth-child(3) {
  animation-delay: 0.36s;
}

.info {
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.title {
  font-size: 13.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row.active .title {
  color: var(--accent);
  font-weight: 600;
}

.badge {
  flex: none;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--accent-2);
  border: 1px solid rgba(34, 211, 238, 0.35);
  font-variant-numeric: tabular-nums;
}

.sub {
  font-size: 11.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album {
  flex: 0 1 26%;
  min-width: 0;
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.14s ease;
}

.album:hover {
  color: var(--text-soft);
  text-decoration: underline;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.14s ease;
}

.row:hover .actions,
.row:focus-within .actions {
  opacity: 1;
}

.actions .icon-btn {
  width: 28px;
  height: 28px;
}

.icon-btn.fav {
  color: var(--accent);
}

.dur {
  width: 42px;
  flex: none;
  text-align: right;
  font-size: 11.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  padding: 36px 0;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 900px) {
  .row {
    gap: 9px;
    padding: 6px 4px;
  }

  .album {
    display: none;
  }

  .actions {
    opacity: 1;
  }

  .actions .icon-btn:not(.fav) {
    display: none;
  }

  .dur {
    width: 36px;
  }
}
</style>
