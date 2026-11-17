/** 播放器显式状态与合法转换，UI 不应自行推断播放状态。 */

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'seeking'
  | 'ended'
  | 'error'

export type PlaybackEvent =
  | 'load'
  | 'loaded'
  | 'play'
  | 'pause'
  | 'wait'
  | 'seek'
  | 'seeked'
  | 'ended'
  | 'error'
  | 'reset'

const TRANSITIONS: Record<PlaybackStatus, Partial<Record<PlaybackEvent, PlaybackStatus>>> = {
  idle: { load: 'loading', error: 'error' },
  loading: { loaded: 'ready', play: 'playing', pause: 'paused', error: 'error', reset: 'idle' },
  ready: { play: 'playing', pause: 'paused', wait: 'buffering', seek: 'seeking', load: 'loading', error: 'error', reset: 'idle' },
  playing: { pause: 'paused', wait: 'buffering', seek: 'seeking', ended: 'ended', load: 'loading', error: 'error', reset: 'idle' },
  paused: { play: 'playing', seek: 'seeking', load: 'loading', ended: 'ended', error: 'error', reset: 'idle' },
  buffering: { play: 'playing', pause: 'paused', error: 'error', reset: 'idle' },
  seeking: { seeked: 'ready', play: 'playing', pause: 'paused', error: 'error', reset: 'idle' },
  ended: { play: 'playing', load: 'loading', error: 'error', reset: 'idle' },
  error: { load: 'loading', play: 'playing', reset: 'idle' },
}

/** 非法事件返回原状态，调用方无需处理异常。 */
export function transition(status: PlaybackStatus, event: PlaybackEvent): PlaybackStatus {
  return TRANSITIONS[status][event] ?? status
}

/** 音频事件回到播放/暂停的收尾状态（seeked、canplay 等需要上下文）。 */
export function settleStatus(playing: boolean): PlaybackStatus {
  return playing ? 'playing' : 'paused'
}
