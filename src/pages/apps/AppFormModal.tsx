import { useEffect } from 'react'
import { App, Form, Input, Modal, Typography } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, toNamePath } from '@/api/client'
import { createApp, updateApp } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AppListItem, AppType, EnumOption } from '@/api/types'
import { APP_TYPE_DESC } from '@/constants/enums'
import { useApiError } from '@/hooks/useApiError'
import { DESCRIPTION_MAX_LEN, LONG_NAME_MAX_LEN } from '@/constants/limits'
import { useEnums } from '@/hooks/useEnums'
import { brand } from '@/theme'

interface Values {
  appType: AppType
  name: string
  description?: string
}

interface Props {
  open: boolean
  /** 传入则为编辑模式；应用类型创建后不可改。 */
  editing?: AppListItem | null
  onClose: () => void
}

export default function AppFormModal({ open, editing, onClose }: Props) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const handleError = useApiError()
  const { dict } = useEnums()
  const isEdit = Boolean(editing)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      appType: editing?.appType ?? 'article',
      name: editing?.name ?? '',
      description: editing?.description ?? '',
    })
  }, [open, editing, form])

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (editing) {
        // appType 提交了也不生效，不发
        return updateApp(editing.appId, {
          name: values.name,
          description: values.description ?? '',
        })
      }
      return createApp(values)
    },
    onSuccess: (app) => {
      message.success(isEdit ? '已保存' : '应用已创建，配方模板已备好')
      qc.invalidateQueries({ queryKey: qk.apps() })
      if (editing) qc.invalidateQueries({ queryKey: qk.app(app.appId) })
      onClose()
    },
    onError: (err) => {
      // 400 带 field → 标红那一个输入框，不弹提示
      if (err instanceof ApiError && err.field) {
        form.setFields([{ name: toNamePath(err.field), errors: [err.message] }])
      }
      handleError(err)
    },
  })

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑应用' : '创建应用'}
      okText={isEdit ? '保存' : '创建应用'}
      cancelText="取消"
      confirmLoading={mutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
      width={720}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
        {isEdit
          ? '内容类型创建后不能改，换一类内容请新建应用。'
          : '一个应用对应一类内容。目前开放图文，视频、音频等类型敬请期待。'}
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        requiredMark
        onFinish={(v) => mutation.mutate(v as Values)}
      >
        <Form.Item
          name="name"
          label="应用名称"
          rules={[
            { required: true, message: '请填写应用名称' },
            { max: LONG_NAME_MAX_LEN, message: `最多 ${LONG_NAME_MAX_LEN} 字` },
          ]}
        >
          <Input placeholder="例如：行业洞察内容中心" allowClear />
        </Form.Item>

        <Form.Item
          name="description"
          label="应用说明"
          rules={[{ max: DESCRIPTION_MAX_LEN, message: `最多 ${DESCRIPTION_MAX_LEN} 字` }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="选填：说明应用服务的团队、内容场景或主要目标"
          />
        </Form.Item>

        <Form.Item
          name="appType"
          label="内容类型"
          rules={[{ required: true, message: '请选择应用类型' }]}
          extra="决定能用哪些配方模板，创建后不能改。"
        >
          <TypePicker disabled={isEdit} options={dict.appType} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/**
 * 大卡片单选。
 * 可选类型与开放状态都来自后端 meta 接口，前端不维护清单——
 * 服务端同样会拒绝未开放的类型，不只靠前端拦。
 */
function TypePicker({
  value,
  onChange,
  disabled,
  options,
}: {
  value?: AppType
  onChange?: (v: AppType) => void
  disabled?: boolean
  options: EnumOption[]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value
        const locked = disabled || opt.available === false
        return (
          <div
            key={opt.value}
            onClick={() => {
              if (!locked) onChange?.(opt.value as AppType)
            }}
            style={{
              border: `1.5px solid ${active ? '#2C4E92' : '#E2DED5'}`,
              background: active ? '#F3F5FA' : locked ? '#FAF9F6' : '#fff',
              borderRadius: 10,
              padding: '12px 14px',
              cursor: locked ? 'not-allowed' : 'pointer',
              opacity: locked && !active ? 0.55 : 1,
            }}
          >
            <div style={{ fontWeight: 600 }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: brand.textMuted, marginTop: 2 }}>
              {opt.available === false ? '敬请期待' : (APP_TYPE_DESC[opt.value] ?? '')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
