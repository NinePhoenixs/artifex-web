import type { FormInstance } from 'antd'
import { ApiError } from '@/api/client'

/**
 * 接口错误能定位到输入框的标在框下面，返回 true；定位不到的返回 false，由调用方弹提示。
 * aliases：后端字段名 → 表单字段名（后端 password 对应找回页的 newPassword 等）。
 */
export function applyFieldError(form: FormInstance, err: unknown, aliases: Record<string, string> = {}): boolean {
  if (!(err instanceof ApiError)) return false
  if (err.errors?.length) {
    form.setFields(err.errors.map((e) => ({ name: aliases[e.field] ?? e.field, errors: [e.message] })))
    return true
  }
  if (err.field) {
    const name = aliases[err.field] ?? err.field
    if (form.getFieldInstance(name) !== undefined || form.getFieldValue(name) !== undefined) {
      form.setFields([{ name, errors: [err.message] }])
      return true
    }
  }
  return false
}

export const passwordRules = [
  { required: true, message: '请填写密码' },
  { pattern: /^(?=.*[A-Za-z一-龥])(?=.*\d).{8,}$/, message: '至少 8 位，同时包含字母和数字' },
]

export const emailRules = [
  { required: true, message: '请填写邮箱' },
  { type: 'email' as const, message: '邮箱格式不对' },
]
