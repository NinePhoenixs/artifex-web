import { describe, expect, it } from 'vitest'
import type { AiRun, ProductionJob } from '@/api/types'
import { activityOf, describeStep } from './activity'

const run = (over: Partial<AiRun>): AiRun => ({
  runId: 'r1', stage: 'retrieval', attempt: 1, agentId: '', modelId: '', model: 'm', status: 'running', granted: [], skipped: [],
  inputTokens: 0, outputTokens: 0, cost: '0', costMs: 0, errorMsg: '', steps: [], createdAt: '2026-11-05T10:00:00+08:00', ...over,
})

describe('正在做什么', () => {
  it('搜索、读网页、技能说成人话；模型决定调什么工具那一步不列', () => {
    expect(describeStep('retrieval', { seq: 1, kind: 'tool', name: 'web_search', inputSummary: '{"query":"港理工 27fall 计算机"}', outputSummary: '', status: 'succeeded', costMs: 0 }, false))
      .toBe('搜索「港理工 27fall 计算机」')
    expect(describeStep('retrieval', { seq: 2, kind: 'tool', name: 'web_fetch', inputSummary: '{"url":"https://www.polyu.edu.hk/a"}', outputSummary: '', status: 'failed', costMs: 0 }, false))
      .toBe('polyu.edu.hk 打不开，换别的来源')
    expect(describeStep('generation', { seq: 1, kind: 'skill', name: '长文写法', inputSummary: '', outputSummary: '', status: 'succeeded', costMs: 0 }, false))
      .toBe('读了技能「长文写法」')
    expect(describeStep('retrieval', { seq: 3, kind: 'model', name: 'm', inputSummary: '', outputSummary: '调用 web_search(…)', status: 'succeeded', costMs: 0 }, false)).toBe('')
  })

  it('按时间倒序，找完资料补一条「找到 N 条资料」', () => {
    const job = {
      steps: [{ step: 'material', attempt: 1, status: 'succeeded', costMs: 5000, finishedAt: '2026-11-05T10:00:09+08:00',
        results: [{ resultId: 'x', format: 'material_list', files: [], content: { items: [{ no: 1 }, { no: 2 }] } }] }],
    } as unknown as ProductionJob
    const list = activityOf(job, [run({ steps: [
      { seq: 1, kind: 'tool', name: 'web_search', inputSummary: '{"query":"a"}', outputSummary: '', status: 'succeeded', costMs: 3000 },
      { seq: 2, kind: 'tool', name: 'web_fetch', inputSummary: '{"url":"https://b.com/x"}', outputSummary: '', status: 'succeeded', costMs: 1000 },
    ] })])
    expect(list.map((a) => a.text)).toEqual(['找到 2 条资料', '读了 b.com 的网页', '搜索「a」'])
    expect(list[1].at - list[2].at).toBe(3000)
  })
})
