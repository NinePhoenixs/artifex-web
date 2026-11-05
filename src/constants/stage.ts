import type { AgentUsage, JobStepName, PipelineStage } from '@/api/types'

/** 流水线各步的中文名。配方页、Agent、运行记录、能力中心都用这一份，叫法保持一致。 */
export const STAGE_LABEL: Record<PipelineStage, string> = {
  retrieval: '找资料',
  generation: '写',
  review: '检查',
  illustration: '配图',
}

/** Agent 的「常用在」。空串（不限）由调用处自己显示。 */
export const USAGE_LABEL: Record<Exclude<AgentUsage, ''>, string> = {
  ...STAGE_LABEL,
  assist: '写提示词',
}

/** 生产任务的进度步骤（不含排队前后的 planning / none）。 */
export type JobStep = Exclude<JobStepName, 'planning' | 'none'>

export const JOB_STEP_LABEL: Record<JobStep, string> = {
  material: '找资料',
  generation: '写',
  review: '检查',
  illustration: '配图',
  delivery: '交付',
}

/** 配方某一步没选 Agent 时由谁做。必须与后端 domain.DefaultAgentFor 一致。 */
export const DEFAULT_AGENT: Record<PipelineStage, string> = {
  retrieval: 'caifeng',
  generation: 'zhibi',
  review: 'jiaoshen',
  illustration: 'huashi',
}
