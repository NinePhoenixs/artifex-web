import { describe, expect, it } from 'vitest'
import type { AiRun, JobStepRecord, ProductionJob } from '@/api/types'
import { clock, crewProgress, crewSlots, crewSteps, friendlyError, liveCaption, revisionCount } from './derive'

const job = (over: Partial<ProductionJob> = {}): ProductionJob => ({
  jobId: 'j1', appId: 'a', recipeId: 'r', subjectId: 's', topic: '露营', status: 'generating', currentStep: 'generation',
  finalResultId: '', steps: [], deliverable: null, ...over,
})
const step = (s: Partial<JobStepRecord> & Pick<JobStepRecord, 'step'>): JobStepRecord =>
  ({ attempt: 1, status: 'succeeded', costMs: 177000, results: [], ...s })

describe('进度角色的状态', () => {
  it('没开配图就没有画师；开了或已有配图这一步才有', () => {
    expect(crewSteps(job())).toEqual(['material', 'generation', 'review', 'delivery'])
    expect(crewSteps(job({ recipeSnapshot: { illustration: { enabled: true, count: 2 } } }))).toContain('illustration')
  })

  it('做完的写结果，正在做的写实时说明，没轮到的在等', () => {
    const j = job({
      steps: [
        step({ step: 'material', results: [{ resultId: 'r1', format: 'material_list', files: [], content: { items: [
          { no: 1, title: 'a', url: '', excerpt: '', publishedAt: '' }, { no: 2, title: 'b', url: '', excerpt: '', publishedAt: '' }] } }] }),
        step({ step: 'generation', status: 'running', costMs: 0 }),
      ],
    })
    const slots = crewSlots(j, [])
    expect(slots.map((s) => s.state)).toEqual(['done', 'work', 'wait', 'wait'])
    expect(slots[0].caption).toBe('找到 2 条资料 · 2:57')
    expect(slots[1].caption).toBe('正在写第 1 稿')
    expect(crewProgress(slots)).toBeCloseTo(1 / 3)
  })

  it('检查没过、自动返修：校审等下一稿，执笔写第 2 稿', () => {
    const j = job({
      steps: [
        step({ step: 'material' }),
        step({ step: 'generation' }),
        step({ step: 'review', status: 'failed', errorMsg: '评审不通过: 用了「最」；自动修改第 1 次' }),
        step({ step: 'generation', attempt: 2, status: 'running', costMs: 0 }),
      ],
    })
    const slots = crewSlots(j, [])
    expect(slots[1]).toMatchObject({ state: 'work', attempt: 2, caption: '正在写第 2 稿' })
    expect(slots[2]).toMatchObject({ state: 'ready', caption: '退回去改了，等第 2 稿' })
    expect(revisionCount(j)).toBe(1)
  })

  it('真失败：那一步出错，写原因', () => {
    const j = job({ status: 'failed', steps: [step({ step: 'material', status: 'failed', errorMsg: '没找到能用的资料' })] })
    const slots = crewSlots(j, [])
    expect(slots[0]).toMatchObject({ state: 'fail', caption: '没找到能用的资料' })
    expect(slots[1].caption).toBe('没轮到')
  })

  it('找资料时按 AI 最后一个动作说在干什么', () => {
    const run = (steps: AiRun['steps']): AiRun => ({ runId: 'x', stage: 'retrieval', attempt: 1, agentId: '', modelId: '', model: '',
      status: 'running', granted: [], skipped: [], inputTokens: 0, outputTokens: 0, cost: '0', costMs: 0, errorMsg: '', steps, createdAt: '' })
    const tool = (name: string, seq: number) => ({ seq, kind: 'tool' as const, name, inputSummary: '', outputSummary: '', status: 'succeeded' as const, costMs: 1 })
    expect(liveCaption('material', 1, [])).toBe('准备找资料')
    expect(liveCaption('material', 1, [run([tool('web_search', 1)])])).toBe('正在搜索资料')
    expect(liveCaption('material', 1, [run([tool('web_search', 1), tool('web_fetch', 2), tool('web_fetch', 3)])])).toBe('正在读第 2 篇资料')
  })

  it('失败原因去掉技术前缀', () => {
    expect(friendlyError('AI 检查: 运行 run-17938761 failed: 模型的输出被截断')).toBe('模型的输出被截断')
    expect(friendlyError('没找到能用的资料')).toBe('没找到能用的资料')
  })

  it('用时写成分:秒', () => {
    expect(clock(177000)).toBe('2:57')
    expect(clock(11000)).toBe('0:11')
  })
})
