import { useState } from 'react'
import { AppstoreOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Skeleton, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { listApps, listCapabilities, listJobs } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { JobListItem } from '@/api/types'
import { DONE, JOB_STATUS, JobDrawer } from '@/components/JobView'
import AppFormModal from '@/pages/apps/AppFormModal'
import { formatTime } from '@/pages/jobs/JobListPage'
import { brand } from '@/theme'

/**
 * 工作台：进来先看今天产了多少、正在产什么、最近产了什么，再从应用进去改配方。
 * 「等你处理」依赖待复核，后端还没有，先不放。
 */
export default function WorkbenchPage() {
  const navigate = useNavigate()
  const [newApp, setNewApp] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const { data: jobs, isLoading } = useQuery({
    queryKey: qk.jobs({ limit: 50 }),
    queryFn: () => listJobs({ limit: 50 }),
    refetchInterval: (q) => (q.state.data?.items.some((j) => !DONE.includes(j.status)) ? 4000 : false),
  })
  const { data: apps } = useQuery({ queryKey: qk.apps(), queryFn: listApps })
  const { data: caps } = useQuery({ queryKey: qk.capabilities({}), queryFn: () => listCapabilities({}) })

  const items = jobs?.items ?? []
  const today = items.filter((j) => new Date(j.createdAt).toDateString() === new Date().toDateString())
  const running = items.filter((j) => !DONE.includes(j.status))
  const recent = items.filter((j) => DONE.includes(j.status)).slice(0, 6)
  const appName = (id: string) => apps?.items.find((a) => a.appId === id)?.name ?? id
  const activeCaps = (caps?.items ?? []).filter((c) => c.status === 'active').length

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{greeting()}</Typography.Title>
          <Typography.Text type="secondary">
            今天产出 <Typography.Text strong>{today.filter((j) => j.status === 'success').length}</Typography.Text> 篇
            {running.length > 0 && <>，正在产 <Typography.Text strong>{running.length}</Typography.Text> 篇</>}
            {today.some((j) => j.status === 'failed') && (
              <>，失败 <Typography.Text strong style={{ color: '#C2412D' }}>{today.filter((j) => j.status === 'failed').length}</Typography.Text> 篇</>
            )}
            。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setNewApp(true)}>
          新建应用
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {running.length > 0 && (
            <Card title={<CardTitle text="正在产" count={running.length} />} styles={{ body: { padding: '4px 0' } }}>
              {running.map((j) => <JobRow key={j.jobId} job={j} app={appName(j.appId)} onClick={() => setViewing(j.jobId)} />)}
            </Card>
          )}
          <Card
            title={<CardTitle text="最近产出" />}
            extra={<Link to="/jobs">生产记录 <RightOutlined style={{ fontSize: 10 }} /></Link>}
            styles={{ body: { padding: recent.length ? '4px 0' : 24 } }}
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : recent.length ? (
              recent.map((j) => <JobRow key={j.jobId} job={j} app={appName(j.appId)} onClick={() => setViewing(j.jobId)} />)
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有产出。打开一个应用的配方，点「试产」写第一篇。" />
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card
            title={<CardTitle text="应用" count={apps?.items.length} />}
            extra={<Link to="/apps">全部 <RightOutlined style={{ fontSize: 10 }} /></Link>}
            styles={{ body: { padding: 8 } }}
          >
            {(apps?.items ?? []).slice(0, 6).map((a) => (
              <div
                key={a.appId}
                onClick={() => navigate(`/apps/${a.appId}/recipes`)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = brand.paper)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: brand.inkSoft, color: brand.ink, display: 'grid', placeItems: 'center' }}>
                  <AppstoreOutlined />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Typography.Text ellipsis style={{ display: 'block' }}>{a.name}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{a.appTypeName} · 配方 {a.recipeCount}</Typography.Text>
                </div>
              </div>
            ))}
            {apps && apps.items.length === 0 && (
              <Typography.Text type="secondary" style={{ display: 'block', padding: 12 }}>还没有应用，先新建一个。</Typography.Text>
            )}
          </Card>
          <Card
            title={<CardTitle text="能力中心" />}
            extra={<Link to="/capabilities">管理 <RightOutlined style={{ fontSize: 10 }} /></Link>}
          >
            <Typography.Text>
              <Typography.Text strong style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{activeCaps}</Typography.Text> 个能力可用
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0 0' }}>
              教 AI 写法的技能、帮 AI 查数据的工具，都在这里管理。
            </Typography.Paragraph>
          </Card>
        </div>
      </div>

      <AppFormModal open={newApp} onClose={() => setNewApp(false)} />
      <JobDrawer jobId={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function CardTitle({ text, count }: { text: string; count?: number }) {
  return (
    <span>
      {text}
      {count !== undefined && (
        <Typography.Text type="secondary" style={{ marginLeft: 6, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{count}</Typography.Text>
      )}
    </span>
  )
}

function JobRow({ job: j, app, onClick }: { job: JobListItem; app: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = brand.paper)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Tag color={JOB_STATUS[j.status].color} style={{ marginInlineEnd: 0 }}>{JOB_STATUS[j.status].label}</Tag>
      <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
        {j.title || (DONE.includes(j.status) ? '（没有成稿）' : j.topic ? `正在写：${j.topic}` : '正在写…')}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>{app}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, flexShrink: 0, width: 92, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(j.createdAt)}
      </Typography.Text>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
