import { describe, expect, it } from 'vitest'
import type { ProductionJob } from '@/api/types'
import { jobArticle, jobImages, lastFailedStep } from './jobArtifacts'

const base: ProductionJob = {
  jobId: 'j1', appId: 'a1', recipeId: 'r1', subjectId: 's', topic: '露营', status: 'reviewing', currentStep: 'review',
  finalResultId: '', steps: [], deliverable: null,
}

const draft = (n: number) => ({
  resultId: `res-${n}`, format: 'article_draft' as const, files: [],
  content: { title: `第 ${n} 稿`, titleCandidates: [], body: '正文', tags: ['露营'], imageHints: [] },
})

describe('文案', () => {
  it('没交付取最新一稿，交付了取交付物', () => {
    const job: ProductionJob = {
      ...base,
      steps: [
        { step: 'generation', attempt: 1, status: 'succeeded', costMs: 1, results: [draft(1)] },
        { step: 'review', attempt: 1, status: 'failed', costMs: 1, errorMsg: '没过', results: [] },
        { step: 'generation', attempt: 2, status: 'succeeded', costMs: 1, results: [draft(2)] },
      ],
    }
    expect(jobArticle(job).title).toBe('第 2 稿')
    expect(lastFailedStep(job)?.step).toBe('review')
    const delivered = { ...job, deliverable: { deliverableId: 'd', format: 'article' as const, files: [],
      content: { title: '成品', body: 'b', tags: [], files: [] } } }
    expect(jobArticle(delivered).title).toBe('成品')
  })
})

describe('图集', () => {
  it('按序号排，封面在前，没画出来的也留着、不带文件', () => {
    const job: ProductionJob = {
      ...base,
      steps: [{
        step: 'illustration', attempt: 1, status: 'succeeded', costMs: 1,
        results: [{
          resultId: 'res-3', format: 'image_set',
          files: [
            { no: 1, role: 'cover', fileId: 'f1', url: '/v1/files/f1/content', width: 3, height: 4 },
            { no: 3, role: 'illustration', fileId: 'f3', url: '/v1/files/f3/content' },
          ],
          content: { images: [
            { no: 3, role: 'illustration', caption: '星空', fileId: 'f3', status: 'succeeded' },
            { no: 1, role: 'cover', caption: '帐篷', fileId: 'f1', status: 'succeeded' },
            { no: 2, role: 'illustration', caption: '篝火', status: 'failed', error: '超时' },
          ] },
        }],
      }],
    }
    const imgs = jobImages(job)
    expect(imgs.map((a) => `${a.role}${a.no}`)).toEqual(['cover1', 'illustration2', 'illustration3'])
    expect(imgs[0].file?.width).toBe(3)
    expect(imgs[1].file).toBeUndefined()
    expect(imgs[1].error).toBe('超时')
  })

  it('没有图片组时取交付物里的图', () => {
    const job: ProductionJob = { ...base, deliverable: { deliverableId: 'd', format: 'article',
      content: { title: 't', body: 'b', tags: [], files: [] },
      files: [{ no: 2, role: 'illustration', fileId: 'f2', url: '/f2' }, { no: 1, role: 'cover', fileId: 'f1', url: '/f1' }] } }
    expect(jobImages(job).map((a) => a.file?.fileId)).toEqual(['f1', 'f2'])
  })
})
