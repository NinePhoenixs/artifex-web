import { App, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { changePassword, updateMe } from '@/api/endpoints'
import { useSession } from '@/session/SessionContext'
import { applyFieldError, passwordRules } from '@/pages/auth/formErrors'

/** 账号设置：改称呼、改密码。跟着人走，不分空间。 */
export default function AccountSettingsPage() {
  const { me, refresh } = useSession()
  const { message } = App.useApp()
  const [nameForm] = Form.useForm<{ displayName: string }>()
  const [pwdForm] = Form.useForm<{ oldPassword: string; newPassword: string }>()

  const saveName = useMutation({
    mutationFn: (displayName: string) => updateMe({ displayName }),
    onSuccess: async () => { message.success('已保存'); await refresh() },
    onError: (e) => { if (!applyFieldError(nameForm, e)) message.error('保存失败，请重试') },
  })
  const savePwd = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { message.success('密码已修改，其他设备上的登录已退出'); pwdForm.resetFields() },
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
        <Card title="修改密码">
          <Form form={pwdForm} layout="vertical" requiredMark={false} onFinish={(v) => savePwd.mutate(v)} style={{ maxWidth: 320 }}>
            <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请填写旧密码' }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item name="newPassword" label="新密码" rules={passwordRules} extra="至少 8 位，同时包含字母和数字。改完后其他设备上的登录会退出。">
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={savePwd.isPending}>修改密码</Button>
          </Form>
        </Card>
      </Space>
    </div>
  )
}
