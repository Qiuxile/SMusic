import { onBeforeUnmount, onMounted, watch } from 'vue'
import { usePlayerStore } from '../stores/player'

function artworkType(url: string): string {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

/** 系统媒体面板（锁屏 / 耳机按键 / Windows 媒体浮层） */
export function useMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const player = usePlayerStore()
  const session = navigator.mediaSession

  watch(
    () => player.current,
    (track) => {
      if (!track) {
        session.metadata = null
        return
      }
      session.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.cover
          ? [{ src: track.cover, sizes: '512x512', type: artworkType(track.cover) }]
          : [],
      })
    },
    { immediate: true },
  )

  watch(
    () => player.playing,
    (playing) => {
      session.playbackState = playing ? 'playing' : 'paused'
    },
    { immediate: true },
  )

  watch(
    [() => player.currentTime, () => player.duration],
    ([position, duration]) => {
      if (!duration || !Number.isFinite(duration) || position > duration) return
      try {
        session.setPositionState({ duration, position, playbackRate: 1 })
      } catch {
        /* 部分浏览器在元数据未就绪时抛错，忽略 */
      }
    },
  )

  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
    ['play', () => {
      if (!player.playing) void player.start()
    }],
    ['pause', () => {
      if (player.playing) player.pause()
    }],
    ['previoustrack', () => player.prev()],
    ['nexttrack', () => player.next()],
    ['seekbackward', (details) => player.skip(-(details.seekOffset ?? 10))],
    ['seekforward', (details) => player.skip(details.seekOffset ?? 10)],
    ['seekto', (details) => {
      if (typeof details.seekTime === 'number') player.seek(details.seekTime)
    }],
  ]

  onMounted(() => {
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler)
      } catch {
        /* 不支持的动作直接跳过 */
      }
    }
  })

  onBeforeUnmount(() => {
    for (const [action] of handlers) {
      try {
        session.setActionHandler(action, null)
      } catch {
        /* noop */
      }
    }
  })
}
