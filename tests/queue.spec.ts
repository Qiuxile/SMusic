import { describe, expect, it } from 'vitest'
import { buildShuffleOrder, stepShuffle } from '../src/audio/queue'

describe('shuffle order', () => {
  it('以当前曲目开头并包含全部队列位置', () => {
    const order = buildShuffleOrder(5, 2)
    expect(order[0]).toBe(2)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
    expect(new Set(order).size).toBe(order.length)
  })

  it('用可注入的随机源生成稳定顺序', () => {
    expect(buildShuffleOrder(4, 1, () => 0)).toEqual([1, 2, 3, 0])
  })

  it('空队列返回空顺序', () => {
    expect(buildShuffleOrder(0)).toEqual([])
  })

  it('向前/向后移动并保持长度为队列长度', () => {
    const order = buildShuffleOrder(5, 1, () => 0)
    const forward = stepShuffle(order, 5, 1, 1, () => 0)
    expect(forward.position).not.toBe(1)
    expect(forward.order).toHaveLength(5)
    expect(forward.cursor).toBe(1)

    const backward = stepShuffle(forward.order, 5, forward.position, -1, () => 0)
    expect(backward.position).toBe(1)
    expect(backward.cursor).toBe(0)
  })

  it('走到末尾后重新洗牌并回到有效位置', () => {
    const order = [0, 1, 2]
    const step = stepShuffle(order, 3, 2, 1, () => 0)
    expect(step.order).toHaveLength(3)
    expect(step.position).toBeGreaterThanOrEqual(0)
    expect(step.position).toBeLessThan(3)
    expect(step.cursor).toBe(0)
  })
})
