import { useState } from 'react'
import { App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { createInviteCode, disableInviteCode, listInviteCodes } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { InviteCode } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { useSession } from '@/session/SessionContext'
import { formatDateTime } from '@/utils/time'

const STATUS: Record<InviteCode['status'], { text: string; color?: string }> = {
  active: { text: '可用', color: 'green' },
  used_up: { text: '已用完' },
  expired: { text: '已过期' },
  disabled: { text: '已停用' },
}

const VALID_DAYS = [
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
  { value: 0, label: '不过期' },
]

/** 平台邀请码：没开放注册时，凭它注册。只有平台管理员能进。 */
export default function InviteCodesPage() {
  const { isPlatformAdmin } = useSession()
  const { message, modal } = App.useApp()
  const onError = useApiError()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<{ remark: string; maxUses: number; days: number }>()
  const { data, isLoading } = useQuery({ queryKey: qk.inviteCodes(), queryFn: listInviteCodes, enabled: isPlatformAdmin })
  const reload = () => qc.invalidateQueries({ queryKey: qk.inviteCodes() })

  const create = useMutation({
    mutationFn: (v: { remark: string; maxUses: number; days: number }) => createInviteCode({
      remark: v.remark ?? '',
      maxUses: v.maxUses,
      expiresAt: v.days ? new Date(Date.now() + v.days * 86_400_000).toISOString() : undefined,
    }),
    onSuccess: (c) => {
      setCreating(false)
      form.resetFields()
      void reload()
      modal.success({ title: '邀请码已生成', content: <Typography.Paragraph copyable style={{ fontSize: 20, marginTop: 8 }}>{c.code}</Typography.Paragraph> })
    },
    onError: (e) => onError(e),
  })
  const disable = useMutation({
    mutationFn: disableInviteCode,
    onSuccess: () => { message.success('已停用'); void reload() },
    onError: (e) => onError(e),
  })

  if (!isPlatformAdmin) return <Navigate to="/" replace />

  const columns: TableColumnsType<InviteCode> = [
    { title: '邀请码', dataIndex: 'code', render: (c: string) => <Typography.Text copyable strong style={{ fontFamily: 'monospace' }}>{c}</Typography.Text> },
    { title: '备注', dataIndex: 'remark', render: (r: string) => r || <Typography.Text type="secondary">—</Typography.Text> },
    { title: '已用 / 可用', key: 'uses', width: 120, align: 'right', render: (_, c) => <span className="num">{c.usedCount} / {c.maxUses}</span> },
    { title: '有效期至', dataIndex: 'expiresAt', width: 170, render: (d: string | null) => (d ? formatDateTime(d) : '不过期') },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: InviteCode['status']) => <Tag color={STATUS[s].color}>{STATUS[s].text}</Tag> },
    {
      title: '', key: 'ops', width: 90, align: 'right',
      render: (_, c) => c.status === 'active' && (
        <Popconfirm title={`停用 ${c.code}？`} description="停用后不能再用它注册，已注册的账号不受影响。" okText="停用" onConfirm={() => disable.mutate(c.code)}>
          <Button type="link" danger>停用</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1080, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>邀请码</Typography.Title>
          <Typography.Text type="secondary">拿到邀请码或团队邀请链接的人才能注册。</Typography.Text>
        </div>
        <Button type="primary" style={{ marginInlineStart: 'auto' }} onClick={() => setCreating(true)}>生成邀请码</Button>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<InviteCode> rowKey="code" columns={columns} dataSource={data?.items ?? []} loading={isLoading} pagination={false} />
      </Card>
      <Modal title="生成邀请码" open={creating} okText="生成" confirmLoading={create.isPending}
        onOk={() => form.submit()} onCancel={() => setCreating(false)} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ maxUses: 1, days: 30 }} onFinish={(v) => create.mutate(v)}>
          <Form.Item name="remark" label="备注" extra="发给谁，方便以后认出来">
            <Input maxLength={255} placeholder="如：给留学机构试用" />
          </Form.Item>
          <Form.Item name="maxUses" label="可用次数" rules={[{ required: true, message: '请填写可用次数' }]}>
            <InputNumber min={1} max={100} precision={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="days" label="有效期">
            <Select options={VALID_DAYS} style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
