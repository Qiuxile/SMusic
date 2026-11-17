import { describe, expect, it } from 'vitest'
import { formatDurationLong, formatTime } from '../src/utils/format'

describe('时间格式化', () => {
  it('播放时间使用 m:ss，并向下取整', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65.9)).toBe('1:05')
  })

  it('长时长按四舍五入后的总分钟计算', () => {
    expect(formatDurationLong(30)).toBe('1 分钟')
    expect(formatDurationLong(73.8 * 60)).toBe('1 小时 14 分钟')
  })

  it('分钟进位到 60 时转换为小时，不出现「60 分钟」', () => {
    expect(formatDurationLong(59 * 60 + 40)).toBe('1 小时')
    expect(formatDurationLong(2 * 3600 + 59 * 60 + 45)).toBe('3 小时')
  })

  it('不足一分钟按一分钟展示，非法值回退为零', () => {
    expect(formatDurationLong(20)).toBe('1 分钟')
    expect(formatDurationLong(Number.NaN)).toBe('0 分钟')
  })
})
