import { Alert, Drawer, Empty, Skeleton, Space, Steps, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getJob, listAgents, listAiRuns } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AiRun, AiRunStep, JobStatus, ProductionJob } from '@/api/types'
import { brand } from '@/theme'
import { secondsText, sumUsage, usageText } from './usage'

/** 生产任务的展示件：进度、成稿、AI 做了什么。试跑与生产记录共用。 */

export const DONE: JobStatus[] = ['success', 'skipped', 'rejected', 'failed', 'waiting_human']

export const JOB_STATUS: Record<JobStatus, { label: string; color: string }> = {
  received: { label: '排队中', color: 'default' },
  planned: { label: '排队中', color: 'default' },
  materializing: { label: '找资料', color: 'processing' },
  generating: { label: '写作中', color: 'processing' },
  reviewing: { label: '检查中', color: 'processing' },
  delivering: { label: '交付中', color: 'processing' },
  success: { label: '已完成', color: 'success' },
  skipped: { label: '已跳过', color: 'default' },
  rejected: { label: '已拒绝', color: 'warning' },
  failed: { label: '失败', color: 'error' },
  waiting_human: { label: '待复核', color: 'warning' },
}

const PROGRESS: Record<string, number> = { material: 0, generation: 1, review: 2, delivery: 3 }

const RUN_STATUS: Record<AiRun['status'], { label: string; color: string }> = {
  running: { label: '运行中', color: 'processing' },
  succeeded: { label: '完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  over_limit: { label: '超出上限', color: 'warning' },
}

export function JobProgress({ job }: { job: ProductionJob }) {
  const current = job.status === 'success' ? 4 : PROGRESS[job.currentStage] ?? 0
  const vars = Object.entries(job.variables ?? {})
  return (
    <>
    {(job.topic || vars.length > 0) && (
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        {[job.topic && `主题：${job.topic}`, ...vars.map(([k, v]) => `${k}：${v}`)].filter(Boolean).join('　')}
      </Typography.Paragraph>
    )}
    <Steps
      size="small"
      current={current}
      // 检查没通过、自动修改后通过的任务也有失败流水，只看最终状态
      status={job.status === 'failed' ? 'error' : job.status === 'success' ? 'finish' : 'process'}
      style={{ marginBottom: 20 }}
      items={[{ title: '找资料' }, { title: '写' }, { title: '检查' }, { title: '交付' }]}
    />
    </>
  )
}

export function JobResult({ job }: { job: ProductionJob }) {
  const stages = job.report?.stages ?? []
  // 失败原因看最后一条失败流水（前面的可能是自动修改前没通过的检查）
  const failed = [...stages].reverse().find((s) => !s.success)
  const revised = stages.filter((s) => s.stage === 'review' && !s.success)
  if (job.status !== 'success') {
    return (
      <Alert
        type={job.status === 'skipped' ? 'info' : 'error'}
        showIcon
        title={job.status === 'skipped' ? '这次被跳过了' : '这次没跑成'}
        description={failed?.errorMsg}
        style={{ marginBottom: 20 }}
      />
    )
  }
  const pick = (role: string) => (job.report?.artifacts ?? []).find((a) => a.role === role)?.content ?? ''
  let tags: string[] = []
  try {
    tags = JSON.parse(pick('tags') || '[]')
  } catch {
    tags = []
  }
  return (
    <div style={{ marginBottom: 24 }}>
      {revised.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={`检查没通过 ${revised.length} 次，AI 按问题自动修改后通过`}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {revised.map((r, i) => (
                <li key={i}>{r.errorMsg?.replace(/^评审不通过: /, '').replace(/；自动修改第 \d+ 次$/, '')}</li>
              ))}
            </ul>
          }
        />
      )}
      <Typography.Title level={5} style={{ marginTop: 0 }}>{pick('title') || '（无标题）'}</Typography.Title>
      <div
        style={{
          whiteSpace: 'pre-wrap', lineHeight: 1.75, fontSize: 14, padding: 16, borderRadius: 8,
          background: brand.paper, maxHeight: 360, overflow: 'auto',
        }}
      >
        {pick('main')}
      </div>
      {tags.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {tags.map((t) => <Tag key={t} variant="filled">#{t}</Tag>)}
        </div>
      )}
    </div>
  )
}

/** AI 做了什么：每次阶段运行一块，下面列出每一步。 */
export function RunTrace({ runs }: { runs: AiRun[] }) {
  const { data: agents } = useQuery({ queryKey: qk.agents(), queryFn: () => listAgents() })
  const agentName = (id: string) => agents?.items.find((a) => a.agentId === id)?.name ?? id
  return (
    <>
      <Typography.Title level={5}>AI 做了什么</Typography.Title>
      {runs.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: -4, fontVariantNumeric: 'tabular-nums' }}>
          合计 {usageText(sumUsage(runs))}
        </Typography.Paragraph>
      )}
      {runs.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI 还没开始，或这一步没用到 AI" />
      ) : (
        runs.map((r) => (
          <div key={r.runId} style={{ marginBottom: 16 }}>
            <Space size={8} wrap style={{ marginBottom: 8 }}>
              <Typography.Text strong>{r.stage === 'generation' ? '写' : r.stage === 'retrieval' ? '找资料' : '检查'}</Typography.Text>
              {r.agentId && <Tag style={{ marginInlineEnd: 0 }}>由「{agentName(r.agentId)}」完成</Tag>}
              {r.attempt > 1 && <Typography.Text type="secondary">第 {r.attempt} 轮</Typography.Text>}
              <Tag color={RUN_STATUS[r.status].color}>{RUN_STATUS[r.status].label}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                {r.model} · {usageText(sumUsage([r]))}
              </Typography.Text>
            </Space>
            {r.skipped.length > 0 && (
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                没带上：{r.skipped.map(skipText).join('、')}
              </Typography.Paragraph>
            )}
            {r.errorMsg && <Alert type="warning" showIcon title={r.errorMsg} style={{ marginBottom: 8 }} />}
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {r.steps.map((s) => <StepLine key={s.seq} step={s} />)}
            </ol>
          </div>
        ))
      )}
    </>
  )
}

function StepLine({ step: s }: { step: AiRunStep }) {
  const what =
    s.kind === 'skill'
      ? `${s.outputSummary.includes('点名') ? '按配方点名用了' : '读了'}技能「${s.name}」${s.skillVersion ? `（第 ${s.skillVersion} 版）` : ''}`
      : s.kind === 'tool'
        ? s.name.startsWith('run_skill_script:') ? `在沙箱里运行了技能脚本 ${s.name.slice('run_skill_script:'.length)}` : `用了工具 ${s.name}`
        : s.outputSummary.startsWith('调用 ') ? '想了想，决定先用能力' : '交稿'
  return (
    <li style={{ marginBottom: 4, color: s.status === 'failed' ? '#C2412D' : undefined }}>
      <Typography.Text>{what}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
        {secondsText(s.costMs)}
        {s.errorMsg && ` · ${s.errorMsg}`}
      </Typography.Text>
    </li>
  )
}

const SKIP_REASON: Record<string, string> = {
  not_found: '已删除',
  disabled: '已停用',
  not_applicable: '不适用',
  unreachable: '连不上',
}

function skipText(s: string) {
  const [id, reason] = s.split(':')
  return `${id}（${SKIP_REASON[reason] ?? reason}）`
}

/** 跟踪一个任务：没结束就轮询任务与 AI 运行记录。 */
export function useJobWatch(jobId: string | null) {
  const { data: job } = useQuery({
    queryKey: qk.job(jobId ?? ''),
    queryFn: () => getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => (q.state.data && DONE.includes(q.state.data.status) ? false : 2000),
  })
  const finished = Boolean(job && DONE.includes(job.status))
  const { data: runs } = useQuery({
    queryKey: qk.aiRuns(jobId ?? ''),
    queryFn: () => listAiRuns(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: finished ? false : 3000,
  })
  return { job, finished, runs: runs?.items ?? [] }
}

/** 生产记录里点开一条：进度、成稿、AI 做了什么。 */
export function JobDrawer({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { job, finished, runs } = useJobWatch(jobId)
  return (
    <Drawer open={Boolean(jobId)} onClose={onClose} size={720} title="生产详情" destroyOnHidden>
      {!job ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <JobProgress job={job} />
          {finished && <JobResult job={job} />}
          <RunTrace runs={runs} />
        </>
      )}
    </Drawer>
  )
}
