import type { Track } from '../types'

/** 搜索归一化：全半角、大小写、常见分隔符不影响匹配。 */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_/·.,，。!！?？'"“”‘’()（）[\]【】]+/g, ' ')
    .trim()
}

function editDistance(a: string, b: string, limit = 2): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > limit) return limit + 1

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      current.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > limit) return limit + 1
    previous = current
  }
  return previous[b.length]
}

function isSubsequence(haystack: string, needle: string): boolean {
  let cursor = 0
  for (const char of haystack) {
    if (char === needle[cursor]) cursor += 1
    if (cursor === needle.length) return true
  }
  return needle.length === 0
}

/**
 * 单个词的匹配分数（0–100）。
 * 依次尝试精确、前缀、包含、顺序子序列与一次编辑距离，兼顾中文与英文拼写错误。
 */
export function tokenScore(text: string, token: string): number {
  const haystack = normalizeSearch(text)
  const needle = normalizeSearch(token)
  if (!haystack || !needle) return 0
  if (haystack === needle) return 100
  if (haystack.startsWith(needle)) return 92 - Math.min(10, haystack.length - needle.length)
  const position = haystack.indexOf(needle)
  if (position >= 0) return 82 - Math.min(12, position)

  if (needle.length >= 2 && isSubsequence(haystack, needle)) {
    return 56 - Math.min(16, haystack.length - needle.length)
  }

  if (needle.length >= 3) {
    const words = haystack.split(' ').filter(Boolean)
    let best = 0
    for (const word of words) {
      if (Math.abs(word.length - needle.length) > 2) continue
      const distance = editDistance(word, needle, 2)
      const allowed = needle.length >= 6 ? 2 : 1
      if (distance <= allowed) {
        best = Math.max(best, 44 - distance * 8)
      }
    }
    if (best > 0) return best
  }

  return 0
}

/** 多词查询需要每个词都能在文本中找到，返回平均分。 */
export function matchScore(text: string, query: string): number {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean)
  if (!tokens.length) return 0
  let total = 0
  for (const token of tokens) {
    const score = tokenScore(text, token)
    if (score === 0) return 0
    total += score
  }
  return total / tokens.length
}

export interface RankedTrack {
  track: Track
  score: number
}

/** 标题优先于歌手，歌手优先于专辑；同一首歌只出现一次。 */
export function rankTracks(tracks: Track[], query: string): RankedTrack[] {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean)
  if (!tokens.length) return []

  const ranked: RankedTrack[] = []
  for (const track of tracks) {
    const fields = [
      { text: track.title, weight: 1.25 },
      { text: track.artist, weight: 1 },
      { text: track.artists.join(' '), weight: 0.95 },
      { text: track.album, weight: 0.82 },
    ]

    let total = 0
    let matchedAll = true
    for (const token of tokens) {
      let best = 0
      for (const field of fields) {
        best = Math.max(best, tokenScore(field.text, token) * field.weight)
      }
      if (best === 0) {
        matchedAll = false
        break
      }
      total += best
    }
    if (!matchedAll) continue

    const fullQuery = normalizeSearch(query)
    const title = normalizeSearch(track.title)
    if (title === fullQuery) total += 120
    else if (title.startsWith(fullQuery)) total += 55

    ranked.push({ track, score: total / tokens.length })
  }

  return ranked.sort(
    (a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title, 'zh-Hans-CN'),
  )
}

/** 专辑/歌手/歌单等单个名称字段的排序。 */
export function rankByName<T>(
  items: T[],
  query: string,
  nameOf: (item: T) => string,
  subOf?: (item: T) => string,
): { item: T; score: number }[] {
  return items
    .map((item) => {
      const nameScore = matchScore(nameOf(item), query) * 1.2
      const subScore = subOf ? matchScore(subOf(item), query) * 0.85 : 0
      return { item, score: Math.max(nameScore, subScore) }
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || nameOf(a.item).localeCompare(nameOf(b.item), 'zh-Hans-CN'),
    )
}
