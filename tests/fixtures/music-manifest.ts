import type { MusicManifest, Track } from '../../src/types'

function track(id: string, album: string, title: string, duration: number): Track {
  return {
    id,
    file: `${album}/${title}.mp3`,
    url: `/music/${id}.mp3`,
    title,
    artist: '测试歌手',
    artists: ['测试歌手'],
    album,
    albumKey: `album-${album}`,
    duration,
    bitrate: 320,
    format: 'MP3',
    size: 1024,
    coverHue: 260,
    trackNo: null,
    year: null,
  }
}

const manifest: MusicManifest = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  tracks: [
    track('a1', '专辑 A', 'A1', 210),
    track('a2', '专辑 A', 'A2', 200),
    track('a3', '专辑 A', 'A3', 190),
    track('b1', '专辑 B', 'B1', 180),
    track('b2', '专辑 B', 'B2', 170),
    track('b3', '专辑 B', 'B3', 160),
  ],
  warnings: [],
}

export default manifest
