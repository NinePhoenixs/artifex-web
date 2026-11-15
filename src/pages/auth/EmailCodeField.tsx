import { useEffect, useState } from 'react'
import { Button, Form, Input, type FormInstance } from 'antd'
import { ApiError } from '@/api/client'
import { sendEmailCode } from '@/api/endpoints'
import { emailRules } from './formErrors'

/**
 * 邮箱一行（旁边是「发验证码」，发出后倒计时 60 秒）+ 邮箱验证码一行。
 * 注册和重设密码共用。
 */
export default function EmailWithCode({ form, purpose, onError }: {
  form: FormInstance
  purpose: 'login' | 'register' | 'reset_password'
  onError: (err: unknown) => void
}) {
  const [left, setLeft] = useState(0)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const send = async () => {
    try {
      await form.validateFields(['email'])
    } catch {
      return
    }
    setSending(true)
    try {
      await sendEmailCode(form.getFieldValue('email'), purpose)
      setLeft(60)
    } catch (e) {
      if (e instanceof ApiError && e.field === 'email') form.setFields([{ name: 'email', errors: [e.message] }])
      else onError(e)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Form.Item label="邮箱" required>
        <div style={{ display: 'flex', gap: 8 }}>
          <Form.Item name="email" rules={emailRules} noStyle>
            <Input size="large" autoComplete="email" style={{ flex: 1 }} />
          </Form.Item>
          <Button size="large" onClick={send} loading={sending} disabled={left > 0} style={{ minWidth: 112 }}>
            {left > 0 ? `${left} 秒后重发` : '发验证码'}
          </Button>
        </div>
      </Form.Item>
      <Form.Item label="邮箱验证码" name="emailCode" rules={[{ required: true, message: '请填写验证码' }]}>
        <Input size="large" inputMode="numeric" maxLength={6} placeholder="6 位数字" autoComplete="one-time-code" />
      </Form.Item>
    </>
  )
}
