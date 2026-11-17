import { describe, expect, it } from 'vitest'
import type { Track } from '../src/types'
import {
  matchScore,
  normalizeSearch,
  rankByName,
  rankTracks,
  tokenScore,
} from '../src/utils/search'

function track(overrides: Partial<Track> & Pick<Track, 'id' | 'title'>): Track {
  return {
    file: `${overrides.id}.mp3`,
    url: `/music/${overrides.id}.mp3`,
    artist: '未知歌手',
    artists: ['未知歌手'],
    album: '未知专辑',
    albumKey: 'unknown',
    duration: 180,
    format: 'MP3',
    size: 1024,
    coverHue: 150,
    ...overrides,
  }
}

const tracks = [
  track({ id: '1', title: '稻香', artist: '周杰伦', album: '魔杰座' }),
  track({ id: '2', title: '晴天', artist: '周杰伦', album: '叶惠美' }),
  track({ id: '3', title: '起风了', artist: '买辣椒也用券', album: '起风了' }),
  track({ id: '4', title: 'Rather Be', artist: 'Clean Bandit', album: 'New Eyes' }),
]

describe('search utilities', () => {
  it('归一化全半角、大小写与标点', () => {
    expect(normalizeSearch('  Ｒａｔｈｅｒ   Be！ ')).toBe('rather be')
    expect(normalizeSearch('周杰伦 - 稻香')).toBe('周杰伦 稻香')
  })

  it('标题、歌手、专辑都可以命中，标题优先', () => {
    expect(rankTracks(tracks, '稻香')[0].track.id).toBe('1')
    const artistHits = rankTracks(tracks, '周杰伦')
    expect(artistHits.map((entry) => entry.track.id)).toEqual(['1', '2'])
    expect(rankTracks(tracks, '叶惠美')[0].track.id).toBe('2')
  })

  it('支持多词跨字段匹配', () => {
    const result = rankTracks(tracks, '周杰伦 晴天')
    expect(result[0].track.id).toBe('2')
  })

  it('对英文拼写和中文常见错字提供一次编辑距离容错', () => {
    expect(tokenScore('Rather Be', 'rather')).toBeGreaterThan(0)
    expect(tokenScore('周杰伦', '周杰仑')).toBeGreaterThan(0)
    expect(tokenScore('周杰伦', '林俊杰')).toBe(0)
    expect(matchScore('Clean Bandit', 'clean bandt')).toBeGreaterThan(0)
  })

  it('按名称给专辑和歌手排序', () => {
    const albums = [
      { name: '叶惠美', artist: '周杰伦' },
      { name: '魔杰座', artist: '周杰伦' },
      { name: 'New Eyes', artist: 'Clean Bandit' },
    ]
    expect(rankByName(albums, '杰伦', (album) => album.artist)[0].item.name).toBeDefined()
    expect(rankByName(albums, 'new', (album) => album.name)[0].item.name).toBe('New Eyes')
  })

  it('空查询不返回结果', () => {
    expect(rankTracks(tracks, '   ')).toEqual([])
  })
})
