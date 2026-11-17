import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Track } from '../types'
import { buildShuffleOrder, stepShuffle } from '../audio/queue'
import { settleStatus, transition } from '../audio/state-machine'
import type { PlaybackEvent, PlaybackStatus } from '../audio/state-machine'
import { useLibraryStore } from './library'
import { loadJSON, saveJSON } from '../utils/storage'

export type RepeatMode = 'off' | 'all' | 'one'

interface PersistedPlayer {
  queue: string[]
  index: number
  position: number
  positionTrackId: string
  volume: number
  muted: boolean
  repeat: RepeatMode
  shuffle: boolean
  showVisualizer: boolean
}

const STORAGE_KEY = 'mp.player.v1'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export const usePlayerStore = defineStore('player', () => {
  const library = useLibraryStore()
  const saved = loadJSON<Partial<PersistedPlayer>>(STORAGE_KEY, {})

  /** 全局唯一的 <audio>，由 store 持有，跨路由不中断 */
  const audio = shallowRef<HTMLAudioElement | null>(null)
  const status = ref<PlaybackStatus>('idle')
  const queue = ref<Track[]>([])
  const index = ref(-1)
  const playing = ref(false)
  const loading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const buffered = ref(0)
  const volume = ref(typeof saved.volume === 'number' ? clamp(saved.volume, 0, 1) : 0.8)
  const muted = ref(saved.muted === true)
  const repeat = ref<RepeatMode>(saved.repeat ?? 'all')
  const shuffle = ref(saved.shuffle === true)
  const error = ref('')
  const showNowPlaying = ref(false)
  const nowPlayingTab = ref<'lyrics' | 'queue'>('lyrics')
  const showVisualizer = ref(saved.showVisualizer === true)
  const shuffleOrder = ref<number[]>([])

  let hydrated = false
  let pendingSeek: number | null = null
  let restorePosition: number | null = null

  function send(event: PlaybackEvent): void {
    status.value = transition(status.value, event)
  }

  const current = computed<Track | null>(() =>
    index.value >= 0 ? queue.value[index.value] ?? null : null,
  )
  const progress = computed(() => {
    const total = duration.value || current.value?.duration || 0
    return total > 0 ? clamp(currentTime.value / total, 0, 1) : 0
  })
  const bufferedPercent = computed(() => {
    const total = duration.value || 0
    return total > 0 ? clamp(buffered.value / total, 0, 1) : 0
  })

  function ensureAudio(): HTMLAudioElement {
    if (audio.value) return audio.value
    const element = new Audio()
    element.preload = 'metadata'
    element.volume = volume.value
    element.muted = muted.value

    element.addEventListener('timeupdate', () => {
      currentTime.value = element.currentTime
    })
    element.addEventListener('durationchange', () => {
      if (Number.isFinite(element.duration)) duration.value = element.duration
    })
    element.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(element.duration)) duration.value = element.duration
      if (pendingSeek !== null && Number.isFinite(element.duration) && element.duration > 0) {
        const target = clamp(pendingSeek, 0, element.duration)
        element.currentTime = target
        currentTime.value = target
        pendingSeek = null
      }
      send('loaded')
    })
    element.addEventListener('progress', () => {
      const ranges = element.buffered
      buffered.value = ranges.length ? ranges.end(ranges.length - 1) : 0
    })
    element.addEventListener('playing', () => {
      playing.value = true
      loading.value = false
      error.value = ''
      status.value = 'playing'
    })
    element.addEventListener('pause', () => {
      playing.value = false
      if (status.value !== 'idle' && status.value !== 'ended') status.value = 'paused'
      persist()
    })
    element.addEventListener('waiting', () => {
      loading.value = true
      if (playing.value) status.value = 'buffering'
    })
    element.addEventListener('canplay', () => {
      loading.value = false
      if (status.value === 'loading' || status.value === 'buffering') {
        status.value = settleStatus(playing.value)
      }
    })
    element.addEventListener('seeking', () => {
      status.value = 'seeking'
    })
    element.addEventListener('seeked', () => {
      status.value = settleStatus(playing.value)
      persist()
    })
    element.addEventListener('ended', () => {
      status.value = 'ended'
      persist()
      next(true)
    })
    element.addEventListener('error', () => {
      // 切换音源时浏览器会抛 MEDIA_ERR_ABORTED，属正常中断
      if (!element.src || element.error?.code === MediaError.MEDIA_ERR_ABORTED) return
      loading.value = false
      playing.value = false
      status.value = 'error'
      error.value = '音频加载失败，请确认文件仍在 music/ 目录中'
    })

    audio.value = element
    return element
  }

  async function start(): Promise<void> {
    const element = ensureAudio()
    if (!element.getAttribute('src') && current.value) {
      element.src = current.value.url
      element.load()
    }
    loading.value = true
    status.value = 'loading'
    try {
      await element.play()
      playing.value = true
      loading.value = false
      status.value = 'playing'
    } catch (unknownError) {
      const errorInfo = unknownError as DOMException
      loading.value = false
      playing.value = false
      if (errorInfo?.name === 'AbortError') return
      status.value = errorInfo?.name === 'NotAllowedError' ? 'paused' : 'error'
      error.value =
        errorInfo?.name === 'NotAllowedError'
          ? '浏览器阻止了自动播放，请点击播放按钮'
          : '播放失败，请稍后重试'
    }
  }

  function pause(): void {
    audio.value?.pause()
    playing.value = false
    if (status.value !== 'idle') status.value = 'paused'
  }

  function load(track: Track, autoplay: boolean): void {
    const element = ensureAudio()
    error.value = ''
    currentTime.value = 0
    buffered.value = 0
    duration.value = track.duration || 0
    status.value = 'loading'
    loading.value = true
    pendingSeek = restorePosition
    restorePosition = null
    element.src = track.url
    element.load()
    if (autoplay) void start()
  }

  function playTrack(track: Track, list?: Track[]): void {
    // 先记录正在播放的曲目：下面可能整体替换队列，index 相同不代表还是同一首歌
    const playingId = current.value?.id ?? null
    if (list?.length) queue.value = [...list]
    let position = queue.value.findIndex((item) => item.id === track.id)
    if (position === -1) {
      queue.value = [...queue.value, track]
      position = queue.value.length - 1
    }
    const isSame = playingId === track.id && Boolean(audio.value?.getAttribute('src'))
    index.value = position
    shuffleOrder.value = []
    library.pushRecent(track.id)
    if (isSame) {
      seek(0)
      if (!playing.value) void start()
      return
    }
    load(track, true)
  }

  function playAt(position: number): void {
    const track = queue.value[position]
    if (!track) return
    index.value = position
    shuffleOrder.value = []
    library.pushRecent(track.id)
    load(track, true)
  }

  function toggle(): void {
    if (!current.value) {
      const first = library.tracks[0]
      if (first) playTrack(first, library.tracks)
      return
    }
    if (playing.value) {
      pause()
      return
    }
    void start()
  }

  function next(auto = false): void {
    if (!queue.value.length) return
    if (auto && repeat.value === 'one') {
      seek(0)
      void start()
      return
    }
    if (shuffle.value && queue.value.length > 1) {
      if (shuffleOrder.value.length !== queue.value.length) {
        shuffleOrder.value = buildShuffleOrder(queue.value.length, index.value)
      }
      const cursor = shuffleOrder.value.indexOf(index.value)
      if (cursor === shuffleOrder.value.length - 1 && auto && repeat.value === 'off') {
        playing.value = false
        currentTime.value = duration.value
        status.value = 'ended'
        return
      }
      const step = stepShuffle(shuffleOrder.value, queue.value.length, index.value, 1)
      shuffleOrder.value = step.order
      index.value = step.position
    } else if (index.value < queue.value.length - 1) {
      index.value += 1
    } else if (repeat.value === 'all' || !auto) {
      index.value = 0
    } else {
      playing.value = false
      currentTime.value = duration.value
      return
    }
    const track = current.value
    if (track) {
      library.pushRecent(track.id)
      load(track, true)
    }
  }

  function prev(): void {
    if (!queue.value.length) return
    if (currentTime.value > 3) {
      seek(0)
      return
    }
    if (shuffle.value && queue.value.length > 1) {
      const order =
        shuffleOrder.value.length === queue.value.length
          ? shuffleOrder.value
          : buildShuffleOrder(queue.value.length, index.value)
      const cursor = order.indexOf(index.value)
      if (cursor === 0 && repeat.value !== 'all') {
        seek(0)
        return
      }
      const step = stepShuffle(order, queue.value.length, index.value, -1)
      shuffleOrder.value = step.order
      index.value = step.position
    } else if (index.value > 0) {
      index.value -= 1
    } else if (repeat.value === 'all') {
      index.value = queue.value.length - 1
    } else {
      seek(0)
      return
    }
    const track = current.value
    if (track) {
      library.pushRecent(track.id)
      load(track, true)
    }
  }

  function seek(seconds: number): void {
    const element = audio.value
    const total = duration.value || element?.duration || 0
    if (!element || !Number.isFinite(total) || total <= 0) return
    const target = clamp(seconds, 0, total)
    status.value = 'seeking'
    element.currentTime = target
    currentTime.value = target
  }

  function skip(seconds: number): void {
    seek(currentTime.value + seconds)
  }

  function setVolume(value: number): void {
    volume.value = clamp(value, 0, 1)
    if (audio.value) audio.value.volume = volume.value
    if (volume.value > 0 && muted.value) {
      muted.value = false
      if (audio.value) audio.value.muted = false
    }
  }

  function toggleMute(): void {
    muted.value = !muted.value
    if (audio.value) audio.value.muted = muted.value
  }

  function addToQueue(track: Track, playNext = false): void {
    enqueueTracks([track], playNext)
  }

  /** 批量入队时保持传入顺序，并跳过队列中已有的曲目。 */
  function enqueueTracks(tracks: readonly Track[], playNext = false): number {
    const existing = new Set(queue.value.map((item) => item.id))
    const additions = tracks.filter((track) => {
      if (existing.has(track.id)) return false
      existing.add(track.id)
      return true
    })
    if (!additions.length) return 0

    if (playNext && index.value >= 0) {
      queue.value = [
        ...queue.value.slice(0, index.value + 1),
        ...additions,
        ...queue.value.slice(index.value + 1),
      ]
    } else {
      queue.value = [...queue.value, ...additions]
    }
    shuffleOrder.value = []

    if (index.value === -1) {
      index.value = 0
      load(queue.value[0], false)
    }
    return additions.length
  }

  function playShuffled(tracks: readonly Track[]): void {
    if (!tracks.length) return
    shuffle.value = true
    const start = tracks[Math.floor(Math.random() * tracks.length)]
    playTrack(start, [...tracks])
    shuffleOrder.value = buildShuffleOrder(queue.value.length, index.value)
  }

  function removeFromQueue(id: string): void {
    const position = queue.value.findIndex((item) => item.id === id)
    if (position === -1) return
    const removingCurrent = position === index.value
    queue.value = queue.value.filter((item) => item.id !== id)
    shuffleOrder.value = []
    if (!queue.value.length) {
      index.value = -1
      audio.value?.pause()
      audio.value?.removeAttribute('src')
      playing.value = false
      loading.value = false
      status.value = 'idle'
      currentTime.value = 0
      duration.value = 0
      return
    }
    if (position < index.value) {
      index.value -= 1
    } else if (removingCurrent) {
      index.value = Math.min(position, queue.value.length - 1)
      load(queue.value[index.value], playing.value)
    }
  }

  function clearQueue(): void {
    queue.value = []
    index.value = -1
    shuffleOrder.value = []
    audio.value?.pause()
    audio.value?.removeAttribute('src')
    playing.value = false
    loading.value = false
    status.value = 'idle'
    currentTime.value = 0
    duration.value = 0
  }

  function cycleRepeat(): void {
    repeat.value = repeat.value === 'off' ? 'all' : repeat.value === 'all' ? 'one' : 'off'
  }

  function toggleShuffle(): void {
    shuffle.value = !shuffle.value
    shuffleOrder.value = shuffle.value ? buildShuffleOrder(queue.value.length, index.value) : []
  }

  function openNowPlaying(tab: 'lyrics' | 'queue' = 'lyrics'): void {
    nowPlayingTab.value = tab
    showNowPlaying.value = true
  }

  function closeNowPlaying(): void {
    showNowPlaying.value = false
  }

  function toggleNowPlaying(tab: 'lyrics' | 'queue'): void {
    if (showNowPlaying.value && nowPlayingTab.value === tab) closeNowPlaying()
    else openNowPlaying(tab)
  }

  /** 恢复上次队列、音量与播放模式（不自动播放） */
  function hydrate(): void {
    if (hydrated) return
    hydrated = true
    const restored = (saved.queue ?? [])
      .map((id) => library.byId.get(id))
      .filter((track): track is Track => Boolean(track))
    if (restored.length) {
      queue.value = restored
      index.value = clamp(saved.index ?? 0, 0, restored.length - 1)
    } else if (library.tracks.length) {
      queue.value = [...library.tracks]
      index.value = 0
    }
    if (current.value) {
      restorePosition =
        saved.positionTrackId === current.value.id && typeof saved.position === 'number'
          ? saved.position
          : null
      load(current.value, false)
    }
    if (audio.value) {
      audio.value.volume = volume.value
      audio.value.muted = muted.value
    }
  }

  function persist(): void {
    saveJSON<PersistedPlayer>(STORAGE_KEY, {
      queue: queue.value.map((track) => track.id),
      index: index.value,
      position: currentTime.value,
      positionTrackId: current.value?.id ?? '',
      volume: volume.value,
      muted: muted.value,
      repeat: repeat.value,
      shuffle: shuffle.value,
      showVisualizer: showVisualizer.value,
    })
  }

  watch([queue, index, volume, muted, repeat, shuffle, showVisualizer], persist, { deep: true })

  let lastPositionPersist = 0
  watch(currentTime, () => {
    const now = Date.now()
    if (now - lastPositionPersist < 5000) return
    lastPositionPersist = now
    persist()
  })

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist()
    })
  }

  return {
    audio,
    status,
    queue,
    index,
    playing,
    loading,
    currentTime,
    duration,
    buffered,
    bufferedPercent,
    volume,
    muted,
    repeat,
    shuffle,
    error,
    showNowPlaying,
    nowPlayingTab,
    showVisualizer,
    current,
    progress,
    ensureAudio,
    hydrate,
    playTrack,
    playAt,
    toggle,
    start,
    pause,
    next,
    prev,
    seek,
    skip,
    setVolume,
    toggleMute,
    addToQueue,
    enqueueTracks,
    playShuffled,
    removeFromQueue,
    clearQueue,
    cycleRepeat,
    toggleShuffle,
    openNowPlaying,
    closeNowPlaying,
    toggleNowPlaying,
  }
})
