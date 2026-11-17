import type { Track } from '../types'

export type TrackSortKey = 'default' | 'title' | 'artist' | 'album' | 'duration' | 'year'
export type SortDirection = 'asc' | 'desc'
export type TrackFilter = 'all' | 'favorite' | 'cover' | 'lyrics' | 'lossless'

export const TRACK_SORT_OPTIONS: { value: TrackSortKey; label: string }[] = [
  { value: 'default', label: '默认顺序' },
  { value: 'title', label: '歌曲名' },
  { value: 'artist', label: '歌手' },
  { value: 'album', label: '专辑' },
  { value: 'duration', label: '时长' },
  { value: 'year', label: '发行年份' },
]

export const TRACK_FILTER_OPTIONS: { value: TrackFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'favorite', label: '已收藏' },
  { value: 'cover', label: '有封面' },
  { value: 'lyrics', label: '有歌词' },
  { value: 'lossless', label: '无损' },
]

const LOSSLESS_FORMATS = new Set(['flac', 'wav', 'alac', 'aiff', 'ape'])

export function isLossless(track: Track): boolean {
  return LOSSLESS_FORMATS.has(track.format.toLowerCase())
}

export function filterTracks(
  tracks: Track[],
  filter: TrackFilter,
  favoriteIds: ReadonlySet<string> = new Set(),
): Track[] {
  switch (filter) {
    case 'favorite':
      return tracks.filter((track) => favoriteIds.has(track.id))
    case 'cover':
      return tracks.filter((track) => Boolean(track.cover))
    case 'lyrics':
      return tracks.filter((track) => Boolean(track.lyrics))
    case 'lossless':
      return tracks.filter(isLossless)
    default:
      return [...tracks]
  }
}

function compareYear(a: Track, b: Track, factor: number): number {
  if (a.year == null && b.year == null) return 0
  if (a.year == null) return 1
  if (b.year == null) return -1
  return factor * (a.year - b.year)
}

export function sortTracks(
  tracks: Track[],
  key: TrackSortKey,
  direction: SortDirection = 'asc',
): Track[] {
  const list = [...tracks]
  const factor = direction === 'desc' ? -1 : 1

  switch (key) {
    case 'title':
      list.sort(
        (a, b) =>
          factor * a.title.localeCompare(b.title, 'zh-Hans-CN') ||
          a.artist.localeCompare(b.artist, 'zh-Hans-CN'),
      )
      break
    case 'artist':
      list.sort(
        (a, b) =>
          factor * a.artist.localeCompare(b.artist, 'zh-Hans-CN') ||
          a.title.localeCompare(b.title, 'zh-Hans-CN'),
      )
      break
    case 'album':
      list.sort(
        (a, b) =>
          factor * a.album.localeCompare(b.album, 'zh-Hans-CN') ||
          (a.trackNo ?? 999) - (b.trackNo ?? 999) ||
          a.title.localeCompare(b.title, 'zh-Hans-CN'),
      )
      break
    case 'duration':
      list.sort(
        (a, b) =>
          factor * (a.duration - b.duration) ||
          a.title.localeCompare(b.title, 'zh-Hans-CN'),
      )
      break
    case 'year':
      list.sort(
        (a, b) =>
          compareYear(a, b, factor) ||
          a.title.localeCompare(b.title, 'zh-Hans-CN'),
      )
      break
    default:
      if (direction === 'desc') list.reverse()
  }

  return list
}
