import { useState } from 'react'
import { Alert, Button, Checkbox, Form, Input } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { codeLogin, login } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import AuthLayout from './AuthLayout'
import EmailWithCode from './EmailCodeField'
import { applyFieldError, emailRules } from './formErrors'

/** 只接受站内相对地址，防止登录后被带去别的网站。 */
export function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

/**
 * 登录和注册是同一个入口：邮箱 + 验证码，没注册过的邮箱验证后自动注册。
 * 设过密码的也可以切到「用密码登录」。从团队邀请链接来的（next=/join/…），登录后顺带加入那个团队。
 */
export default function LoginPage() {
  const [form] = Form.useForm()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [mode, setMode] = useState<'code' | 'password'>('code')
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const next = safeNext(params.get('next'))
  const inviteToken = next.startsWith('/join/') ? next.slice('/join/'.length) : ''

  const onError = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'LOGIN_FAILED') {
      form.setFields([{ name: 'password', errors: [e.message] }])
      return
    }
    if (!applyFieldError(form, e)) setBanner(e instanceof ApiError ? e.message : '登录失败，请重试')
  }

  const submit = async (v: { email: string; emailCode?: string; password?: string; remember: boolean }) => {
    setLoading(true)
    setBanner('')
    try {
      const me = mode === 'code'
        ? await codeLogin({ email: v.email, emailCode: v.emailCode ?? '', inviteToken: inviteToken || undefined, remember: v.remember })
        : await login({ email: v.email, password: v.password ?? '', remember: v.remember })
      qc.setQueryData(qk.me(), me)
      // 验证码登录已顺带加入团队；密码登录回到邀请页再确认加入
      navigate(inviteToken && mode === 'code' ? '/' : next, { replace: true })
    } catch (e) {
      onError(e)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setBanner('')
    form.setFields([{ name: 'password', errors: [] }, { name: 'emailCode', errors: [] }])
    setMode(mode === 'code' ? 'password' : 'code')
  }

  return (
    <AuthLayout
      title="登录稿谱"
      subtitle={mode === 'code' ? '没注册过的邮箱，验证后自动注册。' : '用设置过的密码登录。'}
    >
      {banner && <Alert type="error" message={banner} style={{ marginBottom: 20 }} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} initialValues={{ remember: true }}>
        {mode === 'code' ? (
          <EmailWithCode form={form} purpose="login" onError={onError} />
        ) : (
          <>
            <Form.Item label="邮箱" name="email" rules={emailRules}>
              <Input size="large" autoComplete="email" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请填写密码' }]}
              extra="没设过密码？先用验证码登录，再到右上角「账号设置」里设置。">
              <Input.Password size="large" autoComplete="current-password" />
            </Form.Item>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>30 天内自动登录</Checkbox>
          </Form.Item>
          {mode === 'password' && <Link to="/forgot-password">忘记密码？</Link>}
        </div>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {mode === 'code' ? '登录 / 注册' : '登录'}
        </Button>
      </Form>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Button type="link" onClick={switchMode}>{mode === 'code' ? '用密码登录' : '用验证码登录'}</Button>
      </div>
    </AuthLayout>
  )
}
