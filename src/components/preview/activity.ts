import type { AiRun, AiRunStep, PipelineStage, ProductionJob } from '@/api/types'
import { stepResults } from '@/components/jobArtifacts'
import { CREW } from '@/components/crew/characters'

/** 「正在做什么」里的一条：谁、做了什么、什么时候。 */
export interface Activity {
  key: string
  who: string
  text: string
  /** 这一条开始的时间（毫秒时间戳）；算不出来为 0 */
  at: number
  failed?: boolean
}

const WHO: Record<PipelineStage, string> = {
  retrieval: CREW.caifeng.name,
  generation: CREW.zhibi.name,
  review: CREW.jiaoshen.name,
  illustration: CREW.huashi.name,
}

const QUERY = /"query"\s*:\s*"((?:[^"\\]|\\.)*)"/
const URL_ = /"url"\s*:\s*"((?:[^"\\]|\\.)*)"/

const pick = (re: RegExp, ...texts: string[]) => {
  for (const t of texts) {
    const m = t?.match(re)
    if (m) return m[1].replace(/\\"/g, '"')
  }
  return ''
}

function hostOf(url: string) {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return url }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** 一步 AI 动作说成人话；说不出有用信息的（模型决定下一步调什么）返回空，不进列表。 */
export function describeStep(stage: PipelineStage, s: AiRunStep, isLast: boolean): string {
  if (s.kind === 'skill') return `读了技能「${s.name}」`
  if (s.kind === 'tool') {
    if (/search/i.test(s.name)) {
      const q = pick(QUERY, s.inputSummary, s.outputSummary)
      return s.status === 'failed' ? `搜索没成功${q ? `：「${clip(q, 24)}」` : ''}` : q ? `搜索「${clip(q, 24)}」` : '搜索资料'
    }
    if (/fetch|read/i.test(s.name)) {
      const u = pick(URL_, s.inputSummary, s.outputSummary)
      const where = u ? hostOf(u) : '一个网页'
      return s.status === 'failed' ? `${where} 打不开，换别的来源` : `读了 ${where} 的网页`
    }
    return s.status === 'failed' ? `工具 ${s.name} 没调通` : `用了工具 ${s.name}`
  }
  // 模型
  if (stage === 'illustration') return s.status === 'failed' ? '这张没画出来' : `画好一张图 ${s.outputSummary.replace(/^1 张 /, '')}`
  if (s.outputSummary.startsWith('调用 ')) return ''
  if (!isLast) return ''
  if (s.status === 'failed') return '模型没答好'
  return { retrieval: '整理找到的资料', generation: '交了一稿', review: '交出检查结果', illustration: '' }[stage]
}

/**
 * 「正在做什么」：把 AI 每一步做的事按时间排成一列，最新的在上面。
 * 找资料交出资料清单后补一条「找到 N 条资料」。
 */
export function activityOf(job: ProductionJob, runs: AiRun[]): Activity[] {
  const out: Activity[] = []
  for (const r of runs) {
    let t = Date.parse(r.createdAt) || 0
    r.steps.forEach((s, i) => {
      const text = describeStep(r.stage, s, i === r.steps.length - 1)
      if (text) out.push({ key: `${r.runId}-${s.seq}`, who: WHO[r.stage] ?? '', text, at: t, failed: s.status === 'failed' })
      if (t) t += s.costMs
    })
  }
  const found = stepResults(job, 'material_list').at(-1)?.content.items.length
  const material = job.steps.find((s) => s.step === 'material' && s.status === 'succeeded')
  if (found !== undefined && material) {
    out.push({ key: 'found', who: CREW.caifeng.name, text: `找到 ${found} 条资料`, at: Date.parse(material.finishedAt ?? '') || 0 })
  }
  return out.sort((a, b) => b.at - a.at)
}

/** 时:分:秒，北京时间显示按浏览器时区。 */
export function hms(at: number): string {
  if (!at) return ''
  const d = new Date(at)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
}
