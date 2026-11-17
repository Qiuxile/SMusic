<script setup lang="ts">
import { usePlayerStore } from '../../stores/player'
import { formatTime } from '../../utils/format'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'

const player = usePlayerStore()
</script>

<template>
  <section class="panel queue" aria-label="播放队列">
    <header>
      <div class="head-text">
        <p class="eyebrow">Queue</p>
        <h3>播放队列 <span class="count">{{ player.queue.length }} 首</span></h3>
      </div>
      <div class="head-actions">
        <button class="icon-btn" title="清空队列" @click="player.clearQueue()">
          <Icon name="trash" :size="15" />
        </button>
        <button class="icon-btn" title="关闭" @click="player.showQueue = false">
          <Icon name="x" :size="16" />
        </button>
      </div>
    </header>

    <div class="body">
      <p v-if="!player.queue.length" class="empty">队列是空的，从曲库添加歌曲吧。</p>
      <div
        v-for="(track, index) in player.queue"
        :key="track.id"
        class="row"
        :class="{ active: index === player.index }"
        @click="player.playAt(index)"
      >
        <span class="idx">
          <span v-if="index !== player.index">{{ index + 1 }}</span>
          <Icon v-else name="play" :size="10" filled />
        </span>
        <CoverArt
          :src="track.cover"
          :title="track.title"
          :hue="track.coverHue"
          :size="34"
          :radius="7"
        />
        <div class="info">
          <div class="title">{{ track.title }}</div>
          <div class="sub">{{ track.artist }}</div>
        </div>
        <span class="dur">{{ formatTime(track.duration) }}</span>
        <button
          class="icon-btn remove"
          title="从队列移除"
          @click.stop="player.removeFromQueue(track.id)"
        >
          <Icon name="x" :size="14" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  position: absolute;
  right: 14px;
  bottom: calc(100% + 10px);
  width: min(360px, calc(100vw - 28px));
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: rgba(18, 20, 28, 0.94);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px);
  overflow: hidden;
  animation: rise 0.18s ease;
  z-index: 40;
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid var(--border);
}

h3 {
  font-size: 15px;
  font-weight: 600;
}

.count {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
}

.head-actions {
  display: flex;
  gap: 2px;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 9px;
  cursor: pointer;
}

.row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.row.active {
  background: var(--accent-soft);
}

.idx {
  width: 18px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.row.active .idx {
  color: var(--accent);
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row.active .title {
  color: var(--accent);
  font-weight: 600;
}

.sub {
  font-size: 11px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dur {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.remove {
  width: 26px;
  height: 26px;
  opacity: 0;
}

.row:hover .remove {
  opacity: 1;
}

.empty {
  padding: 30px 16px;
  text-align: center;
  font-size: 12.5px;
  color: var(--muted);
}

@media (max-width: 900px) {
  .panel {
    right: 0;
    left: 0;
    width: auto;
    border-radius: 16px 16px 0 0;
  }
}
</style>
