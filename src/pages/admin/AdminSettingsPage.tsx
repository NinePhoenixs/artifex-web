import { App, Button, Card, Form, Input, InputNumber, Radio, Skeleton } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPlatformSettings, updatePlatformSettings } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { PlatformSettings } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { reasonRule } from './admin'

type Values = PlatformSettings & { reason: string }

/** 平台设置：注册方式、新空间试用篇数、「联系我们」。改完立即生效，不用重启。 */
export default function AdminSettingsPage() {
  const { message } = App.useApp()
  const onError = useApiError()
  const qc = useQueryClient()
  const [form] = Form.useForm<Values>()
  const { data, isLoading } = useQuery({ queryKey: qk.admin('settings'), queryFn: getPlatformSettings })
  const save = useMutation({
    mutationFn: (v: Values) => updatePlatformSettings(v),
    onSuccess: async () => {
      message.success('已保存')
      form.setFieldValue('reason', '')
      await Promise.all([qc.invalidateQueries({ queryKey: ['admin'] }), qc.invalidateQueries({ queryKey: qk.authOptions() }), qc.invalidateQueries({ queryKey: qk.plans() })])
    },
    onError: (e) => onError(e),
  })
  if (isLoading || !data) return <Skeleton active />
  return (
    <Card style={{ maxWidth: 720, marginBottom: 24 }}>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={data} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="registration" label="注册方式">
          <Radio.Group options={[
            { value: 'open', label: '开放注册：任何人用邮箱验证码就能注册' },
            { value: 'invite_only', label: '只能凭邀请：团队邀请链接或平台邀请码' },
          ]} style={{ display: 'grid', gap: 8 }} />
        </Form.Item>
        <Form.Item name="trialPieces" label="新空间试用篇数" extra="只影响之后新建的空间">
          <InputNumber min={0} max={1000} precision={0} addonAfter="篇" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="contactText" label="联系我们" extra="空间里点「升级套餐」时显示，如微信号、邮箱、电话">
          <Input.TextArea rows={3} maxLength={500} showCount placeholder="如：微信 gaopu-service，或发邮件到 sales@…" />
        </Form.Item>
        <Form.Item name="reason" label="修改原因" rules={reasonRule}><Input maxLength={200} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={save.isPending}>保存</Button>
      </Form>
    </Card>
  )
}
