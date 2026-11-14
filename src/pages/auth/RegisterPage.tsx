import { useState } from 'react'
import { Alert, Button, Form, Input, Typography } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { getAuthOptions, register } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import AuthLayout from './AuthLayout'
import EmailWithCode from './EmailCodeField'
import { applyFieldError, passwordRules } from './formErrors'

/** 注册：凭邀请码；从团队邀请链接来的（?invite=）不要邀请码，注册完直接进那个团队空间。 */
export default function RegisterPage() {
  const [form] = Form.useForm()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const inviteToken = params.get('invite') ?? ''
  const { data: options } = useQuery({ queryKey: qk.authOptions(), queryFn: getAuthOptions })
  const needCode = !inviteToken && options?.registration !== 'open'
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const onError = (e: unknown) => {
    if (!applyFieldError(form, e)) setBanner(e instanceof ApiError ? e.message : '注册失败，请重试')
  }

  const submit = async (v: { inviteCode?: string; email: string; emailCode: string; password: string; displayName: string }) => {
    setLoading(true)
    setBanner('')
    try {
      const me = await register({ ...v, inviteToken: inviteToken || undefined })
      qc.setQueryData(qk.me(), me)
      navigate('/', { replace: true })
    } catch (e) {
      onError(e)
    } finally {
      setLoading(false)
    }
  }

  const subtitle = inviteToken
    ? '注册后直接加入邀请你的团队空间。'
    : needCode ? '现在凭邀请码注册。被同事邀请的，直接点邀请链接即可。' : '用邮箱注册，注册后自动建好你的个人空间。'

  return (
    <AuthLayout title="注册稿谱" subtitle={subtitle}>
      {banner && <Alert type="warning" showIcon message={banner} style={{ marginBottom: 20 }} />}
      <Form form={form} layout="vertical" onFinish={submit}>
        {needCode && (
          <Form.Item label="邀请码" name="inviteCode" rules={[{ required: true, message: '稿谱暂未开放注册。需要试用请联系我们获取邀请码。' }]}>
            <Input size="large" placeholder="如 K7QX-M3PA" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        )}
        <EmailWithCode form={form} purpose="register" onError={onError} />
        <Form.Item label="设置密码" name="password" rules={passwordRules} extra="至少 8 位，同时包含字母和数字">
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item label="怎么称呼你" name="displayName" rules={[{ required: true, whitespace: true, message: '请填写称呼' }, { max: 30, message: '最多 30 个字' }]}>
          <Input size="large" maxLength={30} />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>注册并进入</Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 24 }}>
        已有账号？<Link to={inviteToken ? `/login?next=${encodeURIComponent(`/join/${inviteToken}`)}` : '/login'}>登录</Link>
      </Typography.Paragraph>
    </AuthLayout>
  )
}
