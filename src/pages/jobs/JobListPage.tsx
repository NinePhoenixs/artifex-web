import { useState } from 'react'
import { Card, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { listApps, listJobs } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { JobListItem } from '@/api/types'
import { DONE, JOB_STATUS, JobDrawer } from '@/components/JobView'

/**
 * 生产记录：最近 100 条，新的在前。点一条看成稿与 AI 做了什么。
 * 全局入口列出所有应用；应用详情的「生产记录」标签只列这个应用的。
 */
export default function JobListPage() {
  const { appId } = useParams<{ appId?: string }>()
  const [viewing, setViewing] = useState<string | null>(null)
  const query = { appId, limit: 100 }
  const { data, isLoading } = useQuery({
    queryKey: qk.jobs(query),
    queryFn: () => listJobs(query),
    // 有在跑的就隔几秒刷一次，让状态自己走完
    refetchInterval: (q) => (q.state.data?.items.some((j) => !DONE.includes(j.status)) ? 4000 : false),
  })
  const { data: apps } = useQuery({ queryKey: qk.apps(), queryFn: listApps, enabled: !appId })
  const appName = (id: string) => apps?.items.find((a) => a.appId === id)?.name ?? id

  const columns: TableColumnsType<JobListItem> = [
    {
      title: '内容',
      key: 'title',
      render: (_, j) => (
        <>
          {j.title ? (
            <Typography.Text strong>{j.title}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">{DONE.includes(j.status) ? '（没有成稿）' : '正在写…'}</Typography.Text>
          )}
          {j.topic && (
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>主题：{j.topic}</Typography.Text>
          )}
        </>
      ),
    },
    ...(appId ? [] : [{ title: '应用', key: 'app', width: 180, render: (_: unknown, j: JobListItem) => appName(j.appId) }]),
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: JobListItem['status']) => <Tag color={JOB_STATUS[s].color}>{JOB_STATUS[s].label}</Tag>,
    },
    {
      title: '开始时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => (
        <Typography.Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(t)}</Typography.Text>
      ),
    },
  ]

  const table = (
    <Table
      rowKey="jobId"
      columns={columns}
      dataSource={data?.items ?? []}
      loading={isLoading}
      pagination={false}
      onRow={(j) => ({ onClick: () => setViewing(j.jobId), style: { cursor: 'pointer' } })}
      locale={{ emptyText: '还没有生产记录。在配方页点「试产」写第一篇。' }}
    />
  )

  return (
    <>
      {appId ? (
        <Card styles={{ body: { padding: 0 } }}>{table}</Card>
      ) : (
        <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <Typography.Title level={3} style={{ margin: 0 }}>生产记录</Typography.Title>
            <Typography.Text type="secondary">每一篇的成稿、用时和花费。点开能看到 AI 每一步做了什么。</Typography.Text>
          </div>
          <Card styles={{ body: { padding: 0 } }}>{table}</Card>
        </div>
      )}
      <JobDrawer jobId={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

/** 今天的只显示时分，其余显示月日 + 时分。 */
export function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.toDateString() === new Date().toDateString() ? `今天 ${hm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}
