import type { AiRun, JobStatus } from '@/api/types'

/** 生产任务与 AI 运行的状态文案和 antd Tag 颜色。 */

/** 走到这些状态就不会再变，停止轮询。 */
export const DONE: JobStatus[] = ['success', 'skipped', 'rejected', 'failed', 'waiting_human']

export const JOB_STATUS: Record<JobStatus, { label: string; color: string }> = {
  received: { label: '排队中', color: 'default' },
  planned: { label: '排队中', color: 'default' },
  materializing: { label: '找资料', color: 'processing' },
  generating: { label: '写作中', color: 'processing' },
  reviewing: { label: '检查中', color: 'processing' },
  illustrating: { label: '配图中', color: 'processing' },
  delivering: { label: '交付中', color: 'processing' },
  success: { label: '已完成', color: 'success' },
  skipped: { label: '已跳过', color: 'default' },
  rejected: { label: '已拒绝', color: 'warning' },
  failed: { label: '失败', color: 'error' },
  waiting_human: { label: '待复核', color: 'warning' },
}

export const RUN_STATUS: Record<AiRun['status'], { label: string; color: string }> = {
  running: { label: '运行中', color: 'processing' },
  succeeded: { label: '完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  over_limit: { label: '超出上限', color: 'warning' },
}
