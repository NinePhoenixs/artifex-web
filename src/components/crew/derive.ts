import type { AiRun, JobStepName, JobStepRecord, ProductionJob } from '@/api/types'
import { stepResults } from '@/components/jobArtifacts'
import type { CrewId } from './characters'

/** 进度里的一步由哪个角色做。 */
export type CrewStep = Extract<JobStepName, 'material' | 'generation' | 'review' | 'illustration' | 'delivery'>

export const CREW_OF: Record<CrewStep, CrewId> = {
  material: 'caifeng',
  generation: 'zhibi',
  review: 'jiaoshen',
  illustration: 'huashi',
  delivery: 'xiaodi',
}

/**
 * 角色的状态：
 * wait 还没轮到 · ready 被叫醒等着接活（返修时校审等下一稿）· work 干活 · done 做完 · fail 出错
 */
export type CrewState = 'wait' | 'ready' | 'work' | 'done' | 'fail'

export interface CrewSlot {
  step: CrewStep
  state: CrewState
  /** 下面那行小字 */
  caption: string
  /** 这一步第几次（写第几稿） */
  attempt: number
}

/** 返修那次检查失败时，后端在原因末尾写「；自动修改第 N 次」。 */
const REVISION = /自动修改第\s*\d+\s*次/

const RUN_STAGE: Partial<Record<CrewStep, AiRun['stage']>> = {
  material: 'retrieval', generation: 'generation', review: 'review', illustration: 'illustration',
}

/** 这次生产要走哪几步：配方开了配图、或已经有配图这一步，才有画师。 */
export function crewSteps(job: ProductionJob): CrewStep[] {
  const drawing = Boolean(job.recipeSnapshot?.illustration?.enabled) || job.steps.some((s) => s.step === 'illustration')
  return ['material', 'generation', 'review', ...(drawing ? ['illustration' as const] : []), 'delivery']
}

/** 这次检查没过、自动返修了（不是真失败）。 */
export const isRevision = (s: JobStepRecord) => s.step === 'review' && s.status === 'failed' && REVISION.test(s.errorMsg ?? '')

/** 检查没过、自动返修了几次。 */
export function revisionCount(job: ProductionJob): number {
  return job.steps.filter(isRevision).length
}

/** 2:57 这种用时。 */
export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** 失败原因给人看的那一段：去掉「AI 检查: 运行 run-xxx failed:」这类技术前缀。 */
export function friendlyError(msg: string): string {
  return msg
    .replace(/运行\s*run-[\w-]+\s*(failed|over_limit)?[:：]\s*/g, '')
    .replace(/^(AI\s*(检查|生成)|找资料没完成)[:：]\s*/, '')
    .replace(/^运行 Agent 出错[:：]\s*/, '')
    .trim()
}

/** 每个角色现在的状态和说明。 */
export function crewSlots(job: ProductionJob, runs: AiRun[]): CrewSlot[] {
  const running = !['success', 'skipped', 'rejected', 'failed'].includes(job.status)
  return crewSteps(job).map((step) => {
    const mine = job.steps.filter((s) => s.step === step)
    const last = mine.at(-1)
    if (!last) return { step, state: 'wait', caption: running ? '等待中' : '没轮到', attempt: 0 }
    const attempt = last.attempt
    if (last.status === 'running') return { step, state: 'work', caption: liveCaption(step, attempt, runs), attempt }
    if (last.status === 'succeeded') return { step, state: 'done', caption: doneCaption(job, step, last), attempt }
    if (step === 'review' && REVISION.test(last.errorMsg ?? '')) {
      return { step, state: running ? 'ready' : 'done', caption: `退回去改了，等第 ${attempt + 1} 稿`, attempt }
    }
    return { step, state: 'fail', caption: clip(friendlyError(last.errorMsg || '') || '这一步没做成', 40), attempt }
  })
}

function doneCaption(job: ProductionJob, step: CrewStep, s: JobStepRecord): string {
  const t = clock(s.costMs)
  switch (step) {
    case 'material': {
      const list = s.results.find((r) => r.format === 'material_list')
      return list && list.format === 'material_list' ? `找到 ${list.content.items.length} 条资料 · ${t}` : `没联网，直接写 · ${t}`
    }
    case 'generation':
      return `第 ${s.attempt} 稿写好 · ${t}`
    case 'review': {
      const report = stepResults(job, 'review_report').at(-1)?.content
      return report ? `${report.items.filter((i) => i.passed).length} / ${report.items.length} 通过 · ${t}` : `检查通过 · ${t}`
    }
    case 'illustration': {
      const set = s.results.find((r) => r.format === 'image_set')
      const ok = set && set.format === 'image_set' ? set.content.images.filter((i) => i.status === 'succeeded').length : 0
      return s.errorMsg ? `画好 ${ok} 张，${s.errorMsg}` : `画好 ${ok} 张 · ${t}`
    }
    case 'delivery':
      return '已交付'
  }
}

/** 干活时的实时说明：取这一步最近一次 AI 运行的最后一个动作，说不清就用这一步的默认说法。 */
export function liveCaption(step: CrewStep, attempt: number, runs: AiRun[]): string {
  const stage = RUN_STAGE[step]
  const mine = stage ? runs.filter((r) => r.stage === stage) : []
  const run = mine.filter((r) => r.status === 'running').at(-1) ?? mine.at(-1)
  const last = run?.steps.at(-1)
  switch (step) {
    case 'material': {
      if (!last) return '准备找资料'
      if (last.kind === 'skill') return `在看技能「${last.name}」`
      if (last.kind === 'tool' && /fetch|read/i.test(last.name)) {
        const n = run!.steps.filter((s) => s.kind === 'tool' && /fetch|read/i.test(s.name)).length
        return `正在读第 ${n} 篇资料`
      }
      if (last.kind === 'tool') return '正在搜索资料'
      return '想想下一步去哪找'
    }
    case 'generation':
      return last?.kind === 'skill' ? `在看技能「${last.name}」` : `正在写第 ${attempt} 稿`
    case 'review':
      return attempt > 1 ? '再检查一遍' : '逐条检查'
    case 'illustration':
      return run ? `正在画第 ${run.attempt} 张` : '准备画图'
    case 'delivery':
      return '打包成品'
  }
}

/** 进度线走到哪：走到最远一个已经开始的角色。返回 0~1。 */
export function crewProgress(slots: CrewSlot[]): number {
  if (slots.length < 2) return 0
  let far = 0
  slots.forEach((s, i) => { if (s.state !== 'wait') far = i })
  return far / (slots.length - 1)
}
