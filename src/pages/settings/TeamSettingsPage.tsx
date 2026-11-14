import { useState } from 'react'
import { App, Button, Card, Form, Input, Modal, Popconfirm, Radio, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeRole, createInvite, listMembers, removeMember, renameSpace, revokeInvite, transferOwnership } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { CreatedInvite, Member, PendingInvite, Role } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { useSession } from '@/session/SessionContext'
import { ROLE_HINT, ROLE_LABEL } from '@/session/permissions'
import { brand } from '@/theme'
import { formatDateTime } from '@/utils/time'

const ASSIGNABLE: Role[] = ['admin', 'editor', 'member']

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  return d <= 1 ? '今天过期' : `${d} 天后过期`
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <span style={{
      width: 32, height: 32, borderRadius: '50%', flex: 'none', display: 'inline-grid', placeItems: 'center',
      background: muted ? '#D9D6CE' : brand.gold, color: '#fff', fontWeight: 600,
    }}>
      {muted ? '—' : Array.from(name)[0]?.toUpperCase()}
    </span>
  )
}

/** 团队与设置：成员（团队空间）+ 空间信息。个人空间只有空间信息。 */
export default function TeamSettingsPage() {
  const { space } = useSession()
  const team = space.kind === 'team'
  return (
    <div style={{ padding: 24, maxWidth: 1080, margin: '0 auto', width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>{space.name}</Typography.Title>
      <Typography.Text type="secondary">
        {team ? '团队空间' : '个人空间'} · 你是{ROLE_LABEL[space.role]}
      </Typography.Text>
      <Tabs
        style={{ marginTop: 16 }}
        items={[
          ...(team ? [{ key: 'members', label: '成员', children: <Members /> }] : []),
          { key: 'info', label: '空间信息', children: <SpaceInfo /> },
        ]}
      />
    </div>
  )
}

type Row = { kind: 'member'; m: Member } | { kind: 'invite'; i: PendingInvite }

function Members() {
  const { me, space, can, refresh } = useSession()
  const { message } = App.useApp()
  const onError = useApiError()
  const qc = useQueryClient()
  const [inviting, setInviting] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: qk.members(space.spaceId), queryFn: () => listMembers(space.spaceId) })
  const reload = () => qc.invalidateQueries({ queryKey: qk.members(space.spaceId) })

  const role = useMutation({
    mutationFn: ({ userId, r }: { userId: string; r: Role }) => changeRole(space.spaceId, userId, r),
    onSuccess: () => { message.success('角色已修改'); void reload() },
    onError: (e) => onError(e, { onNotFound: reload }),
  })
  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(space.spaceId, userId),
    onSuccess: () => { message.success('已移出'); void reload() },
    onError: (e) => onError(e, { onNotFound: reload }),
  })
  const transfer = useMutation({
    mutationFn: (userId: string) => transferOwnership(space.spaceId, userId),
    onSuccess: async () => { message.success('所有权已转让'); await reload(); await refresh() },
    onError: (e) => onError(e, { onNotFound: reload }),
  })
  const revoke = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(space.spaceId, inviteId),
    onSuccess: () => { message.success('邀请已撤回'); void reload() },
    onError: (e) => onError(e, { onNotFound: reload }),
  })

  const rows: Row[] = [
    ...(data?.members ?? []).map((m) => ({ kind: 'member' as const, m })),
    ...(data?.invites ?? []).map((i) => ({ kind: 'invite' as const, i })),
  ]

  const columns: TableColumnsType<Row> = [
    {
      title: '成员',
      key: 'who',
      render: (_, r) => r.kind === 'member' ? (
        <Space>
          <Avatar name={r.m.displayName || r.m.email} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.m.displayName}{r.m.userId === me.user.userId && '（你）'}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.m.email}</Typography.Text>
          </div>
        </Space>
      ) : (
        <Space>
          <Avatar name="" muted />
          <div>
            <div style={{ fontWeight: 600 }}>邀请链接 · 已加入 {r.i.usedCount}/{r.i.maxUses}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.i.inviterName || '—'} 发出，还没用完</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      key: 'role',
      width: 160,
      render: (_, r) => {
        if (r.kind === 'invite') return <Tag>{ROLE_LABEL[r.i.role]}</Tag>
        const editable = can.manageMembers && r.m.role !== 'owner' && r.m.userId !== me.user.userId
        if (!editable) return <Tag color={r.m.role === 'owner' ? 'blue' : undefined}>{ROLE_LABEL[r.m.role]}</Tag>
        return (
          <Select
            size="small"
            style={{ width: 110 }}
            value={r.m.role}
            options={ASSIGNABLE.map((x) => ({ value: x, label: ROLE_LABEL[x] }))}
            onChange={(v) => role.mutate({ userId: r.m.userId, r: v })}
          />
        )
      },
    },
    {
      title: '加入时间',
      key: 'when',
      width: 180,
      render: (_, r) => r.kind === 'member' ? formatDateTime(r.m.joinedAt) : <Tag color="gold">{daysLeft(r.i.expiresAt)}</Tag>,
    },
    {
      title: '',
      key: 'ops',
      width: 180,
      align: 'right',
      render: (_, r) => {
        if (!can.manageMembers) return null
        if (r.kind === 'invite') {
          return <Button type="link" onClick={() => revoke.mutate(r.i.inviteId)}>撤回邀请</Button>
        }
        if (r.m.role === 'owner' || r.m.userId === me.user.userId) return null
        return (
          <Space size={0}>
            {can.transfer && r.m.role === 'admin' && (
              <Popconfirm
                title={`把「${space.name}」的所有权转给 ${r.m.displayName}？`}
                description="转让后你会变成管理员。"
                okText="转让"
                onConfirm={() => transfer.mutate(r.m.userId)}
              >
                <Button type="link">转让所有权</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title={`确定把 ${r.m.displayName} 移出「${space.name}」吗？`}
              description="他建的内容会留在空间里。"
              okText="移出"
              okButtonProps={{ danger: true }}
              onConfirm={() => remove.mutate(r.m.userId)}
            >
              <Button type="link" danger>移出</Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <>
      <Card
        title={`成员 ${data?.members.length ?? ''}`}
        extra={can.manageMembers && <Button type="primary" onClick={() => setInviting(true)}>邀请成员</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table<Row>
          rowKey={(r) => (r.kind === 'member' ? r.m.userId : r.i.inviteId)}
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={false}
        />
      </Card>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        成员被移出后，他建的应用、配方和生产记录仍留在空间里。
      </Typography.Paragraph>
      <InviteModal open={inviting} onClose={() => { setInviting(false); void reload() }} />
    </>
  )
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { space } = useSession()
  const { message } = App.useApp()
  const onError = useApiError()
  const [role, setRole] = useState<Role>('editor')
  const [created, setCreated] = useState<CreatedInvite | null>(null)
  const gen = useMutation({
    mutationFn: () => createInvite(space.spaceId, role),
    onSuccess: setCreated,
    onError: (e) => onError(e),
  })
  const close = () => {
    setCreated(null)
    onClose()
  }
  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.url)
      message.success('链接已复制')
    } catch {
      message.info('复制不了，请手动选中链接复制')
    }
  }
  return (
    <Modal
      title="邀请成员"
      open={open}
      onCancel={close}
      footer={created
        ? [<Button key="done" onClick={close}>完成</Button>, <Button key="copy" type="primary" onClick={copy}>复制链接</Button>]
        : [<Button key="cancel" onClick={close}>取消</Button>, <Button key="gen" type="primary" loading={gen.isPending} onClick={() => gen.mutate()}>生成邀请链接</Button>]}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        把链接发给对方。没有稿谱账号的人，点开后注册即可加入，不需要邀请码。
      </Typography.Paragraph>
      {created ? (
        <>
          <Input.TextArea value={created.url} readOnly autoSize style={{ fontFamily: 'monospace' }} onFocus={(e) => e.target.select()} />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            加入后是{ROLE_LABEL[created.role]}。7 天内有效，最多 {created.maxUses} 人使用；可以在成员列表里撤回。
          </Typography.Paragraph>
        </>
      ) : (
        <Radio.Group value={role} onChange={(e) => setRole(e.target.value)} style={{ display: 'grid', gap: 10 }}>
          {ASSIGNABLE.map((r) => (
            <Radio key={r} value={r}>
              <strong>{ROLE_LABEL[r]}</strong>
              <Typography.Text type="secondary" style={{ marginInlineStart: 8 }}>{ROLE_HINT[r]}</Typography.Text>
            </Radio>
          ))}
        </Radio.Group>
      )}
    </Modal>
  )
}

function SpaceInfo() {
  const { space, can, refresh } = useSession()
  const { message } = App.useApp()
  const [form] = Form.useForm<{ name: string }>()
  const save = useMutation({
    mutationFn: (name: string) => renameSpace(space.spaceId, name),
    onSuccess: async () => { message.success('已保存'); await refresh() },
    onError: (e) => form.setFields([{ name: 'name', errors: [e instanceof Error ? e.message : '保存失败'] }]),
  })
  return (
    <Card style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ name: space.name }}
        onFinish={(v) => save.mutate(v.name)} disabled={!can.manageSpace}>
        <Form.Item name="name" label="空间名称" rules={[{ required: true, whitespace: true, message: '请填写空间名称' }, { max: 30, message: '最多 30 个字' }]}>
          <Input maxLength={30} />
        </Form.Item>
        <Form.Item label="空间类型">
          <Typography.Text>{space.kind === 'team' ? `团队空间 · ${space.memberCount} 人` : '个人空间 · 只有你'}</Typography.Text>
        </Form.Item>
        {can.manageSpace && <Button type="primary" htmlType="submit" loading={save.isPending}>保存</Button>}
      </Form>
      {!can.manageSpace && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          你在这个空间是「{ROLE_LABEL[space.role]}」，不能修改空间信息。需要改动请联系空间管理员。
        </Typography.Paragraph>
      )}
    </Card>
  )
}
