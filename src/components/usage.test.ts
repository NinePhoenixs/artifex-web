import { describe, expect, it } from 'vitest'
import { costText, usageText } from './usage'

describe('用量显示', () => {
  it('没花钱不显示钱', () => {
    expect(costText(0)).toBe('')
    expect(usageText({ tokens: 1585, cost: 0, ms: 8700 })).toBe('8.7 秒 · 1,585 token')
  })
  it('花了钱精确到分，不到一分单独说', () => {
    expect(costText(0.004)).toBe('不到 1 分钱')
    expect(usageText({ tokens: 20540, cost: 1.236, ms: 276000 })).toBe('4 分 36 秒 · 20,540 token · 1.24 元')
  })
})
