import { describe, expect, it } from 'vitest'
import { findVariables } from './variables'

describe('findVariables', () => {
  it('跨三段提示词去重、按出现顺序，不含主题和空名字', () => {
    expect(findVariables('写{{主题}}里的{{ 商品名 }}', undefined, '核对{{商品名}}和{{品牌}}，{{}}')).toEqual(['商品名', '品牌'])
  })
})
