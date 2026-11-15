import { useState } from 'react'
import { App, Button, Card, Form, Input, InputNumber, Modal, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAdminPlans, updatePlan } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { Plan } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { reasonRule } from './admin'

/** 套餐：每月篇数、成员上限。改了只影响之后开通和每月重置的，已开通的本月篇数不变。价格不在系统里。 */
export default function AdminPlansPage() {
  const [editing, setEditing] = useState<Plan | null>(null)
  const { data, isLoading } = useQuery({ queryKey: qk.admin('plans'), queryFn: listAdminPlans })
  return (
    <div style={{ paddingBottom: 24 }}>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<Plan> rowKey="code" dataSource={data?.items ?? []} loading={isLoading} pagination={false} columns={[
          { title: '套餐', dataIndex: 'name', render: (n: string, p) => <>{n}{!p.public && <Tag style={{ marginInlineStart: 8 }}>不对外</Tag>}</> },
          { title: '每月篇数', dataIndex: 'monthlyPieces', width: 140, align: 'right', render: (n: number, p) => (p.unlimited ? '不限' : p.code === 'free' ? '只有试用' : <span className="num">{n}</span>) },
          { title: '成员上限', dataIndex: 'memberLimit', width: 140, align: 'right', render: (n: number) => (n ? <span className="num">{n} 人</span> : '不限') },
          { title: '', key: 'ops', width: 80, align: 'right', render: (_, p) => !p.unlimited && <Button type="link" onClick={() => setEditing(p)}>修改</Button> },
        ]} />
      </Card>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        新空间的试用篇数在「设置」里改。报价和收款在系统外，付款后到「空间」里给对方开通。
      </Typography.Paragraph>
      <PlanDialog plan={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { message } = App.useApp()
  const onError = useApiError()
  const qc = useQueryClient()
  const [form] = Form.useForm<{ monthlyPieces: number; memberLimit: number; reason: string }>()
  const save = useMutation({
    mutationFn: (v: { monthlyPieces: number; memberLimit: number; reason: string }) => updatePlan(plan!.code, v),
    onSuccess: async () => { message.success('已保存'); onClose(); await qc.invalidateQueries({ queryKey: ['admin'] }) },
    onError: (e) => onError(e),
  })
  return (
    <Modal title={`修改${plan?.name ?? ''}`} open={Boolean(plan)} onCancel={onClose} okText="保存" confirmLoading={save.isPending} onOk={() => form.submit()} destroyOnHidden>
      {plan && (
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}
          initialValues={{ monthlyPieces: plan.monthlyPieces, memberLimit: plan.memberLimit }}>
          {plan.code !== 'free' && (
            <Form.Item name="monthlyPieces" label="每月篇数" rules={[{ required: true, message: '请填写' }]}>
              <InputNumber min={0} max={100000} precision={0} style={{ width: 160 }} />
            </Form.Item>
          )}
          <Form.Item name="memberLimit" label="成员上限" extra="0 表示不限" rules={[{ required: true, message: '请填写' }]}>
            <InputNumber min={0} max={1000} precision={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={reasonRule}><Input maxLength={200} /></Form.Item>
        </Form>
      )}
    </Modal>
  )
}
