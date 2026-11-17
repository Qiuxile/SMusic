/** 随机播放顺序：以当前曲目开头，其余位置做 Fisher–Yates 洗牌。 */
export function buildShuffleOrder(
  length: number,
  start = -1,
  random: () => number = Math.random,
): number[] {
  if (length <= 0) return []
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== start)
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  if (start >= 0 && start < length) rest.unshift(start)
  return rest
}

/**
 * 在当前随机顺序中前后移动。
 * 返回新的顺序（走到尽头时重新洗牌）、目标队列位置与游标。
 */
export function stepShuffle(
  order: number[],
  length: number,
  currentPosition: number,
  delta: 1 | -1,
  random: () => number = Math.random,
): { order: number[]; position: number; cursor: number } {
  if (length <= 0) return { order: [], position: -1, cursor: -1 }
  let list = order.length === length ? [...order] : buildShuffleOrder(length, currentPosition, random)
  let cursor = list.indexOf(currentPosition)
  if (cursor === -1) {
    list = buildShuffleOrder(length, currentPosition, random)
    cursor = 0
  }
  let next = cursor + delta
  if (next >= list.length) {
    list = buildShuffleOrder(length, -1, random)
    next = 0
  } else if (next < 0) {
    next = list.length - 1
  }
  return { order: list, position: list[next], cursor: next }
}
