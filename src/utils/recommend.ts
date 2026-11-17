import type { Track } from '../types'

export interface DailyPickOptions {
  favorites?: readonly string[]
  recent?: readonly string[]
  date?: Date
  count?: number
}

/** 本地日期键，避免跨时区把“今天”算错。 */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function hashSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let result = Math.imul(value ^ (value >>> 15), 1 | value)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 每日推荐只使用本地可解释信号：收藏、最近播放与日期种子。
 * 同一天结果稳定；没有收藏/记录时也能得到一组当天固定的曲目。
 */
export function dailyPicks(tracks: readonly Track[], options: DailyPickOptions = {}): Track[] {
  const count = Math.max(0, options.count ?? 8)
  if (!tracks.length || count === 0) return []

  const favoriteSet = new Set(options.favorites ?? [])
  const recentRank = new Map<string, number>()
  ;(options.recent ?? []).forEach((id, index) => {
    if (!recentRank.has(id)) recentRank.set(id, index)
  })

  const random = mulberry32(hashSeed(`${dayKey(options.date)}:${tracks.length}`))
  const candidates = tracks.map((track) => {
    const favoriteScore = favoriteSet.has(track.id) ? 42 : 0
    const recentIndex = recentRank.get(track.id)
    const recentScore = recentIndex == null ? 0 : Math.max(0, 32 - recentIndex * 3)
    return {
      track,
      score: favoriteScore + recentScore + random() * 24,
    }
  })

  candidates.sort(
    (a, b) =>
      b.score - a.score || a.track.title.localeCompare(b.track.title, 'zh-Hans-CN'),
  )

  const picks: Track[] = []
  const artistCount = new Map<string, number>()
  const picked = new Set<string>()

  // 先保证同一歌手不过度集中，再放宽限制补足数量。
  for (const limit of [2, Number.POSITIVE_INFINITY]) {
    for (const candidate of candidates) {
      if (picks.length >= count) break
      const { track } = candidate
      if (picked.has(track.id)) continue
      const artist = track.artists[0] ?? track.artist
      const used = artistCount.get(artist) ?? 0
      if (used >= limit) continue
      picks.push(track)
      picked.add(track.id)
      artistCount.set(artist, used + 1)
    }
    if (picks.length >= count) break
  }

  return picks
}
