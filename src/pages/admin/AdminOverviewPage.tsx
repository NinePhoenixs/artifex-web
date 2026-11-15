import type { ReactNode } from 'react'
import { Card, Empty, Skeleton, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAdminOverview, listAdminSpaces } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AdminSpace } from '@/api/types'
import { expiryDate } from '@/components/billing/billing'
import { PLAN_COLOR, PLAN_LABEL, yuan } from './admin'

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card styles={{ body: { padding: 20 } }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div className="num" style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 2px' }}>{value}</div>
      {sub && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{sub}</Typography.Text>}
    </Card>
  )
}

/** 概览：几个数字 + 7 天内到期的空间（要跟进续费）。 */
export default function AdminOverviewPage() {
  const navigate = useNavigate()
  const { data: o, isLoading } = useQuery({ queryKey: qk.admin('overview'), queryFn: getAdminOverview })
  const { data: expiring } = useQuery({ queryKey: qk.admin('spaces', { expiringDays: 7 }), queryFn: () => listAdminSpaces({ expiringDays: 7, limit: 20 }) })
  if (isLoading || !o) return <Skeleton active />
  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Stat label="注册用户" value={o.accounts} sub={`今天 +${o.newAccountsToday} · 本月 +${o.newAccountsMonth}`} />
        <Stat label="空间" value={o.spaces} sub={`付费 ${o.paidSpaces} 个`} />
        <Stat label="本月产出" value={<>{o.piecesMonth}<span style={{ fontSize: 14, fontWeight: 400 }}> 篇</span></>} sub={`今天 ${o.piecesToday} 篇`} />
        <Stat label="本月平台模型花费" value={yuan(o.platformCostMonth)} sub="各空间用平台提供的模型的花费" />
      </div>
      <Card title={<>7 天内到期<Typography.Text type="secondary" style={{ fontWeight: 400, marginInlineStart: 8 }}>{o.expiringSoon} 个</Typography.Text></>}
        styles={{ body: { padding: 0 } }}>
        <Table<AdminSpace> rowKey="spaceId" dataSource={expiring?.items ?? []} pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有快到期的空间" /> }}
          onRow={(s) => ({ onClick: () => navigate(`/admin/spaces?open=${s.spaceId}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: '空间', dataIndex: 'name' },
            { title: '所有者', dataIndex: 'ownerEmail' },
            { title: '套餐', dataIndex: 'planCode', width: 100, render: (c: string) => <Tag color={PLAN_COLOR[c]}>{PLAN_LABEL[c] ?? c}</Tag> },
            { title: '到期', dataIndex: 'planExpiresAt', width: 120, render: (d: string | null) => (d ? expiryDate(d) : '—') },
          ]} />
      </Card>
    </div>
  )
}
