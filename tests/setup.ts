import { beforeEach, vi } from 'vitest'

type Listener = (event: Event) => void

/** 播放器 store 只依赖 <audio> 的少量 API，用最小假实现替代浏览器音频元素。 */
class FakeAudioElement {
  src = ''
  currentTime = 0
  duration = Number.NaN
  volume = 1
  muted = false
  preload = ''
  error: { code: number } | null = null
  paused = true

  private readonly listeners = new Map<string, Set<Listener>>()

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener)
  }

  getAttribute(name: string): string | null {
    return name === 'src' ? this.src || null : null
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.src = ''
  }

  load(): void {}

  play(): Promise<void> {
    this.paused = false
    this.emit('playing')
    return Promise.resolve()
  }

  pause(): void {
    this.paused = true
    this.emit('pause')
  }

  private emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type))
    }
  }
}

beforeEach(() => {
  vi.stubGlobal('Audio', FakeAudioElement)
})
