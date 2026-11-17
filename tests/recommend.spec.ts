import { describe, expect, it } from 'vitest'
import type { Track } from '../src/types'
import { dailyPicks, dayKey, hashSeed } from '../src/utils/recommend'

function track(id: string, artist: string): Track {
  return {
    id,
    file: `${id}.mp3`,
    url: `/music/${id}.mp3`,
    title: `歌曲 ${id}`,
    artist,
    artists: [artist],
    album: `专辑 ${id}`,
    albumKey: `album-${id}`,
    duration: 180,
    format: 'MP3',
    size: 1024,
    coverHue: 150,
  }
}

const tracks = [
  track('a1', '甲'),
  track('a2', '甲'),
  track('a3', '甲'),
  track('a4', '甲'),
  track('b1', '乙'),
  track('b2', '乙'),
  track('c1', '丙'),
  track('c2', '丙'),
  track('d1', '丁'),
  track('d2', '丁'),
]

describe('daily picks', () => {
  it('同一天结果稳定，不受调用次数影响', () => {
    const date = new Date(2026, 10, 17, 9, 30)
    const first = dailyPicks(tracks, { date, count: 6 })
    const second = dailyPicks([...tracks], { date, count: 6 })
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
  })

  it('收藏与最近播放会获得更高优先级', () => {
    const date = new Date(2026, 10, 17)
    const picks = dailyPicks(tracks, {
      date,
      count: 4,
      favorites: ['c1'],
      recent: ['b1', 'd1'],
    })
    const ids = picks.map((item) => item.id)
    expect(ids).toContain('c1')
    expect(ids).toContain('b1')
  })

  it('限制同一歌手连续出现，并补足数量', () => {
    const date = new Date(2026, 10, 17)
    const picks = dailyPicks(tracks, { date, count: 8 })
    expect(picks).toHaveLength(8)
    expect(new Set(picks.map((item) => item.id)).size).toBe(8)
    expect(picks.filter((item) => item.artist === '甲').length).toBeLessThanOrEqual(2)
  })

  it('日期键与种子稳定', () => {
    expect(dayKey(new Date(2026, 0, 2))).toBe('2026-01-02')
    expect(hashSeed('2026-01-02')).toBe(hashSeed('2026-01-02'))
    expect(hashSeed('2026-01-02')).not.toBe(hashSeed('2026-01-03'))
  })

  it('空曲库返回空数组', () => {
    expect(dailyPicks([], {})).toEqual([])
  })
})
