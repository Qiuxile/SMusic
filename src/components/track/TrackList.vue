<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Track } from '../../types'
import { usePlayerStore } from '../../stores/player'
import { useLibraryStore } from '../../stores/library'
import { formatTime } from '../../utils/format'
import { downloadTrack } from '../../utils/download'
import CoverArt from '../ui/CoverArt.vue'
import Icon from '../ui/Icon.vue'
import AddToPlaylistMenu from '../playlist/AddToPlaylistMenu.vue'

const props = withDefaults(
  defineProps<{
    tracks: Track[]
    showAlbum?: boolean
    showCover?: boolean
    emptyText?: string
    showAddToPlaylist?: boolean
    selectable?: boolean
    selectedIds?: string[]
    removable?: boolean
    virtual?: boolean
  }>(),
  {
    showAlbum: true,
    showCover: true,
    emptyText: '这里还没有歌曲',
    showAddToPlaylist: true,
    selectable: false,
    selectedIds: () => [],
    removable: false,
    virtual: true,
  },
)

const emit = defineEmits<{
  (event: 'toggle-select', id: string): void
  (event: 'remove', track: Track): void
}>()

const player = usePlayerStore()
const library = useLibraryStore()

const activeId = computed(() => player.current?.id ?? '')
const selectedSet = computed(() => new Set(props.selectedIds))
const favoriteSet = computed(() => library.favoriteSet)

const ROW_PITCH = 56
const OVERSCAN = 12
const RANGE_STEP = 12
const INITIAL_ROWS = 38
const root = ref<HTMLElement | null>(null)
const start = ref(0)
const end = ref(Math.min(INITIAL_ROWS, props.tracks.length))
let scroller: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null
let frame = 0
let previousLength = props.tracks.length

const virtualized = computed(() => props.virtual && props.tracks.length > 60)
const visibleTracks = computed(() =>
  virtualized.value ? props.tracks.slice(start.value, end.value) : props.tracks,
)
const positions = computed(() => {
  const map = new Map<string, number>()
  props.tracks.forEach((track, index) => map.set(track.id, index + 1))
  return map
})
const topPad = computed(() => (virtualized.value ? start.value * ROW_PITCH : 0))
const bottomPad = computed(() =>
  virtualized.value ? Math.max(0, props.tracks.length - end.value) * ROW_PITCH : 0,
)

function findScroller(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement
  while (node && node !== document.body) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') return node
    node = node.parentElement
  }
  return null
}

function updateRange(): void {
  const total = props.tracks.length
  if (!virtualized.value || !root.value) {
    start.value = 0
    end.value = total
    return
  }

  const element = root.value
  const scrollTop = scroller ? scroller.scrollTop : window.scrollY
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0
  const viewHeight = scroller ? scroller.clientHeight : window.innerHeight
  const listTop = element.getBoundingClientRect().top - viewTop + scrollTop
  const offset = scrollTop - listTop
  const firstVisible = Math.floor(Math.max(0, offset) / ROW_PITCH)
  const visibleCount = Math.ceil(viewHeight / ROW_PITCH)
  const count = visibleCount + OVERSCAN * 2
  const base = Math.max(
    0,
    Math.floor(Math.max(0, firstVisible - OVERSCAN) / RANGE_STEP) * RANGE_STEP,
  )

  let nextStart = start.value
  let nextEnd = end.value
  if (base !== start.value) {
    nextStart = base
    nextEnd = Math.min(total, base + count)
  } else if (nextEnd < firstVisible + visibleCount + OVERSCAN) {
    // 在固定分块内延伸尾部，避免每一帧都重建列表窗口。
    nextEnd = Math.min(total, Math.max(nextEnd, base + count + RANGE_STEP))
  }
  if (nextStart >= total) {
    nextStart = Math.max(0, total - count)
    nextEnd = total
  }
  if (nextStart !== start.value) start.value = nextStart
  if (nextEnd !== end.value) end.value = nextEnd
}

function scheduleRange(): void {
  if (frame) return
  frame = window.requestAnimationFrame(() => {
    frame = 0
    updateRange()
  })
}

function connectScroller(): void {
  if (!root.value) return
  scroller?.removeEventListener('scroll', scheduleRange)
  scroller = findScroller(root.value)
  scroller?.addEventListener('scroll', scheduleRange, { passive: true })
  resizeObserver?.disconnect()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleRange)
    resizeObserver.observe(scroller ?? document.documentElement)
    resizeObserver.observe(root.value)
  }
  scheduleRange()
}

onMounted(() => {
  connectScroller()
  window.addEventListener('resize', scheduleRange, { passive: true })
})

onBeforeUnmount(() => {
  scroller?.removeEventListener('scroll', scheduleRange)
  window.removeEventListener('resize', scheduleRange)
  resizeObserver?.disconnect()
  if (frame) window.cancelAnimationFrame(frame)
})

watch(
  () => props.tracks,
  () => {
    const length = props.tracks.length
    if (length !== previousLength) {
      previousLength = length
      start.value = 0
      end.value = Math.min(INITIAL_ROWS, length)
    } else if (end.value > length) {
      end.value = length
    }
    void nextTick(scheduleRange)
  },
  { flush: 'post' },
)

function play(track: Track): void {
  player.playTrack(track, props.tracks)
}

function activate(track: Track): void {
  if (props.selectable) emit('toggle-select', track.id)
  else play(track)
}
</script>

<template>
  <div ref="root" class="track-list">
    <div
      v-if="tracks.length"
      class="tracks"
      role="list"
      aria-label="曲目列表"
      :style="{ paddingTop: `${topPad}px`, paddingBottom: `${bottomPad}px` }"
    >
      <div
        v-for="track in visibleTracks"
        :key="track.id"
        v-memo="[
          track,
          positions.get(track.id),
          tracks.length,
          track.id === activeId,
          selectedSet.has(track.id),
          favoriteSet.has(track.id),
          selectable,
          removable,
          showAlbum,
          showAddToPlaylist,
          showCover,
        ]"
        class="row"
        role="listitem"
        :aria-posinset="positions.get(track.id)"
        :aria-setsize="tracks.length"
        :class="{
          active: track.id === activeId,
          selected: selectedSet.has(track.id),
          selectable,
          removable,
        }"
      >
      <button
        v-if="selectable"
        class="check"
        role="checkbox"
        :aria-checked="selectedSet.has(track.id)"
        :aria-label="`选择 ${track.title}`"
        @click.stop="emit('toggle-select', track.id)"
      >
        <Icon v-if="selectedSet.has(track.id)" name="check" :size="13" />
      </button>

      <button
        class="idx"
        :title="selectable ? `选择 ${track.title}` : `播放 ${track.title}`"
        @click="activate(track)"
      >
        <span v-if="track.id !== activeId" class="num">{{ positions.get(track.id) }}</span>
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

      <button
        class="info"
        type="button"
        :aria-label="selectable ? `选择 ${track.title}` : `播放 ${track.title}`"
        @click="activate(track)"
      >
        <span class="title-line">
          <span class="title">{{ track.title }}</span>
          <span v-if="track.bitrate && track.bitrate >= 256" class="badge">{{ track.bitrate }}k</span>
        </span>
        <span class="sub">{{ track.artist }}</span>
      </button>

      <RouterLink
        v-if="showAlbum"
        class="album"
        :to="`/album/${track.albumKey}`"
        :title="track.album"
      >
        {{ track.album }}
      </RouterLink>

      <div class="actions">
        <AddToPlaylistMenu
          v-if="showAddToPlaylist"
          :track-ids="[track.id]"
          label="添加到歌单"
        />
        <button class="icon-btn" title="下一首播放" @click.stop="player.addToQueue(track, true)">
          <Icon name="next-up" :size="15" />
        </button>
        <button class="icon-btn" title="加入队列" @click.stop="player.addToQueue(track)">
          <Icon name="queue" :size="15" />
        </button>
        <button
          class="icon-btn download"
          title="下载音频"
          aria-label="下载音频"
          @click.stop="downloadTrack(track)"
        >
          <Icon name="download" :size="15" />
        </button>
        <button
          class="icon-btn favorite"
          :class="{ fav: favoriteSet.has(track.id) }"
          :title="favoriteSet.has(track.id) ? '取消收藏' : '收藏'"
          @click.stop="library.toggleFavorite(track.id)"
        >
          <Icon name="heart" :size="15" :filled="favoriteSet.has(track.id)" />
        </button>
        <button
          v-if="removable"
          class="icon-btn remove"
          :aria-label="`从歌单移除 ${track.title}`"
          title="从歌单移除"
          @click.stop="emit('remove', track)"
        >
          <Icon name="x" :size="15" />
        </button>
      </div>

      <span class="dur">{{ formatTime(track.duration) }}</span>
    </div>
  </div>

  <p v-else class="empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.track-list {
  overflow-anchor: none;
}

.tracks {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-anchor: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 54px;
  flex: none;
  margin-bottom: 2px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: background-color 0.14s ease;
  content-visibility: auto;
  contain-intrinsic-size: auto 54px;
}

.row:hover {
  background: rgba(255, 255, 255, 0.045);
}

.row.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.row.selected {
  background: rgba(255, 255, 255, 0.07);
  border-color: var(--border-strong);
}

.check {
  width: 20px;
  height: 20px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xs);
  color: var(--accent-contrast);
  background: transparent;
}

.check[aria-checked='true'] {
  border-color: var(--accent);
  background: var(--accent);
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
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
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
  border: 1px solid rgba(30, 215, 96, 0.35);
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

  .actions .icon-btn:not(.favorite):not(.download):not(.add-pl):not(.remove) {
    display: none;
  }

  .actions .favorite,
  .actions .download,
  .actions .add-pl,
  .actions .remove {
    width: 34px;
    height: 34px;
  }

  .row.removable .download {
    display: none;
  }

  .row.selectable .actions {
    display: none;
  }

  .check {
    width: 24px;
    height: 24px;
  }

  .dur {
    width: 36px;
  }
}
</style>
