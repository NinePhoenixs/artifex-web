import { App, Button, Card, Form, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changePassword, endMySession, endOtherSessions, listMyLoginLogs, listMySessions, updateMe } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { LoginLog, LoginSession } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { formatDateTime, formatRelativeTime } from '@/utils/time'
import { deviceName } from '@/utils/userAgent'
import { useSession } from '@/session/SessionContext'
import { applyFieldError, passwordRules } from '@/pages/auth/formErrors'

/** 账号设置：改称呼、改密码、正在登录的设备、登录记录。跟着人走，不分空间。 */
export default function AccountSettingsPage() {
  const { me, refresh } = useSession()
  const { message } = App.useApp()
  const [nameForm] = Form.useForm<{ displayName: string }>()
  const [pwdForm] = Form.useForm<{ oldPassword?: string; newPassword: string }>()
  const hasPassword = me.user.hasPassword

  const saveName = useMutation({
    mutationFn: (displayName: string) => updateMe({ displayName }),
    onSuccess: async () => { message.success('已保存'); await refresh() },
    onError: (e) => { if (!applyFieldError(nameForm, e)) message.error('保存失败，请重试') },
  })
  const savePwd = useMutation({
    mutationFn: changePassword,
    onSuccess: async () => {
      message.success(hasPassword ? '密码已修改，其他设备上的登录已退出' : '密码已设置，以后也可以用密码登录')
      pwdForm.resetFields()
      await refresh()
    },
    onError: (e) => { if (!applyFieldError(pwdForm, e, { password: 'newPassword' })) message.error('修改失败，请重试') },
  })

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>账号设置</Typography.Title>
      <Typography.Text type="secondary">这里的设置跟着你走，不分空间。</Typography.Text>
      <Space orientation="vertical" size={16} style={{ width: '100%', marginTop: 20 }}>
        <Card title="基本信息">
          <Form form={nameForm} layout="vertical" requiredMark={false} initialValues={{ displayName: me.user.displayName }}
            onFinish={(v) => saveName.mutate(v.displayName)}>
            <Form.Item label="邮箱">
              <Typography.Text>{me.user.email}</Typography.Text>
            </Form.Item>
            <Form.Item name="displayName" label="称呼" rules={[{ required: true, whitespace: true, message: '请填写称呼' }, { max: 30, message: '最多 30 个字' }]}>
              <Input maxLength={30} style={{ maxWidth: 320 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saveName.isPending}>保存</Button>
          </Form>
        </Card>
        <Card title={hasPassword ? '修改密码' : '设置密码'}>
          {!hasPassword && (
            <Typography.Paragraph type="secondary">
              你现在用邮箱验证码登录。设个密码后，也可以用邮箱和密码登录。
            </Typography.Paragraph>
          )}
          <Form form={pwdForm} layout="vertical" requiredMark={false} onFinish={(v) => savePwd.mutate(v)} style={{ maxWidth: 320 }}>
            {hasPassword && (
              <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请填写旧密码' }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
            )}
            <Form.Item name="newPassword" label={hasPassword ? '新密码' : '密码'} rules={passwordRules}
              extra={hasPassword ? '至少 8 位，同时包含字母和数字。改完后其他设备上的登录会退出。' : '至少 8 位，同时包含字母和数字'}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={savePwd.isPending}>{hasPassword ? '修改密码' : '设置密码'}</Button>
          </Form>
        </Card>
        <SessionsCard />
        <LoginLogsCard />
      </Space>
    </div>
  )
}

/** 正在登录的设备：当前这个排第一；可以逐个退出，或一次退出其他所有设备。 */
function SessionsCard() {
  const { message } = App.useApp()
  const { logout } = useSession()
  const onError = useApiError()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: qk.mySessions(), queryFn: listMySessions })
  const reload = () => qc.invalidateQueries({ queryKey: qk.mySessions() })
  const endOne = useMutation({
    mutationFn: endMySession,
    onSuccess: () => { message.success('已退出'); void reload() },
    onError: (e) => onError(e, { onNotFound: () => void reload() }),
  })
  const endOthers = useMutation({
    mutationFn: endOtherSessions,
    onSuccess: () => { message.success('其他设备上的登录已退出'); void reload() },
    onError: (e) => onError(e),
  })
  const items = data?.items ?? []
  return (
    <Card title="正在登录的设备" styles={{ body: { padding: 0 } }}
      extra={items.length > 1 && (
        <Popconfirm title="退出其他所有设备？" description="除了现在这个浏览器，其他地方都要重新登录。" okText="全部退出" onConfirm={() => endOthers.mutate()}>
          <Button type="link" loading={endOthers.isPending}>退出其他所有设备</Button>
        </Popconfirm>
      )}>
      <Table<LoginSession> rowKey="sessionId" dataSource={items} loading={isLoading} pagination={false} showHeader={false}
        columns={[
          {
            key: 'device',
            render: (_, s) => (
              <>
                <Typography.Text strong>{deviceName(s.userAgent)}</Typography.Text>
                {s.current && <Tag color="blue" style={{ marginInlineStart: 8 }}>当前</Tag>}
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {s.ip || '未知 IP'} · {formatDateTime(s.createdAt)} 登录{s.remember ? ' · 30 天内自动登录' : ''}
                </Typography.Text>
              </>
            ),
          },
          { key: 'seen', width: 150, render: (_, s) => <Typography.Text type="secondary">{s.current ? '正在使用' : `${formatRelativeTime(s.lastSeenAt)} 用过`}</Typography.Text> },
          {
            key: 'ops', width: 90, align: 'right',
            render: (_, s) => (s.current
              ? <Button type="link" onClick={() => void logout()}>退出</Button>
              : <Button type="link" danger loading={endOne.isPending && endOne.variables === s.sessionId} onClick={() => endOne.mutate(s.sessionId)}>退出</Button>),
          },
        ]} />
    </Card>
  )
}

const RESULT: Record<LoginLog['result'], { text: string; color?: string }> = {
  ok: { text: '成功', color: 'green' },
  bad_password: { text: '密码不对', color: 'orange' },
  locked: { text: '锁定中', color: 'red' },
  disabled: { text: '账号已停用', color: 'red' },
  no_account: { text: '邮箱未注册' },
}

/** 登录记录：最近 30 天，成功和失败都有。看到不认识的，先改密码、退出其他设备。 */
function LoginLogsCard() {
  const { data, isLoading } = useQuery({ queryKey: qk.myLoginLogs(), queryFn: listMyLoginLogs })
  return (
    <Card title="登录记录" extra={<Typography.Text type="secondary">最近 30 天</Typography.Text>} styles={{ body: { padding: 0 } }}>
      <Table<LoginLog> rowKey={(l) => `${l.createdAt}-${l.ip}`} dataSource={data?.items ?? []} loading={isLoading}
        pagination={{ pageSize: 10, hideOnSinglePage: true, size: 'small' }} size="small"
        columns={[
          { title: '时间', dataIndex: 'createdAt', width: 170, render: (d: string) => formatDateTime(d) },
          { title: '设备', dataIndex: 'userAgent', render: (ua: string) => deviceName(ua) },
          { title: 'IP', dataIndex: 'ip', width: 140 },
          { title: '结果', dataIndex: 'result', width: 100, render: (r: LoginLog['result']) => <Tag color={RESULT[r]?.color}>{RESULT[r]?.text ?? r}</Tag> },
        ]} />
    </Card>
  )
}
