import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '../src/stores/player'
import manifest from './fixtures/music-manifest'

const [a1, a2, a3, b1, b2, b3] = manifest.tracks

describe('player.playTrack', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('整体替换队列后，点击相同索引的曲目会切换到新曲目', () => {
    const player = usePlayerStore()

    player.playTrack(a2, [a1, a2, a3])
    const audio = player.audio
    expect(player.index).toBe(1)
    expect(player.current?.id).toBe('a2')
    expect(audio?.getAttribute('src')).toBe(a2.url)
    expect(player.status).toBe('playing')

    // 回归场景：新列表的第 2 首仍是 index 1，但已不是同一首歌
    player.playTrack(b2, [b1, b2, b3])

    expect(player.index).toBe(1)
    expect(player.current?.id).toBe('b2')
    expect(audio?.getAttribute('src')).toBe(b2.url)
    expect(player.duration).toBe(b2.duration)
  })

  it('重复点击当前正在播放的曲目时从头播放且不重新加载音源', () => {
    const player = usePlayerStore()

    player.playTrack(a2, [a1, a2, a3])
    const audio = player.audio
    if (audio) audio.currentTime = 42

    player.playTrack(a2, [a1, a2, a3])

    expect(player.current?.id).toBe('a2')
    expect(audio?.getAttribute('src')).toBe(a2.url)
    expect(audio?.currentTime).toBe(0)
    expect(player.currentTime).toBe(0)
  })

  it('暂停与继续播放会同步状态机', () => {
    const player = usePlayerStore()
    player.playTrack(a1, [a1, a2])
    expect(player.status).toBe('playing')

    player.pause()
    expect(player.status).toBe('paused')
    expect(player.playing).toBe(false)
  })
})
