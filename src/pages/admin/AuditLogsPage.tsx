import { useState } from 'react'
import { Button, Card, Input, Table, Typography } from 'antd'
import { useInfiniteQuery } from '@tanstack/react-query'
import { listAuditLogs } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AuditLog } from '@/api/types'
import { formatDateTime } from '@/utils/time'
import { expiryDate } from '@/components/billing/billing'
import { ACTION_LABEL, PLAN_LABEL } from './admin'

/** 一句话说清改了什么（看不懂的原样给 JSON）。 */
function describe(l: AuditLog) {
  const d = l.detail ?? {}
  const after = (d.after ?? {}) as Record<string, unknown>
  switch (l.action) {
    case 'plan.activate':
      return `${PLAN_LABEL[String(after.plan)] ?? String(after.plan ?? '')}${after.expiresAt ? `，${expiryDate(String(after.expiresAt))} 到期` : ''}`
    case 'quota.bonus':
      return `${Number(d.pieces) > 0 ? '+' : ''}${String(d.pieces)} 篇`
    case 'account.disable':
    case 'account.enable':
      return String(d.email ?? '')
    default:
      return Object.keys(after).length ? JSON.stringify(after) : ''
  }
}

/** 操作记录：后台每一次修改，只读，不能删。 */
export default function AuditLogsPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: qk.admin('audit', { q }),
    queryFn: ({ pageParam }) => listAuditLogs({ q, cursor: pageParam, limit: 50 }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor || undefined,
  })
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  return (
    <div style={{ paddingBottom: 24 }}>
      <Input.Search allowClear placeholder="对象编号、原因" style={{ width: 320, marginBottom: 16 }} onSearch={setQ} />
      <Card styles={{ body: { padding: 0 } }}>
        <Table<AuditLog> rowKey="id" dataSource={rows} loading={isLoading} pagination={false} columns={[
          { title: '时间', dataIndex: 'createdAt', width: 170, render: (d: string) => formatDateTime(d) },
          { title: '谁', dataIndex: 'operatorName', width: 110 },
          { title: '做了什么', dataIndex: 'action', width: 100, render: (a: string) => ACTION_LABEL[a] ?? a },
          { title: '对象', key: 'target', render: (_, l) => <><Typography.Text>{describe(l)}</Typography.Text><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{l.targetId}</Typography.Text></> },
          { title: '原因', dataIndex: 'reason' },
          { title: 'IP', dataIndex: 'ip', width: 130 },
        ]} />
        {hasNextPage && <div style={{ textAlign: 'center', padding: 12 }}><Button onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>加载更多</Button></div>}
      </Card>
    </div>
  )
}
