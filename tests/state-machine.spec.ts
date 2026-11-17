import { describe, expect, it } from 'vitest'
import { settleStatus, transition } from '../src/audio/state-machine'
import type { PlaybackEvent, PlaybackStatus } from '../src/audio/state-machine'

describe('playback state machine', () => {
  it('按加载 → 就绪 → 播放 → 暂停 → 播放流转', () => {
    let status: PlaybackStatus = 'idle'
    const events: PlaybackEvent[] = ['load', 'loaded', 'play', 'pause', 'play']
    const expected: PlaybackStatus[] = ['loading', 'ready', 'playing', 'paused', 'playing']

    events.forEach((event, index) => {
      status = transition(status, event)
      expect(status).toBe(expected[index])
    })
  })

  it('播放中等待数据进入缓冲，可播放后回到播放', () => {
    expect(transition('playing', 'wait')).toBe('buffering')
    expect(transition('buffering', 'play')).toBe('playing')
  })

  it('跳转使用 seeking/seeked，结束时进入 ended', () => {
    expect(transition('playing', 'seek')).toBe('seeking')
    expect(transition('seeking', 'seeked')).toBe('ready')
    expect(transition('playing', 'ended')).toBe('ended')
  })

  it('非法事件保持原状态，任何状态都可 reset 到 idle', () => {
    expect(transition('idle', 'pause')).toBe('idle')
    expect(transition('error', 'ended')).toBe('error')
    expect(transition('buffering', 'reset')).toBe('idle')
    expect(transition('ended', 'reset')).toBe('idle')
  })

  it('seek 结束后根据是否正在播放落回 playing / paused', () => {
    expect(settleStatus(true)).toBe('playing')
    expect(settleStatus(false)).toBe('paused')
  })
})
