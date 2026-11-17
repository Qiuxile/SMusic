import type { Track } from '../types'

/** 去掉 Windows/macOS 文件名非法字符，并限制长度 */
export function safeFileName(input: string, fallback = 'download'): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 120)
  return cleaned || fallback
}

function trackExtension(track: Track): string {
  const fromUrl = track.url.split('.').pop()
  if (fromUrl && /^[a-z0-9]{1,5}$/i.test(fromUrl)) return fromUrl.toLowerCase()
  const fromFile = track.file.split('.').pop()
  return fromFile && /^[a-z0-9]{1,5}$/i.test(fromFile) ? fromFile.toLowerCase() : 'mp3'
}

/** 下载时使用的友好文件名：「歌手 - 歌名.mp3」 */
export function trackFileName(track: Track): string {
  const artist = track.artist.trim()
  const base = artist && artist !== '未知歌手' ? `${artist} - ${track.title}` : track.title
  return `${safeFileName(base, 'track')}.${trackExtension(track)}`
}

/** 通过临时 <a download> 下载同源音频，交给浏览器原生下载管理器 */
export function downloadTrack(track: Track): void {
  const anchor = document.createElement('a')
  anchor.href = track.url
  anchor.download = trackFileName(track)
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/** 把歌词文本导出为文件（.lrc 或 .txt） */
export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
