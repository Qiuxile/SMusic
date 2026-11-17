<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLibraryStore } from '../../stores/library'
import { usePlayerStore } from '../../stores/player'
import { downloadText, downloadTrack, safeFileName } from '../../utils/download'
import { formatTime } from '../../utils/format'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'

const player = usePlayerStore()
const library = useLibraryStore()

const scroller = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const seeking = ref(false)
const seekValue = ref(0)

const lyrics = computed(() => player.current?.lyrics ?? null)
const isFavorite = computed(() => (player.current ? library.isFavorite(player.current.id) : false))
const total = computed(() => player.duration || player.current?.duration || 0)
const displayedTime = computed(() => (seeking.value ? seekValue.value : player.currentTime))
const progressPercent = computed(() => (total.value > 0 ? (displayedTime.value / total.value) * 100 : 0))
const volumePercent = computed(() => (player.muted ? 0 : player.volume * 100))
const repeatLabel = computed(() =>
  player.repeat === 'one' ? '单曲循环' : player.repeat === 'all' ? '列表循环' : '顺序播放',
)

const tab = computed({
  get: () => player.nowPlayingTab,
  set: (value: 'lyrics' | 'queue') => {
    player.nowPlayingTab = value
  },
})

const activeIndex = computed(() => {
  const data = lyrics.value
  if (!data?.synced) return -1
  const now = player.currentTime + 0.15
  let found = -1
  for (let i = 0; i < data.lines.length; i += 1) {
    if (data.lines[i].time <= now) found = i
  }
  return found
})

const ambientStyle = computed(() => {
  const track = player.current
  const hue = track?.coverHue ?? 150
  return track?.cover
    ? { backgroundImage: `url("${track.cover}")` }
    : {
        backgroundImage: `linear-gradient(145deg, hsl(${hue} 46% 26%), hsl(${(hue + 40) % 360} 40% 9%))`,
      }
})

let previousOverflow = ''
let previousFocus: HTMLElement | null = null
let appRoot: HTMLElement | null = null

onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  // 全屏播放页是 body 下的模态层，把应用主体移出交互与辅助技术树。
  appRoot = document.getElementById('app')
  appRoot?.setAttribute('inert', '')
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  appRoot?.removeAttribute('inert')
  appRoot = null
  previousFocus?.focus?.()
})

function scrollToActive(): void {
  const index = activeIndex.value
  if (index < 0) return
  scroller.value
    ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

watch(
  activeIndex,
  async () => {
    if (tab.value !== 'lyrics') return
    await nextTick()
    scrollToActive()
  },
  { immediate: true },
)

watch(tab, async (value) => {
  if (value !== 'lyrics') return
  await nextTick()
  scrollToActive()
})

watch(
  () => player.current?.id,
  () => {
    seeking.value = false
    seekValue.value = 0
    scroller.value?.scrollTo({ top: 0 })
  },
)

watch(
  () => player.currentTime,
  (value) => {
    if (!seeking.value) seekValue.value = value
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

function seekTo(index: number): void {
  const data = lyrics.value
  if (data?.synced) player.seek(data.lines[index].time)
}

function downloadLyrics(): void {
  const track = player.current
  const data = lyrics.value
  if (!track || !data) return
  const content = data.raw || data.lines.map((line) => line.text).join('\n')
  const base = safeFileName(`${track.artist} - ${track.title}`, 'lyrics')
  downloadText(`${base}.${data.synced ? 'lrc' : 'txt'}`, content)
}

function close(): void {
  player.closeNowPlaying()
}
</script>

<template>
  <Teleport to="body">
    <section class="now-playing" role="dialog" aria-modal="true" aria-label="正在播放">
      <div class="ambient" :style="ambientStyle" aria-hidden="true" />
      <div class="shade" aria-hidden="true" />

      <header class="head">
        <button class="icon-btn collapse" aria-label="收起播放页" title="收起（Esc）" @click="close">
          <Icon name="chevron-down" :size="20" />
        </button>
        <p class="head-label">正在播放</p>
        <div class="head-actions">
          <button
            class="icon-btn"
            :disabled="!player.current"
            aria-label="下载当前歌曲"
            title="下载当前歌曲"
            @click="player.current && downloadTrack(player.current)"
          >
            <Icon name="download" :size="17" />
          </button>
          <button
            ref="closeButton"
            class="icon-btn"
            aria-label="关闭播放页"
            title="关闭（Esc）"
            @click="close"
          >
            <Icon name="x" :size="18" />
          </button>
        </div>
      </header>

      <div class="body">
        <section class="art-pane">
          <div class="cover-wrap">
            <CoverArt
              fluid
              :src="player.current?.cover"
              :title="player.current?.title ?? '未在播放'"
              :hue="player.current?.coverHue"
              :radius="8"
            />
          </div>

          <div class="track-meta">
            <p class="eyebrow">Now Playing</p>
            <h1>{{ player.current?.title ?? '未在播放' }}</h1>
            <p class="artist">{{ player.current?.artist ?? '从曲库选择一首歌开始' }}</p>
            <p v-if="player.current" class="album">
              {{ player.current.album }}
              <template v-if="player.current.year"> · {{ player.current.year }}</template>
            </p>
          </div>

          <div class="actions">
            <button
              class="icon-btn"
              :class="{ on: isFavorite }"
              :disabled="!player.current"
              :aria-label="isFavorite ? '取消收藏' : '收藏'"
              @click="player.current && library.toggleFavorite(player.current.id)"
            >
              <Icon name="heart" :size="18" :filled="isFavorite" />
            </button>
            <span class="action-hint">{{ isFavorite ? '已收藏' : '收藏' }}</span>
          </div>

          <div class="progress-row">
            <span class="time">{{ formatTime(displayedTime) }}</span>
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
            <span class="time">{{ formatTime(total) }}</span>
          </div>

          <div class="controls">
            <button
              class="icon-btn"
              :class="{ active: player.shuffle }"
              :aria-label="player.shuffle ? '关闭随机播放' : '开启随机播放'"
              :title="player.shuffle ? '随机播放：开' : '随机播放：关'"
              @click="player.toggleShuffle()"
            >
              <Icon name="shuffle" :size="18" />
            </button>
            <button class="icon-btn" aria-label="上一首" title="上一首" @click="player.prev()">
              <Icon name="prev" :size="22" />
            </button>
            <button
              class="play-btn"
              :class="{ loading: player.loading }"
              :aria-label="player.playing ? '暂停' : '播放'"
              @click="player.toggle()"
            >
              <Icon :name="player.playing ? 'pause' : 'play'" :size="22" filled />
            </button>
            <button class="icon-btn" aria-label="下一首" title="下一首" @click="player.next()">
              <Icon name="next" :size="22" />
            </button>
            <button
              class="icon-btn repeat"
              :class="{ active: player.repeat !== 'off' }"
              :aria-label="repeatLabel"
              :title="repeatLabel"
              @click="player.cycleRepeat()"
            >
              <Icon name="repeat" :size="18" />
              <span v-if="player.repeat === 'one'" class="badge">1</span>
            </button>
          </div>

          <div class="volume-row">
            <button
              class="icon-btn"
              :aria-label="player.muted ? '取消静音' : '静音'"
              @click="player.toggleMute()"
            >
              <Icon
                :name="player.muted || player.volume === 0 ? 'volume-x' : 'volume'"
                :size="17"
              />
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
        </section>

        <section class="panel-pane">
          <div class="tabs" role="tablist" aria-label="播放面板">
            <button
              id="np-tab-lyrics"
              role="tab"
              aria-controls="np-panel-lyrics"
              :aria-selected="tab === 'lyrics'"
              :tabindex="tab === 'lyrics' ? 0 : -1"
              @click="tab = 'lyrics'"
            >
              歌词
            </button>
            <button
              id="np-tab-queue"
              role="tab"
              aria-controls="np-panel-queue"
              :aria-selected="tab === 'queue'"
              :tabindex="tab === 'queue' ? 0 : -1"
              @click="tab = 'queue'"
            >
              队列 <span class="tab-count">{{ player.queue.length }}</span>
            </button>
          </div>

          <div
            v-if="tab === 'lyrics'"
            id="np-panel-lyrics"
            class="lyrics-pane"
            role="tabpanel"
            aria-labelledby="np-tab-lyrics"
            tabindex="0"
          >
            <div v-if="lyrics" class="lyrics-toolbar">
              <span class="chip">
                {{ lyrics.source === 'lrc' ? '.lrc 文件' : '内嵌标签' }} ·
                {{ lyrics.synced ? '逐行同步' : '纯文本' }}
              </span>
              <button class="text-btn" @click="downloadLyrics">
                <Icon name="download" :size="14" />下载歌词
              </button>
            </div>

            <div ref="scroller" class="lyrics-scroll">
              <template v-if="lyrics">
                <div v-if="lyrics.synced" class="lines">
                  <button
                    v-for="(line, index) in lyrics.lines"
                    :key="`${line.time}-${index}`"
                    :data-index="index"
                    class="line"
                    :class="{ active: index === activeIndex, past: index < activeIndex }"
                    @click="seekTo(index)"
                  >
                    {{ line.text }}
                  </button>
                </div>
                <pre v-else class="plain">{{ lyrics.raw }}</pre>
              </template>

              <div v-else class="empty">
                <span class="empty-icon"><Icon name="mic" :size="26" /></span>
                <h3>{{ player.current ? '这首歌没有歌词' : '还没有在播放的歌曲' }}</h3>
                <p v-if="player.current">
                  把同名 <code>.lrc</code> 放到 music/ 对应目录，或写入音频的内嵌歌词标签，重新构建后会自动读取。
                </p>
                <p v-else>在曲库里选择一首歌，再打开播放页。</p>
              </div>
            </div>
          </div>

          <div
            v-else
            id="np-panel-queue"
            class="queue-pane"
            role="tabpanel"
            aria-labelledby="np-tab-queue"
            tabindex="0"
          >
            <div class="queue-toolbar">
              <span class="chip">共 {{ player.queue.length }} 首</span>
              <button
                v-if="player.queue.length"
                class="text-btn"
                title="清空队列"
                @click="player.clearQueue()"
              >
                <Icon name="trash" :size="14" />清空
              </button>
            </div>

            <div class="queue-list">
              <p v-if="!player.queue.length" class="queue-empty">队列是空的，从曲库添加歌曲吧。</p>
              <div
                v-for="(track, position) in player.queue"
                :key="track.id"
                class="queue-row"
                :class="{ active: position === player.index }"
              >
                <button class="queue-main" @click="player.playAt(position)">
                  <span class="queue-index">
                    <Icon
                      v-if="position === player.index"
                      name="play"
                      :size="11"
                      filled
                    />
                    <template v-else>{{ position + 1 }}</template>
                  </span>
                  <CoverArt
                    :src="track.cover"
                    :title="track.title"
                    :hue="track.coverHue"
                    :size="40"
                    :radius="6"
                  />
                  <span class="queue-info">
                    <span class="queue-title">{{ track.title }}</span>
                    <span class="queue-sub">{{ track.artist }}</span>
                  </span>
                  <span class="queue-duration">{{ formatTime(track.duration) }}</span>
                </button>
                <button
                  class="icon-btn queue-remove"
                  :aria-label="`从队列移除 ${track.title}`"
                  title="从队列移除"
                  @click="player.removeFromQueue(track.id)"
                >
                  <Icon name="x" :size="14" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
.now-playing {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  color: var(--text);
  background: var(--bg);
  animation: np-in var(--motion-base) var(--ease-out);
}

.ambient {
  position: absolute;
  inset: -10%;
  background-position: center;
  background-size: cover;
  filter: blur(80px) saturate(1.15);
  transform: scale(1.1);
  opacity: 0.32;
  pointer-events: none;
}

.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(18, 18, 18, 0.5),
    rgba(18, 18, 18, 0.88) 52%,
    var(--bg) 100%
  );
  pointer-events: none;
}

.head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
}

.head-label {
  font-size: var(--text-xs);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: auto;
}

.head .icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.body {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 64px);
  padding: var(--space-2) clamp(24px, 4vw, 64px) var(--space-8);
}

.art-pane {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-4);
  min-height: 0;
}

.cover-wrap {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1;
  margin: 0 auto;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.track-meta h1 {
  margin-top: var(--space-1);
  font-size: clamp(24px, 2.6vw, 34px);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
  font-weight: 700;
  word-break: break-word;
}

.artist {
  margin-top: var(--space-2);
  font-size: var(--text-md);
  color: var(--text-soft);
}

.album {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.actions .icon-btn.on {
  color: var(--accent);
}

.action-hint {
  font-size: var(--text-xs);
  color: var(--muted);
}

.progress-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 38px;
  align-items: center;
  gap: var(--space-2);
}

.time {
  font-size: var(--text-xs);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.controls .icon-btn {
  width: 38px;
  height: 38px;
}

.play-btn {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-circle);
  color: var(--accent-contrast);
  background: var(--accent);
  box-shadow: var(--shadow-accent);
  transition: transform var(--motion-fast) var(--ease-out), filter var(--motion-fast) var(--ease-out);
}

.play-btn:hover {
  filter: brightness(1.08);
  transform: scale(1.03);
}

.play-btn:active {
  transform: scale(0.96);
}

.play-btn.loading {
  animation: pulse 1.2s ease-in-out infinite;
}

.repeat {
  position: relative;
}

.repeat .badge {
  position: absolute;
  right: 4px;
  bottom: 3px;
  width: 11px;
  height: 11px;
  border-radius: var(--radius-circle);
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 8px;
  line-height: 11px;
  text-align: center;
  font-weight: 700;
}

.volume-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: min(260px, 100%);
  margin: 0 auto;
}

.volume-row .slider {
  flex: 1;
}

.panel-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: rgba(24, 24, 24, 0.5);
  backdrop-filter: blur(18px);
  overflow: hidden;
}

.tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3) 0;
  border-bottom: 1px solid var(--border);
}

.tabs button {
  padding: 10px 16px;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: color var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out);
}

.tabs button:hover {
  color: var(--text-soft);
}

.tabs button[aria-selected='true'] {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.tab-count {
  margin-left: 2px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.lyrics-pane,
.queue-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.lyrics-toolbar,
.queue-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.text-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: var(--text-xs);
  transition: color var(--motion-fast) var(--ease-out);
}

.text-btn:hover {
  color: var(--text);
}

.lyrics-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-2) var(--space-6) var(--space-8);
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14vh 0 16vh;
}

.line {
  width: 100%;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  color: rgba(255, 255, 255, 0.4);
  font-size: clamp(16px, 1.7vw, 22px);
  line-height: var(--leading-lyrics);
  text-align: left;
  transition: color var(--motion-base) var(--ease-out), background-color var(--motion-base) var(--ease-out);
}

.line.past {
  color: rgba(255, 255, 255, 0.26);
}

.line:hover {
  color: var(--text-soft);
  background: rgba(255, 255, 255, 0.04);
}

.line.active {
  color: var(--text);
  font-weight: 700;
  background: var(--accent-soft);
}

.plain {
  margin: 0;
  padding: 8vh 0 10vh;
  font-family: inherit;
  font-size: var(--text-md);
  line-height: 2;
  color: var(--text-soft);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: 16vh var(--space-6) 0;
  text-align: center;
  color: var(--muted);
}

.empty-icon {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-circle);
  color: var(--accent);
  background: var(--accent-soft);
  margin-bottom: var(--space-1);
}

.empty h3 {
  font-size: var(--text-lg);
  color: var(--text);
}

.empty p {
  max-width: 420px;
  font-size: var(--text-sm);
  line-height: 1.8;
}

code {
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  background: rgba(255, 255, 255, 0.08);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.queue-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-2);
}

.queue-row {
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
}

.queue-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.queue-row.active {
  background: var(--accent-soft);
}

.queue-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 7px 8px;
  text-align: left;
}

.queue-index {
  width: 18px;
  flex: none;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.queue-row.active .queue-index {
  color: var(--accent);
}

.queue-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.queue-title {
  font-size: var(--text-sm);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-row.active .queue-title {
  color: var(--accent);
  font-weight: 600;
}

.queue-sub {
  font-size: var(--text-xs);
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-duration {
  flex: none;
  font-size: var(--text-xs);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.queue-remove {
  width: 30px;
  height: 30px;
  margin-right: var(--space-1);
  opacity: 0;
}

.queue-row:hover .queue-remove,
.queue-row:focus-within .queue-remove {
  opacity: 1;
}

.queue-empty {
  padding: var(--space-10) var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--muted);
}

@keyframes np-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  50% {
    opacity: 0.7;
  }
}

@media (max-width: 900px) {
  .head {
    padding: var(--space-3) var(--space-4);
  }

  .body {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 0 var(--space-4) var(--space-8);
    gap: var(--space-5);
  }

  .art-pane {
    flex: none;
    align-items: center;
    text-align: center;
    gap: var(--space-3);
  }

  .cover-wrap {
    width: min(54vw, 220px);
    margin-top: var(--space-2);
  }

  .track-meta h1 {
    font-size: var(--text-xl);
  }

  .artist,
  .album {
    margin-top: 2px;
  }

  .actions {
    justify-content: center;
  }

  .progress-row {
    width: 100%;
  }

  .controls {
    gap: var(--space-4);
  }

  .volume-row {
    display: none;
  }

  .panel-pane {
    flex: none;
    height: 54vh;
    min-height: 320px;
  }

  .lyrics-scroll {
    padding: 0 var(--space-3) var(--space-6);
  }

  .lines {
    padding: 6vh 0 10vh;
  }

  .line {
    font-size: 17px;
    text-align: center;
  }

  .empty {
    padding: 8px var(--space-3) 0;
  }

  .empty-icon {
    width: 44px;
    height: 44px;
  }

  .queue-remove {
    opacity: 1;
  }
}
</style>
