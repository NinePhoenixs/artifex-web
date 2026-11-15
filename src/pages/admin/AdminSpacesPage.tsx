import { useState } from 'react'
import { App, Button, Card, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Select, Skeleton, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { activatePlan, getAdminSpaceQuota, grantBonus, listAdminPlans, listAdminSpaceLedger, listAdminSpaces } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AdminSpace, LedgerItem, Quota } from '@/api/types'
import { LEDGER_LABEL, day, expiryDate } from '@/components/billing/billing'
import { useApiError } from '@/hooks/useApiError'
import { brand } from '@/theme'
import { formatDateTime } from '@/utils/time'
import { PLAN_COLOR, PLAN_LABEL, reasonRule, yuan } from './admin'

/** 空间：看套餐、剩余、本月用量和花费；点一行打开详情，开通套餐、赠送篇数、看流水。 */
export default function AdminSpacesPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState<string | undefined>()
  const open = params.get('open')
  const filters = { q, plan }
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: qk.admin('spaces', filters),
    queryFn: ({ pageParam }) => listAdminSpaces({ ...filters, cursor: pageParam, limit: 50 }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor || undefined,
  })
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  const columns: TableColumnsType<AdminSpace> = [
    {
      title: '空间', dataIndex: 'name',
      render: (n: string, s) => <>{n}<Typography.Text type="secondary" style={{ marginInlineStart: 6, fontSize: 12 }}>{s.kind === 'personal' ? '个人' : '团队'}</Typography.Text></>,
    },
    { title: '所有者', dataIndex: 'ownerEmail', render: (e: string) => e || <Typography.Text type="secondary">—</Typography.Text> },
    { title: '套餐', dataIndex: 'planCode', width: 90, render: (c: string) => <Tag color={PLAN_COLOR[c]}>{PLAN_LABEL[c] ?? c}</Tag> },
    { title: '到期', dataIndex: 'planExpiresAt', width: 110, render: (d: string | null) => (d ? expiryDate(d) : '—') },
    {
      title: '剩余', key: 'left', width: 80, align: 'right',
      render: (_, s) => (s.planCode === 'internal' ? '不限' : <span className="num" style={{ color: s.left.total === 0 ? brand.danger : undefined }}>{s.left.total}</span>),
    },
    { title: '本月产出', dataIndex: 'piecesMonth', width: 90, align: 'right', render: (n: number) => <span className="num">{n}</span> },
    { title: '本月花费', dataIndex: 'costMonth', width: 100, align: 'right', render: (n: number) => <span className="num">{yuan(n)}</span> },
    { title: '成员', dataIndex: 'memberCount', width: 70, align: 'right', render: (n: number) => <span className="num">{n}</span> },
  ]
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input.Search allowClear placeholder="空间名、所有者邮箱或空间编号" style={{ width: 320 }} onSearch={setQ} />
        <Select allowClear placeholder="全部套餐" style={{ width: 140 }} value={plan} onChange={setPlan}
          options={Object.entries(PLAN_LABEL).map(([value, label]) => ({ value, label }))} />
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<AdminSpace> rowKey="spaceId" columns={columns} dataSource={rows} loading={isLoading} pagination={false}
          onRow={(s) => ({ onClick: () => setParams({ open: s.spaceId }), style: { cursor: 'pointer' } })} />
        {hasNextPage && <div style={{ textAlign: 'center', padding: 12 }}><Button onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>加载更多</Button></div>}
      </Card>
      <SpaceDrawer spaceId={open} row={rows.find((r) => r.spaceId === open)} onClose={() => setParams({})} />
    </div>
  )
}

function SpaceDrawer({ spaceId, row, onClose }: { spaceId: string | null; row?: AdminSpace; onClose: () => void }) {
  const { data: q } = useQuery({ queryKey: qk.admin('quota', spaceId ?? ''), queryFn: () => getAdminSpaceQuota(spaceId!), enabled: Boolean(spaceId) })
  const [dialog, setDialog] = useState<'plan' | 'bonus' | null>(null)
  return (
    <Drawer open={Boolean(spaceId)} onClose={onClose} size={640} destroyOnHidden
      title={row?.name ?? '空间'}
      extra={q && <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => setDialog('bonus')}>赠送篇数</Button>
        <Button type="primary" onClick={() => setDialog('plan')}>{q.plan.code === 'free' ? '开通套餐' : '续期 / 换套餐'}</Button>
      </div>}>
      {!q || !spaceId ? <Skeleton active /> : (
        <>
          <QuotaSummary q={q} row={row} />
          <Typography.Title level={5} style={{ margin: '24px 0 8px' }}>用量流水</Typography.Title>
          <Ledger spaceId={spaceId} />
          <PlanDialog open={dialog === 'plan'} spaceId={spaceId} q={q} onClose={() => setDialog(null)} />
          <BonusDialog open={dialog === 'bonus'} spaceId={spaceId} onClose={() => setDialog(null)} />
        </>
      )}
    </Drawer>
  )
}

function QuotaSummary({ q, row }: { q: Quota; row?: AdminSpace }) {
  return (
    <Descriptions column={2} size="small" bordered styles={{ label: { whiteSpace: 'nowrap' } }} items={[
      { label: '套餐', children: <Tag color={PLAN_COLOR[q.plan.code]}>{q.plan.name}</Tag> },
      { label: '到期', children: q.plan.expiresAt ? expiryDate(q.plan.expiresAt) : '不到期' },
      { label: '剩余', children: q.plan.unlimited ? '不限' : <span className="num">{q.left.total} 篇（本月 {q.left.period} · 试用 {q.left.trial} · 赠送 {q.left.bonus}）</span> },
      { label: '本周期', children: q.periodEnd ? `${day(q.periodEnd)} 重置为 ${q.periodPieces} 篇` : '—' },
      { label: '所有者', children: row ? `${row.ownerName} ${row.ownerEmail}` : '—' },
      { label: '成员', children: `${row?.memberCount ?? '—'} / ${q.memberLimit || '不限'}` },
      { label: '累计用掉', children: <span className="num">{q.usedTotal} 篇</span> },
      { label: '本月花费', children: row ? yuan(row.costMonth) : '—' },
    ]} />
  )
}

function Ledger({ spaceId }: { spaceId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: qk.admin('ledger', spaceId),
    queryFn: ({ pageParam }) => listAdminSpaceLedger(spaceId, { cursor: pageParam, limit: 30 }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor || undefined,
  })
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  return (
    <>
      <Table<LedgerItem> rowKey="id" size="small" dataSource={rows} loading={isLoading} pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有记录" /> }}
        columns={[
          { title: '时间', dataIndex: 'createdAt', width: 150, render: (d: string) => formatDateTime(d) },
          { title: '类型', dataIndex: 'kind', width: 80, render: (k: LedgerItem['kind']) => LEDGER_LABEL[k] ?? k },
          { title: '说明', key: 'what', render: (_, it) => it.topic || it.remark || (it.planCode && (PLAN_LABEL[it.planCode] ?? it.planCode)) || '—' },
          { title: '变化', dataIndex: 'delta', width: 60, align: 'right', render: (d: number) => <span className="num">{d > 0 ? `+${d}` : d}</span> },
          { title: '剩余', dataIndex: 'leftAfter', width: 60, align: 'right', render: (n: number) => <span className="num">{n}</span> },
        ]} />
      {hasNextPage && <div style={{ textAlign: 'center', padding: 8 }}><Button size="small" onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>更早的</Button></div>}
    </>
  )
}

function useRefreshSpace(spaceId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['admin'] }).then(() => qc.invalidateQueries({ queryKey: qk.quota(spaceId) }))
}

function PlanDialog({ open, spaceId, q, onClose }: { open: boolean; spaceId: string; q: Quota; onClose: () => void }) {
  const { message } = App.useApp()
  const onError = useApiError()
  const refresh = useRefreshSpace(spaceId)
  const [form] = Form.useForm<{ planCode: string; expiresAt?: string; reason: string }>()
  const { data: plans } = useQuery({ queryKey: qk.admin('plans'), queryFn: listAdminPlans, enabled: open })
  const planCode = Form.useWatch('planCode', form)
  const paid = planCode !== 'free' && planCode !== 'internal'
  const save = useMutation({
    mutationFn: (v: { planCode: string; expiresAt?: string; reason: string }) => activatePlan(spaceId, { ...v, expiresAt: paid ? v.expiresAt : undefined }),
    onSuccess: async () => { message.success('已保存'); onClose(); await refresh() },
    onError: (e) => onError(e),
  })
  const renew = planCode === q.plan.code && paid
  return (
    <Modal title="开通 / 续期套餐" open={open} onCancel={onClose} okText="保存" confirmLoading={save.isPending} onOk={() => form.submit()} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}
        initialValues={{ planCode: q.plan.code === 'free' ? 'pro' : q.plan.code, expiresAt: q.plan.expiresAt ? expiryDate(q.plan.expiresAt) : undefined }}>
        <Form.Item name="planCode" label="套餐">
          <Select options={(plans?.items ?? []).map((p) => ({ value: p.code, label: `${p.name}${p.unlimited ? '（不限篇数）' : p.monthlyPieces ? `（每月 ${p.monthlyPieces} 篇）` : ''}` }))} />
        </Form.Item>
        {paid && (
          <Form.Item name="expiresAt" label="到期日" extra="当天结束时到期" rules={[{ required: true, message: '请选择到期日' }]}>
            <Input type="date" style={{ width: 200 }} />
          </Form.Item>
        )}
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {renew ? '同一套餐只改到期日，本月剩余篇数不变。'
            : paid ? '本周期从现在开始，本月篇数重置为套餐的每月篇数。'
              : '本月篇数清零；试用和赠送的保留。'}
        </Typography.Paragraph>
        <Form.Item name="reason" label="原因" rules={reasonRule}>
          <Input placeholder="如：合同 2026-118 已付款" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function BonusDialog({ open, spaceId, onClose }: { open: boolean; spaceId: string; onClose: () => void }) {
  const { message } = App.useApp()
  const onError = useApiError()
  const refresh = useRefreshSpace(spaceId)
  const [form] = Form.useForm<{ pieces: number; reason: string }>()
  const save = useMutation({
    mutationFn: (v: { pieces: number; reason: string }) => grantBonus(spaceId, v),
    onSuccess: async () => { message.success('已赠送'); onClose(); await refresh() },
    onError: (e) => onError(e),
  })
  return (
    <Modal title="赠送篇数" open={open} onCancel={onClose} okText="赠送" confirmLoading={save.isPending} onOk={() => form.submit()} destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ pieces: 10 }} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="pieces" label="篇数" extra="赠送的不过期；填负数扣回赠送" rules={[{ required: true, message: '请填写篇数' }]}>
          <InputNumber min={-10000} max={10000} precision={0} style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="reason" label="原因" rules={reasonRule}>
          <Input placeholder="如：生产故障补偿" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
