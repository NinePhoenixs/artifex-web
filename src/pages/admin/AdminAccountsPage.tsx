import { useState } from 'react'
import { App, Button, Card, Form, Input, Modal, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAdminAccounts, setAccountStatus } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AdminAccount } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { useSession } from '@/session/SessionContext'
import { formatDateTime, formatRelativeTime } from '@/utils/time'
import { reasonRule } from './admin'

/** 用户：注册了谁、最近登录、在几个空间；可以停用（立即掉线）和启用。 */
export default function AdminAccountsPage() {
  const { me } = useSession()
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<AdminAccount | null>(null)
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: qk.admin('accounts', { q }),
    queryFn: ({ pageParam }) => listAdminAccounts({ q, cursor: pageParam, limit: 50 }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor || undefined,
  })
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  const columns: TableColumnsType<AdminAccount> = [
    {
      title: '邮箱', dataIndex: 'email',
      render: (e: string, a) => <>{e}{a.isPlatformAdmin && <Tag color="gold" style={{ marginInlineStart: 8 }}>平台管理员</Tag>}</>,
    },
    { title: '称呼', dataIndex: 'displayName' },
    { title: '注册', dataIndex: 'createdAt', width: 170, render: (d: string) => formatDateTime(d) },
    { title: '最近登录', dataIndex: 'lastLoginAt', width: 150, render: (d: string | null) => (d ? formatRelativeTime(d) : <Typography.Text type="secondary">—</Typography.Text>) },
    { title: '空间', dataIndex: 'spaceCount', width: 70, align: 'right', render: (n: number) => <span className="num">{n}</span> },
    { title: '状态', dataIndex: 'status', width: 80, render: (s: AdminAccount['status']) => (s === 'disabled' ? <Tag color="red">已停用</Tag> : <Tag color="green">正常</Tag>) },
    {
      title: '', key: 'ops', width: 80, align: 'right',
      render: (_, a) => a.userId !== me.user.userId && (
        <Button type="link" danger={a.status === 'active'} onClick={() => setTarget(a)}>{a.status === 'active' ? '停用' : '启用'}</Button>
      ),
    },
  ]
  return (
    <div style={{ paddingBottom: 24 }}>
      <Input.Search allowClear placeholder="邮箱或称呼" style={{ width: 320, marginBottom: 16 }} onSearch={setQ} />
      <Card styles={{ body: { padding: 0 } }}>
        <Table<AdminAccount> rowKey="userId" columns={columns} dataSource={rows} loading={isLoading} pagination={false} />
        {hasNextPage && <div style={{ textAlign: 'center', padding: 12 }}><Button onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>加载更多</Button></div>}
      </Card>
      <StatusDialog account={target} onClose={() => setTarget(null)} />
    </div>
  )
}

function StatusDialog({ account, onClose }: { account: AdminAccount | null; onClose: () => void }) {
  const { message } = App.useApp()
  const onError = useApiError()
  const qc = useQueryClient()
  const [form] = Form.useForm<{ reason: string }>()
  const disabling = account?.status === 'active'
  const save = useMutation({
    mutationFn: (v: { reason: string }) => setAccountStatus(account!.userId, { status: disabling ? 'disabled' : 'active', reason: v.reason }),
    onSuccess: async () => { message.success(disabling ? '已停用' : '已启用'); onClose(); await qc.invalidateQueries({ queryKey: ['admin'] }) },
    onError: (e) => onError(e),
  })
  return (
    <Modal title={disabling ? `停用 ${account?.email}` : `启用 ${account?.email}`} open={Boolean(account)} onCancel={onClose}
      okText={disabling ? '停用' : '启用'} okButtonProps={{ danger: disabling }} confirmLoading={save.isPending} onOk={() => form.submit()} destroyOnHidden>
      <Typography.Paragraph type="secondary">
        {disabling ? `停用后 ${account?.displayName} 立刻不能登录，已登录的设备马上掉线；他所在空间的数据不受影响。` : '启用后可以重新登录。'}
      </Typography.Paragraph>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="reason" label="原因" rules={reasonRule}><Input maxLength={200} /></Form.Item>
      </Form>
    </Modal>
  )
}
