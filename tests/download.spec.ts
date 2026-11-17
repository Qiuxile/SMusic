import { describe, expect, it } from 'vitest'
import { safeFileName, trackFileName } from '../src/utils/download'
import manifest from './fixtures/music-manifest'

const [a1] = manifest.tracks

describe('download filename', () => {
  it('替换文件名中的非法字符并压缩空白', () => {
    expect(safeFileName('AC/DC: Live * 1979?')).toBe('AC_DC_ Live _ 1979_')
    expect(safeFileName('  歌名...  ')).toBe('歌名')
  })

  it('用「歌手 - 歌名」生成带扩展名的下载文件名', () => {
    expect(trackFileName(a1)).toBe('测试歌手 - A1.mp3')
  })

  it('未知歌手不写入前缀，扩展名跟随音频实际 URL', () => {
    expect(trackFileName({ ...a1, artist: '未知歌手', url: '/music/abc.flac' })).toBe('A1.flac')
  })
})
