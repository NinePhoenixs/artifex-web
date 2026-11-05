import { useEffect, useState } from 'react'
import { CaretRightOutlined } from '@ant-design/icons'
import { App, Button, Card, Input, Space, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listJobs, submitJob } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { JobDrawer } from '@/components/JobView'
import { DONE, JOB_STATUS } from '@/components/jobStatus'
import { UNTITLED, imageUrl, lastFailedStep } from '@/components/jobArtifacts'
import CrewProgress from '@/components/crew/CrewProgress'
import { headImage, noteText, previewContent } from '@/components/preview/content'
import { useJobWatch } from '@/hooks/useJobWatch'
import { useApiError } from '@/hooks/useApiError'
import { formatRelativeTime } from '@/utils/time'
import { brand } from '@/theme'
import { sumUsage, usageText } from '@/components/usage'
import { markdownToPlain } from '@/components/MarkdownView'

/**
 * 右侧「最近一次试产」：用这份配方已保存的设置真跑一篇，看成稿和 AI 用量。
 * 改完提示词 → 保存 → 再试一篇，是配方页最常走的一圈。
 */
export default function TrialCard({ appId, recipeId, ready, variables = [] }: {
  appId: string
  recipeId: string
  ready: boolean
  /** 已保存的提示词里用到的变量（{{主题}} 除外），试产时逐个填值 */
  variables?: string[]
}) {
  const qc = useQueryClient()
  const handleError = useApiError()
  const { message } = App.useApp()
  const [topic, setTopic] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [asking, setAsking] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const { data: jobs } = useQuery({
    queryKey: qk.jobs({ appId, limit: 50 }),
    queryFn: () => listJobs({ appId, limit: 50 }),
  })
  const latest = jobs?.items.find((j) => j.recipeId === recipeId)
  const { job, finished, runs } = useJobWatch(latest?.jobId ?? null)

  const start = useMutation({
    mutationFn: () => submitJob({
      appId, recipeId, subjectId: 'trial', topic: topic.trim(),
      variables: Object.fromEntries(variables.map((v) => [v, (values[v] ?? '').trim()]).filter(([, x]) => x)),
    }),
    onSuccess: () => {
      setAsking(false)
      setTopic('')
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (e) => handleError(e),
  })

  // 以正在轮询的任务状态为准：列表只在提交时刷新一次，它的状态会一直停在「产的时候」
  const status = job?.status ?? latest?.status
  const running = Boolean(latest && status && !DONE.includes(status))
  // 产完刷新列表，工作台 / 生产记录里的这一条也跟着变
  useEffect(() => {
    if (finished) qc.invalidateQueries({ queryKey: ['jobs'] })
  }, [finished, qc])
  const c = previewContent(job)
  const cover = c ? (c.layout === 'article' ? headImage(c.files) : c.files[0]) : undefined
  const usage = sumUsage(runs)
  const skills = runs.flatMap((r) => r.steps).filter((s) => s.kind === 'skill' || s.kind === 'tool')
  const usedNames = [...new Set(skills.map((s) => s.name.replace(/^run_skill_script:/, '运行脚本 ')))]

  const ask = (
    <>
    {variables.length > 0 && (
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>提示词里的变量，这次填什么：</Typography.Text>
        {variables.map((v) => (
          <Input
            key={v}
            size="small"
            addonBefore={v}
            maxLength={500}
            placeholder="不填就原样留给 AI"
            value={values[v] ?? ''}
            onChange={(e) => setValues({ ...values, [v]: e.target.value })}
          />
        ))}
      </div>
    )}
    <Space.Compact style={{ width: '100%' }}>
      <Input
        autoFocus
        placeholder="这次写什么，比如：周末露营装备"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onPressEnter={() => topic.trim() && start.mutate()}
      />
      <Button type="primary" disabled={!topic.trim()} loading={start.isPending} onClick={() => start.mutate()}>
        试产
      </Button>
    </Space.Compact>
    </>
  )

  return (
    <Card
      style={{ background: brand.paper, borderColor: brand.line }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
        <Typography.Text strong style={{ fontSize: 15 }}>最近一次试产</Typography.Text>
        {latest && (
          <Typography.Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>{formatRelativeTime(latest.createdAt)}</Typography.Text>
        )}
      </div>

      {!ready ? (
        <Typography.Text type="secondary">配方就绪后才能试产。先「保存并启用」，或补齐标红的项。</Typography.Text>
      ) : !latest ? (
        <>
          <Typography.Paragraph type="secondary">还没试产过。按已保存的设置写一篇，看看效果。</Typography.Paragraph>
          {ask}
        </>
      ) : (
        <>
          {running && job && (
            <div style={{ margin: '0 -8px 12px' }}>
              <CrewProgress job={job} runs={runs} size="sm" />
            </div>
          )}
          {finished && job?.status === 'success' && c && (
            <div
              style={{
                display: 'grid', gap: 12, marginBottom: 12, padding: 12, borderRadius: 10, background: '#fff',
                gridTemplateColumns: c.layout === 'note' && cover ? '84px minmax(0, 1fr)' : '1fr',
              }}
            >
              {cover && (
                <img
                  src={imageUrl(cover)}
                  alt={cover.caption ?? ''}
                  style={{ width: '100%', aspectRatio: c.layout === 'note' ? '3 / 4' : '16 / 7', objectFit: 'cover', borderRadius: 8, display: 'block' }}
                />
              )}
              <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', fontSize: 14.5, lineHeight: 1.45, marginBottom: 6 }}>{c.title || UNTITLED}</Typography.Text>
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 13, margin: 0 }}>
                  {markdownToPlain(c.body.replace(/!\[[^\]]*\]\(image:\d+\)/g, ''))}
                </Typography.Paragraph>
              </div>
            </div>
          )}
          {finished && job && job.status !== 'success' && (
            <Typography.Paragraph>
              <Tag color={JOB_STATUS[job.status].color}>{JOB_STATUS[job.status].label}</Tag>
              <Typography.Text type="secondary">
                {lastFailedStep(job)?.errorMsg ?? ''}
              </Typography.Text>
            </Typography.Paragraph>
          )}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              {running ? '正在产…' : usageText(usage)}
            </Typography.Text>
            <Space size={8} style={{ marginLeft: 'auto' }}>
              {finished && c?.layout === 'note' && (
                <Button
                  size="small"
                  onClick={() => navigator.clipboard.writeText(noteText(c)).then(() => message.success('已复制标题 + 正文 + 话题'), () => message.error('复制失败，浏览器没给剪贴板权限'))}
                >
                  复制文案
                </Button>
              )}
              <Button size="small" type={job?.status === 'success' ? 'primary' : 'default'} onClick={() => setViewing(latest.jobId)}>
                {job?.status === 'success' ? '看成品' : running ? '看进度' : '看详情'}
              </Button>
            </Space>
          </div>
          {skills.length > 0 && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '8px 0 0' }}>
              用到了：{usedNames.join('、')}
            </Typography.Paragraph>
          )}
          <div style={{ borderTop: `1px solid ${brand.line}`, margin: '14px 0' }} />
          {asking ? (
            ask
          ) : (
            <Button block icon={<CaretRightOutlined />} disabled={running} onClick={() => setAsking(true)}>
              再试一篇
            </Button>
          )}
        </>
      )}
      <JobDrawer jobId={viewing} onClose={() => setViewing(null)} />
    </Card>
  )
}
