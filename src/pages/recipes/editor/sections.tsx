import {
  Alert, Card, Col, Form, Input, InputNumber, Row, Segmented, Select, Typography,
} from 'antd'
import type { FormInstance } from 'antd'
import type { EnumOption } from '@/api/types'
import { SOURCE_MODE_DESC } from '@/constants/enums'
import { useEnums } from '@/hooks/useEnums'
import { needsCustom } from './fieldVisibility'

const sectionTitle = (title: string, desc: string) => (
  <div style={{ marginBottom: 18 }}>
    <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
    <Typography.Text type="secondary">{desc}</Typography.Text>
  </div>
)

// ---------------- ① 基本信息 ----------------

export function BasicSection() {
  return (
    <>
      {sectionTitle('基本信息', '名称和说明会显示在配方列表里。')}
      <Form.Item
        name="name"
        label="配方名称"
        rules={[{ required: true, message: '请填写配方名称' }, { max: 128, message: '最多 128 字' }]}
        extra="如：家居好物 · 小红书种草"
      >
        <Input allowClear />
      </Form.Item>
      <Form.Item
        name="description"
        label="配方说明"
        rules={[{ max: 255, message: '最多 255 字' }]}
        extra="选填，写这份配方适合什么内容。"
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  )
}

// ---------------- ② 资料检索 ----------------

export function MaterialSection({ form, bare }: { form: FormInstance; bare?: boolean }) {
  const freshness = Form.useWatch(['materialSpec', 'freshness'], form)
  const sourceMode = Form.useWatch(['materialSpec', 'sourceMode'], form)
  const { dict, options } = useEnums()

  return (
    <>
      {!bare && sectionTitle('资料检索', '设置资料从哪来、来源范围、时效和检索轮数。')}

      <Form.Item
        name={['materialSpec', 'sourceMode']}
        label="资料从哪来"
        rules={[{ required: true, message: '请选择资料获取方式' }]}
      >
        <SourceModePicker options={dict.sourceMode} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['materialSpec', 'allowedSources']}
            label="指定来源"
            extra="选填，不填就不限。输入后按回车添加。"
          >
            <Select mode="tags" open={false} placeholder="网站、平台、账号或知识库范围" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['materialSpec', 'excludedSources']}
            label="排除来源"
            extra="选填。不能和「指定来源」重复。"
          >
            <Select mode="tags" open={false} placeholder="不希望被引用的来源" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name={['materialSpec', 'freshness']}
            label="时效要求"
            rules={[{ required: true, message: '请选择时效要求' }]}
          >
            <Select options={options('freshness')} />
          </Form.Item>
        </Col>
        {needsCustom(freshness) && (
          <Col span={8}>
            <Form.Item
              name={['materialSpec', 'customFreshness']}
              label="自定义天数"
              rules={[{ required: true, message: '请填写天数' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} addonAfter="天" />
            </Form.Item>
          </Col>
        )}
        <Col span={8}>
          <Form.Item
            name={['materialSpec', 'maxSearchRounds']}
            label="最多检索轮数"
            extra={
              sourceMode === 'user_only'
                ? '只用你给的资料时，不需要设置。'
                : '资料不够时，换个说法再搜几轮。'
            }
          >
            <Segmented
              options={[
                { label: '1 轮', value: 1 },
                { label: '2 轮', value: 2 },
                { label: '3 轮', value: 3 },
              ]}
              disabled={sourceMode === 'user_only'}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}

/** 大卡片单选。语义是后端的三选一，不是选搜索引擎。 */
function SourceModePicker({
  value, onChange, options,
}: { value?: string; onChange?: (v: string) => void; options: EnumOption[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <div
            key={opt.value}
            onClick={() => onChange?.(opt.value)}
            style={{
              border: `1.5px solid ${active ? '#2C4E92' : '#E2DED5'}`,
              background: active ? '#F3F5FA' : '#fff',
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600 }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
              {SOURCE_MODE_DESC[opt.value] ?? ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- ④ 质量评审 ----------------

export function ReviewSection({ bare }: { bare?: boolean } = {}) {
  return (
    <>
      {!bare && sectionTitle('质量评审', '设置成品未通过时的处理方式。')}

      <Form.Item
        name={['reviewPolicy', 'autoRevisionCount']}
        label="不合格时自动修改几次"
        extra="超过次数仍未通过，任务会停下等你处理。"
      >
        <Segmented
          options={[
            { label: '不修改', value: 0 },
            { label: '1 次', value: 1 },
            { label: '2 次', value: 2 },
          ]}
        />
      </Form.Item>

      <Card size="small" style={{ background: '#f8fafc', borderStyle: 'dashed' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
          🔒 <strong>评分维度、通过分数线、权重、硬性规则</strong>由平台统一管理，
          保证每份配方的成品都有一致的质量底线。
        </Typography.Text>
      </Card>

      {!bare && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          title="「触发与决策」敬请期待"
          description="什么时候自动生产、满足什么条件才生产，目前由平台统一管理，后续开放配置。"
        />
      )}
    </>
  )
}
