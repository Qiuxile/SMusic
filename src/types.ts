/** 全站共享的领域类型，src 与构建期插件共用。 */

export type LyricSource = 'embedded' | 'lrc'

export interface LyricLine {
  /** 秒 */
  time: number
  text: string
}

export interface Lyrics {
  /** 原始文本（LRC 或纯文本），仅用于调试 */
  raw: string
  lines: LyricLine[]
  /** 是否带时间轴 */
  synced: boolean
  source: LyricSource
}

export interface Track {
  /** 文件相对路径的散列，跨构建稳定 */
  id: string
  /** 相对 music/ 的路径 */
  file: string
  /** 浏览器可直接使用的相对 URL */
  url: string
  title: string
  artist: string
  artists: string[]
  album: string
  albumKey: string
  duration: number
  bitrate?: number
  format: string
  size: number
  cover?: string
  coverHue: number
  lyrics?: Lyrics
  trackNo?: number | null
  year?: number | null
}

export interface MusicManifest {
  generatedAt: string
  tracks: Track[]
  warnings: string[]
}
