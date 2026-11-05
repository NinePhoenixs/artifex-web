import { describe, expect, it } from 'vitest'
import type { JobFile, ProductionJob } from '@/api/types'
import { articleHtml, articleMarkdown, noteText, parseBlocks, pickLayout, previewContent, topicsText, trailingImages } from './content'

const file = (no: number, role: JobFile['role'] = 'illustration'): JobFile =>
  ({ no, role, fileId: `f${no}`, url: `/v1/files/f${no}/content`, caption: `图${no}` })
const job = (over: Partial<ProductionJob> = {}): ProductionJob => ({
  jobId: 'j1', appId: 'a', recipeId: 'r', subjectId: 's', topic: 't', status: 'success', currentStep: 'delivery',
  finalResultId: '', steps: [], deliverable: null, ...over,
})
const url = (f: JobFile) => `https://x.test${f.url}`

describe('版式', () => {
  it('交付物上记着就用它；没交付看配方快照；都没有按小红书笔记', () => {
    const d = { deliverableId: 'd', format: 'article' as const, files: [], content: { layout: 'article' as const, title: 't', body: 'b', tags: [], files: [] } }
    expect(pickLayout(job({ deliverable: d }))).toBe('article')
    expect(pickLayout(job({ recipeSnapshot: { layout: 'article' } }))).toBe('article')
    expect(pickLayout(job())).toBe('note')
  })

  it('没交付时预览最新一稿', () => {
    const c = previewContent(job({ status: 'reviewing', steps: [{ step: 'generation', attempt: 1, status: 'succeeded', costMs: 1, results: [
      { resultId: 'r', format: 'article_draft', files: [], content: { title: '稿', titleCandidates: [], body: '正文', tags: ['露营'], imageHints: [] } }] }] }))
    expect(c).toMatchObject({ title: '稿', delivered: false, layout: 'note' })
  })
})

describe('文章正文', () => {
  const body = '开头一段\n\n## 一、睡垫\n| 环境 | R 值 |\n| --- | --- |\n| 冬季 | 4 以上 |\n\n![睡垫对比](image:2)\n\n- 第一条\n- 第二条\n\n> 两张垫子叠着用'
  it('按块解析：标题、表格、放图、列表、引用', () => {
    expect(parseBlocks(body).map((b) => b.type)).toEqual(['p', 'h', 'table', 'img', 'ul', 'quote'])
    expect(parseBlocks(body)[3]).toEqual({ type: 'img', no: 2, alt: '睡垫对比' })
  })

  it('导出 Markdown：头图放在标题下，image:N 换成完整地址，没引用的图放文末', () => {
    const c = { layout: 'article' as const, title: '保暖指南', body, tags: ['露营'], files: [file(1, 'cover'), file(2), file(3)], delivered: true }
    const md = articleMarkdown(c, url)
    expect(md.startsWith('# 保暖指南\n\n![图1](https://x.test/v1/files/f1/content)')).toBe(true)
    expect(md).toContain('![睡垫对比](https://x.test/v1/files/f2/content)')
    expect(md).not.toContain('image:')
    expect(trailingImages(c).map((f) => f.no)).toEqual([3])
    expect(md.endsWith('#露营')).toBe(true)
  })

  it('复制全文的 HTML：转义文字，图用完整地址', () => {
    const c = { layout: 'article' as const, title: 'A<B', body: '## 小节\n![x](image:2)', tags: [], files: [file(2)], delivered: true }
    const html = articleHtml(c, url)
    expect(html).toContain('<h1>A&lt;B</h1>')
    expect(html).toContain('<h2>小节</h2>')
    expect(html).toContain('src="https://x.test/v1/files/f2/content"')
  })
})

describe('小红书文案', () => {
  it('标题 + 纯文本正文 + 话题', () => {
    expect(noteText({ title: '冬天露营不挨冻', body: '**第一次**露营\n\n1. 睡垫', tags: ['冬季露营', '#露营装备'] }))
      .toBe('冬天露营不挨冻\n\n第一次露营\n\n1. 睡垫\n\n#冬季露营 #露营装备')
    expect(topicsText(['a', '＃b'])).toBe('#a #b')
  })
})
