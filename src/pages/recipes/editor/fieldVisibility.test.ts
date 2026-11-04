import { describe, expect, it } from 'vitest'
import { formFieldOf, sectionOfField } from './fieldVisibility'

describe('AI 装配的字段错误定位', () => {
  it('每一步的提示词、授权、设置错误都跳到那一步；整份配方的设置跳到基本信息', () => {
    expect(sectionOfField('aiSetting.grants.generation[1]')).toBe('generation')
    expect(sectionOfField('aiSetting.prompts.review')).toBe('review')
    expect(sectionOfField('materialSpec.freshness')).toBe('retrieval')
    expect(sectionOfField('aiSetting.prompts.generation')).toBe('generation')
    expect(sectionOfField('reviewPolicy.autoRevisionCount')).toBe('review')
    expect(sectionOfField('aiSetting.model')).toBe('basic')
    expect(sectionOfField('name')).toBe('basic')
  })

  it('授权清单的下标错误标到整个阶段的清单上', () => {
    expect(formFieldOf('aiSetting.grants.generation[1]')).toBe('aiSetting.grants.generation')
    expect(formFieldOf('aiSetting.costCapCent')).toBe('aiSetting.costCapCent')
    expect(formFieldOf('materialSpec.allowedSources.2')).toBe('materialSpec.allowedSources.2')
  })
})
