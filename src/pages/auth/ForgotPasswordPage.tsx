import { useState } from 'react'
import { Alert, Button, Form, Input, Typography } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { resetPassword } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import AuthLayout from './AuthLayout'
import EmailWithCode from './EmailCodeField'
import { applyFieldError, passwordRules } from './formErrors'

/** 用邮箱验证码重设密码；成功后直接登录，其他设备上的登录全部退出。 */
export default function ForgotPasswordPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const onError = (e: unknown) => {
    if (!applyFieldError(form, e, { password: 'newPassword' })) setBanner(e instanceof ApiError ? e.message : '操作失败，请重试')
  }

  const submit = async (v: { email: string; emailCode: string; newPassword: string }) => {
    setLoading(true)
    setBanner('')
    try {
      const me = await resetPassword(v)
      qc.setQueryData(qk.me(), me)
      navigate('/', { replace: true })
    } catch (e) {
      onError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="重设密码" subtitle={<>验证码会发到注册邮箱，10 分钟内有效。<Link to="/login">返回登录</Link></>}>
      {banner && <Alert type="warning" showIcon message={banner} style={{ marginBottom: 20 }} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
        <EmailWithCode form={form} purpose="reset_password" onError={onError} />
        <Form.Item label="新密码" name="newPassword" rules={passwordRules} extra="至少 8 位，同时包含字母和数字">
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>重设并登录</Button>
      </Form>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>
        重设后，其他设备上的登录会全部退出
      </Typography.Paragraph>
    </AuthLayout>
  )
}
