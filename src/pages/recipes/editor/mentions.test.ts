import { describe, expect, it } from 'vitest'
import { findMentions, splitMentions } from './mentions'

const names = ['商品库', '商品库 Pro', '小红书种草写法', 'Context7 文档库']

describe('findMentions', () => {
  it('带空格的名字取最长匹配，按出现顺序去重', () => {
    expect(findMentions('用 @商品库 Pro 查，按@小红书种草写法，再 @商品库 Pro', names)).toEqual(['商品库 Pro', '小红书种草写法'])
  })
  it('不认识的、邮箱、孤立的 @ 都不算', () => {
    expect(findMentions('用 @热点榜，发 ops@example.com，价格 @ 199', names)).toEqual([])
  })
})

describe('splitMentions', () => {
  it('切出点名片段，其余原样保留，拼回去等于原文', () => {
    const text = '先用 @商品库 Pro 查，再用 @热点榜看看，邮箱 a@商品库 不算'
    const parts = splitMentions(text, ['商品库', '商品库 Pro', '热点榜'])
    expect(parts.map((p) => p.text).join('')).toBe(text)
    expect(parts.filter((p) => p.name).map((p) => p.text)).toEqual(['@商品库 Pro', '@热点榜'])
  })
  it('没有点名时整段是一个普通片段', () => {
    expect(splitMentions('普通文字', ['商品库'])).toEqual([{ text: '普通文字' }])
  })
})
