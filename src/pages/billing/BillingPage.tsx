import { useState } from 'react'
import { Button, Card, Empty, Progress, Skeleton, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getSpaceQuota, listSpaceLedger } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { LedgerItem, Quota } from '@/api/types'
import { JobDrawer } from '@/components/JobView'
import UpgradeModal from '@/components/billing/UpgradeModal'
import { LEDGER_LABEL, day, expiryDate } from '@/components/billing/billing'
import { useSession } from '@/session/SessionContext'
import { brand } from '@/theme'
import { formatDateTime } from '@/utils/time'

/** 用量与账单：当前套餐、还剩多少篇、每一笔扣退记录。用量记录只有所有者、管理员看得到。 */
export default function BillingPage() {
  const { space, can } = useSession()
  const [upgrading, setUpgrading] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const { data: q, isLoading } = useQuery({ queryKey: qk.quota(space.spaceId), queryFn: () => getSpaceQuota(space.spaceId) })

  return (
    <div style={{ padding: 24, maxWidth: 1080, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>用量与账单</Typography.Title>
        <Typography.Text type="secondary">用平台提供的模型生产，每篇扣 1 篇；接入自己的模型不扣。生产失败的会退回。</Typography.Text>
      </div>
      {isLoading || !q ? <Skeleton active /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16, marginBottom: 16 }}>
            <PlanCard q={q} onUpgrade={() => setUpgrading(true)} />
            <LeftCard q={q} />
          </div>
          {can.manageMembers && <LedgerCard spaceId={space.spaceId} onOpenJob={setViewing} />}
        </>
      )}
      <UpgradeModal open={upgrading} current={q?.plan.code} onClose={() => setUpgrading(false)} />
      <JobDrawer jobId={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function PlanCard({ q, onUpgrade }: { q: Quota; onUpgrade: () => void }) {
  return (
    <Card>
      <Typography.Text type="secondary">当前套餐</Typography.Text>
      <div style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 4px' }}>{q.plan.name}</div>
      <Typography.Text type="secondary">
        {q.plan.unlimited ? '不限篇数' : q.plan.expiresAt ? `${expiryDate(q.plan.expiresAt)} 到期` : '一次性试用，用完可升级'}
        {q.memberLimit > 0 && ` · 最多 ${q.memberLimit} 人`}
      </Typography.Text>
      {!q.plan.unlimited && (
        <div style={{ marginTop: 20 }}>
          <Button type="primary" onClick={onUpgrade}>{q.plan.code === 'free' ? '升级套餐' : '续费 / 升级'}</Button>
        </div>
      )}
    </Card>
  )
}

function LeftCard({ q }: { q: Quota }) {
  if (q.plan.unlimited) {
    return (
      <Card>
        <Typography.Text type="secondary">剩余篇数</Typography.Text>
        <div style={{ fontSize: 32, fontWeight: 800, margin: '4px 0' }}>不限</div>
        <Typography.Text type="secondary">用平台提供的模型生产也不扣篇数</Typography.Text>
      </Card>
    )
  }
  const parts = [
    q.periodPieces > 0 && `本月 ${q.left.period}`,
    q.left.trial > 0 && `试用 ${q.left.trial}`,
    q.left.bonus > 0 && `赠送 ${q.left.bonus}`,
  ].filter(Boolean)
  const cap = q.periodPieces > 0 ? q.periodPieces : q.left.total + q.usedThisPeriod
  return (
    <Card>
      <Typography.Text type="secondary">剩余篇数</Typography.Text>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0' }}>
        <span className="num" style={{ fontSize: 32, fontWeight: 800, color: q.left.total === 0 ? brand.danger : undefined }}>{q.left.total}</span>
        <Typography.Text type="secondary">篇</Typography.Text>
        {parts.length > 0 && <Typography.Text type="secondary" style={{ marginInlineStart: 8 }}>{parts.join(' · ')}</Typography.Text>}
      </div>
      {cap > 0 && (
        <Progress percent={Math.min(100, Math.round((q.usedThisPeriod / cap) * 100))} showInfo={false}
          strokeColor={brand.ink} railColor={brand.inkSoft} style={{ margin: '4px 0' }} />
      )}
      <Typography.Text type="secondary">
        {q.periodEnd
          ? <>本月已用 <span className="num">{q.usedThisPeriod}</span> 篇，{day(q.periodEnd)} 重置为 <span className="num">{q.periodPieces}</span> 篇</>
          : <>已用 <span className="num">{q.usedThisPeriod}</span> 篇</>}
      </Typography.Text>
    </Card>
  )
}

function LedgerCard({ spaceId, onOpenJob }: { spaceId: string; onOpenJob: (id: string) => void }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: qk.ledger(spaceId),
    queryFn: ({ pageParam }) => listSpaceLedger(spaceId, { cursor: pageParam, limit: 50 }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor || undefined,
  })
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  const columns: TableColumnsType<LedgerItem> = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (d: string) => formatDateTime(d) },
    { title: '类型', dataIndex: 'kind', width: 100, render: (k: LedgerItem['kind']) => LEDGER_LABEL[k] ?? k },
    {
      title: '说明', key: 'what',
      render: (_, it) => it.jobId
        ? <Typography.Link onClick={() => onOpenJob(it.jobId)}>{it.topic || it.jobId}</Typography.Link>
        : <Typography.Text type="secondary">{it.remark || '—'}</Typography.Text>,
    },
    {
      title: '变化', dataIndex: 'delta', width: 90, align: 'right',
      render: (d: number) => <span className="num" style={{ color: d < 0 ? brand.text : d > 0 ? '#2E7D4F' : brand.textMuted }}>{d > 0 ? `+${d}` : d}</span>,
    },
    { title: '剩余', dataIndex: 'leftAfter', width: 80, align: 'right', render: (n: number) => <span className="num">{n}</span> },
  ]
  return (
    <Card title="用量记录" styles={{ body: { padding: 0 } }}>
      <Table<LedgerItem> rowKey="id" columns={columns} dataSource={rows} loading={isLoading} pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有记录" /> }} />
      {hasNextPage && (
        <div style={{ textAlign: 'center', padding: 12 }}>
          <Button onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>查看更早的</Button>
        </div>
      )}
    </Card>
  )
}
