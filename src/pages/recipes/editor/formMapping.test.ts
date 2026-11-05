import { describe, expect, it } from 'vitest'
import type { Recipe } from '@/api/types'
import { ratioAfterLayoutChange, toAiSetting } from './formMapping'

describe('提交 AI 装配', () => {
  it('缺的步骤补成空：Agent / 提示词空串，能力空数组，动作空对象', () => {
    const partial = {
      agents: { generation: 'zhibi-pro' },
      grants: { retrieval: ['web_search'] },
      prompts: { generation: '围绕「{{主题}}」写一篇' },
    }
    expect(toAiSetting(partial, undefined)).toEqual({
      agents: { retrieval: '', generation: 'zhibi-pro', review: '', illustration: '' },
      grants: { retrieval: ['web_search'], generation: [], review: [] },
      prompts: { retrieval: '', generation: '围绕「{{主题}}」写一篇', review: '', illustration: '' },
      actions: { retrieval: {}, generation: {}, review: {} },
    })
  })

  it('表单里没有就用配方原来的；两边都没有则不传（= 不改）', () => {
    const recipe = { aiSetting: { prompts: { review: '逐条核对' } } } as unknown as Recipe
    expect(toAiSetting(undefined, recipe)?.prompts.review).toBe('逐条核对')
    expect(toAiSetting(undefined, undefined)).toBeUndefined()
  })
})

describe('换版式时图片比例跟着换', () => {
  it('还是旧版式的默认比例就换成新版式的默认；用户改过的不动', () => {
    expect(ratioAfterLayoutChange('note', 'article', '3:4')).toBe('16:9')
    expect(ratioAfterLayoutChange('article', 'note', '16:9')).toBe('3:4')
    expect(ratioAfterLayoutChange('note', 'article', '1:1')).toBe('1:1')
    expect(ratioAfterLayoutChange('note', 'note', '1:1')).toBe('1:1')
  })
})
