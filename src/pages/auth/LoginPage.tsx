import { useState } from 'react'
import { Alert, Button, Checkbox, Form, Input, Typography } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { login } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import AuthLayout from './AuthLayout'
import { emailRules } from './formErrors'

/** 只接受站内相对地址，防止登录后被带去别的网站。 */
export function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default function LoginPage() {
  const [form] = Form.useForm()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const next = safeNext(params.get('next'))

  const submit = async (v: { email: string; password: string; remember: boolean }) => {
    setLoading(true)
    setBanner('')
    try {
      const me = await login(v)
      qc.setQueryData(qk.me(), me)
      navigate(next, { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LOGIN_FAILED') form.setFields([{ name: 'password', errors: [e.message] }])
      else setBanner(e instanceof ApiError ? e.message : '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="登录稿谱" subtitle="用注册时的邮箱登录">
      {banner && <Alert type="error" message={banner} style={{ marginBottom: 20 }} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} initialValues={{ remember: true }}>
        <Form.Item label="邮箱" name="email" rules={emailRules}>
          <Input size="large" autoComplete="email" autoFocus />
        </Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请填写密码' }]}>
          <Input.Password size="large" autoComplete="current-password" />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>30 天内自动登录</Checkbox>
          </Form.Item>
          <Link to="/forgot-password">忘记密码？</Link>
        </div>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>登录</Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 24 }}>
        还没有账号？<Link to={`/register${next.startsWith('/join/') ? `?invite=${next.slice(6)}` : ''}`}>注册</Link>
      </Typography.Paragraph>
    </AuthLayout>
  )
}
