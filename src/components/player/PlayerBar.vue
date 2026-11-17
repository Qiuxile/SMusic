<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '../../stores/player'
import { useLibraryStore } from '../../stores/library'
import { formatTime } from '../../utils/format'
import Icon from '../ui/Icon.vue'
import CoverArt from '../ui/CoverArt.vue'
import LyricsPanel from './LyricsPanel.vue'
import QueueDrawer from './QueueDrawer.vue'
import Visualizer from './Visualizer.vue'

const player = usePlayerStore()
const library = useLibraryStore()

const seeking = ref(false)
const seekValue = ref(0)

const total = computed(() => player.duration || player.current?.duration || 0)
const displayedTime = computed(() => (seeking.value ? seekValue.value : player.currentTime))
const progressPercent = computed(() => (total.value > 0 ? (displayedTime.value / total.value) * 100 : 0))
const volumePercent = computed(() => (player.muted ? 0 : player.volume * 100))
const isFavorite = computed(() =>
  player.current ? library.isFavorite(player.current.id) : false,
)
const repeatLabel = computed(() =>
  player.repeat === 'one' ? '单曲循环' : player.repeat === 'all' ? '列表循环' : '顺序播放',
)

watch(
  () => player.currentTime,
  (value) => {
    if (!seeking.value) seekValue.value = value
  },
)

watch(
  () => player.current?.id,
  () => {
    seeking.value = false
    seekValue.value = 0
  },
)

function onSeekInput(event: Event): void {
  seeking.value = true
  seekValue.value = Number((event.target as HTMLInputElement).value)
}

function onSeekCommit(event: Event): void {
  player.seek(Number((event.target as HTMLInputElement).value))
  seeking.value = false
}

function onVolumeInput(event: Event): void {
  player.setVolume(Number((event.target as HTMLInputElement).value) / 100)
}
</script>

<template>
  <div class="player-wrap">
    <LyricsPanel v-if="player.showLyrics" />
    <QueueDrawer v-if="player.showQueue" />
    <Visualizer v-if="player.showVisualizer" />

    <div class="bar">
      <div class="now">
        <CoverArt
          :src="player.current?.cover"
          :title="player.current?.title ?? '未在播放'"
          :hue="player.current?.coverHue"
          :size="54"
          :radius="10"
        />
        <div class="now-text">
          <div class="now-title">{{ player.current?.title ?? '未在播放' }}</div>
          <div class="now-artist">
            {{ player.current?.artist ?? '从曲库选择一首歌开始' }}
          </div>
        </div>
        <button
          class="icon-btn fav"
          :class="{ on: isFavorite }"
          :disabled="!player.current"
          :title="isFavorite ? '取消收藏' : '收藏'"
          @click="player.current && library.toggleFavorite(player.current.id)"
        >
          <Icon name="heart" :size="16" :filled="isFavorite" />
        </button>
      </div>

      <div class="center">
        <div class="controls">
          <button
            class="icon-btn"
            :class="{ active: player.shuffle }"
            title="随机播放"
            @click="player.toggleShuffle()"
          >
            <Icon name="shuffle" :size="16" />
          </button>
          <button class="icon-btn" title="上一首（P）" @click="player.prev()">
            <Icon name="prev" :size="18" />
          </button>
          <button
            class="play-btn"
            :class="{ loading: player.loading }"
            :title="player.playing ? '暂停（空格）' : '播放（空格）'"
            @click="player.toggle()"
          >
            <Icon :name="player.playing ? 'pause' : 'play'" :size="19" filled />
          </button>
          <button class="icon-btn" title="下一首（N）" @click="player.next()">
            <Icon name="next" :size="18" />
          </button>
          <button
            class="icon-btn repeat"
            :class="{ active: player.repeat !== 'off' }"
            :title="repeatLabel"
            @click="player.cycleRepeat()"
          >
            <Icon name="repeat" :size="16" />
            <span v-if="player.repeat === 'one'" class="badge">1</span>
          </button>
        </div>

        <div class="timeline">
          <span class="time">{{ formatTime(displayedTime) }}</span>
          <div class="track-slider">
            <div class="buffer" :style="{ width: `${player.bufferedPercent * 100}%` }" />
            <input
              class="slider"
              type="range"
              min="0"
              :max="total || 0"
              step="0.5"
              :value="displayedTime"
              :style="{ '--p': progressPercent }"
              aria-label="播放进度"
              @input="onSeekInput"
              @change="onSeekCommit"
            />
          </div>
          <span class="time">{{ formatTime(total) }}</span>
        </div>
      </div>

      <div class="right">
        <button
          class="icon-btn"
          :class="{ active: player.showVisualizer }"
          title="音频可视化（V）"
          @click="player.showVisualizer = !player.showVisualizer"
        >
          <Icon name="activity" :size="17" />
        </button>
        <button
          class="icon-btn"
          :class="{ active: player.showLyrics }"
          title="歌词（L）"
          @click="player.showLyrics = !player.showLyrics"
        >
          <Icon name="mic" :size="17" />
        </button>
        <button
          class="icon-btn"
          :class="{ active: player.showQueue }"
          title="播放队列（Q）"
          @click="player.showQueue = !player.showQueue"
        >
          <Icon name="list" :size="17" />
        </button>
        <button
          class="icon-btn"
          :title="player.muted ? '取消静音（M）' : '静音（M）'"
          @click="player.toggleMute()"
        >
          <Icon :name="player.muted || player.volume === 0 ? 'volume-x' : 'volume'" :size="17" />
        </button>
        <input
          class="slider volume"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="volumePercent"
          :style="{ '--p': volumePercent }"
          aria-label="音量"
          @input="onVolumeInput"
        />
      </div>
    </div>

    <p v-if="player.error" class="error">{{ player.error }}</p>
  </div>
</template>

<style scoped>
.player-wrap {
  position: relative;
  grid-column: 1 / -1;
  background: rgba(10, 11, 15, 0.94);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(18px);
  z-index: 30;
}

.bar {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(320px, 1.9fr) minmax(190px, 1fr);
  align-items: center;
  gap: 18px;
  padding: 12px 22px;
}

.now {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.now-text {
  min-width: 0;
}

.now-title {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.now-artist {
  font-size: 11.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav {
  flex: none;
}

.fav.on {
  color: var(--accent);
}

.fav:disabled {
  opacity: 0.35;
  cursor: default;
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.play-btn {
  width: 42px;
  height: 42px;
  margin: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #160c2b;
  background: linear-gradient(135deg, #c4b5fd, var(--accent));
  box-shadow: 0 8px 24px rgba(124, 92, 240, 0.3);
  transition: transform 0.14s ease, filter 0.14s ease;
}

.play-btn:hover {
  filter: brightness(1.08);
}

.play-btn:active {
  transform: scale(0.95);
}

.play-btn.loading {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.7;
  }
}

.repeat {
  position: relative;
}

.repeat .badge {
  position: absolute;
  right: 3px;
  bottom: 2px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--accent);
  color: #150c26;
  font-size: 8px;
  line-height: 11px;
  text-align: center;
  font-weight: 700;
}

.timeline {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
}

.time {
  width: 38px;
  flex: none;
  font-size: 10.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.track-slider {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.buffer {
  position: absolute;
  left: 0;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.track-slider .slider {
  position: relative;
  z-index: 1;
}

.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.volume {
  width: 78px;
  margin-left: 4px;
}

.error {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(248, 113, 113, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  font-size: 11.5px;
  white-space: nowrap;
  pointer-events: none;
}

@media (max-width: 1100px) {
  .bar {
    grid-template-columns: minmax(160px, 1fr) minmax(280px, 1.6fr) auto;
    gap: 12px;
    padding: 10px 16px;
  }

  .volume {
    display: none;
  }
}

@media (max-width: 900px) {
  .bar {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'now controls'
      'timeline timeline';
    gap: 6px 10px;
    padding: 8px 12px 10px;
  }

  .now {
    grid-area: now;
    gap: 9px;
  }

  .now :deep(.cover) {
    width: 42px !important;
    height: 42px !important;
  }

  .center {
    display: contents;
  }

  .controls {
    grid-area: controls;
  }

  .controls .icon-btn:first-child,
  .controls .icon-btn.repeat {
    display: none;
  }

  .play-btn {
    width: 38px;
    height: 38px;
  }

  .timeline {
    grid-area: timeline;
  }

  .right {
    display: none;
  }

  .fav {
    display: none;
  }
}
</style>
