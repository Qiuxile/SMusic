import { describe, expect, it } from 'vitest'
import type { Track } from '../src/types'
import { filterTracks, isLossless, sortTracks } from '../src/utils/track-view'

function track(overrides: Partial<Track> & Pick<Track, 'id' | 'title'>): Track {
  return {
    file: `${overrides.id}.mp3`,
    url: `/music/${overrides.id}.mp3`,
    artist: '歌手',
    artists: ['歌手'],
    album: '专辑',
    albumKey: 'album',
    duration: 180,
    format: 'MP3',
    size: 1024,
    coverHue: 150,
    ...overrides,
  }
}

const tracks = [
  track({ id: 'a', title: 'B 歌', artist: '甲', album: '二', duration: 300, year: 2020 }),
  track({ id: 'b', title: 'A 歌', artist: '乙', album: '一', duration: 120, year: null, cover: '/cover.jpg' }),
  track({ id: 'c', title: 'C 歌', artist: '甲', album: '二', duration: 200, year: 2018, format: 'FLAC' }),
]

describe('track view utilities', () => {
  it('按标题、歌手、时长与年份排序', () => {
    expect(sortTracks(tracks, 'title').map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(sortTracks(tracks, 'artist').map((item) => item.id)).toEqual(['a', 'c', 'b'])
    expect(sortTracks(tracks, 'duration').map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(sortTracks(tracks, 'duration', 'desc').map((item) => item.id)).toEqual(['a', 'c', 'b'])
    expect(sortTracks(tracks, 'year', 'desc').map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })

  it('年份缺失的曲目始终排在最后', () => {
    expect(sortTracks(tracks, 'year', 'desc').at(-1)?.id).toBe('b')
    expect(sortTracks(tracks, 'year', 'asc').at(-1)?.id).toBe('b')
  })

  it('按收藏、封面、歌词与无损筛选', () => {
    expect(filterTracks(tracks, 'favorite', new Set(['a', 'c'])).map((item) => item.id)).toEqual([
      'a',
      'c',
    ])
    expect(filterTracks(tracks, 'cover').map((item) => item.id)).toEqual(['b'])
    expect(filterTracks(tracks, 'lossless').map((item) => item.id)).toEqual(['c'])
    expect(filterTracks(tracks, 'lyrics')).toEqual([])
    expect(isLossless(tracks[2])).toBe(true)
  })

  it('不修改原数组', () => {
    const original = tracks.map((item) => item.id)
    sortTracks(tracks, 'title')
    expect(tracks.map((item) => item.id)).toEqual(original)
  })
})
