import {
  Alert, Card, Col, Form, Input, InputNumber, Row, Segmented, Select, Typography,
} from 'antd'
import type { FormInstance } from 'antd'
import type { EnumOption, GenerationSpec } from '@/api/types'
import SortableTextList from '@/components/SortableTextList'
import { CONTENT_STRUCTURE_PREVIEW, SOURCE_MODE_DESC } from '@/constants/enums'
import { useEnums } from '@/hooks/useEnums'
import { WORD_COUNT_PRESETS, hasTypeField, needsCustom } from './fieldVisibility'

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
      {sectionTitle('基本信息', '设置配方名称和适用场景。')}
      <Form.Item
        name="name"
        label="配方名称"
        rules={[{ required: true, message: '请填写配方名称' }, { max: 128, message: '最多 128 字' }]}
        extra="用于在开始生产时识别这套要求。"
      >
        <Input allowClear />
      </Form.Item>
      <Form.Item
        name="description"
        label="配方说明"
        rules={[{ max: 255, message: '最多 255 字' }]}
        extra="选填，建议说明该配方适合什么内容场景。"
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  )
}

// ---------------- ② 资料检索 ----------------

export function MaterialSection({ form }: { form: FormInstance }) {
  const freshness = Form.useWatch(['materialSpec', 'freshness'], form)
  const sourceMode = Form.useWatch(['materialSpec', 'sourceMode'], form)
  const { dict, options } = useEnums()

  return (
    <>
      {sectionTitle('资料检索', '设置资料从哪来、来源范围、时效和检索轮数。')}

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
            extra="选填。留空 = 不限。输入后回车添加。"
          >
            <Select mode="tags" open={false} placeholder="网站、平台、账号或知识库范围" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['materialSpec', 'excludedSources']}
            label="排除来源"
            extra="选填。与「指定来源」不能有交集，否则转就绪会被拒。"
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
                ? '当前为「仅用户资料」，此项不生效。'
                : '资料不足时系统可改写检索词补充检索。'
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

/** 大卡片单选，借原型样式。**语义是后端真实的三选一**，不是选搜索引擎。 */
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
              border: `1.5px solid ${active ? '#2563eb' : '#e2e8f0'}`,
              background: active ? '#f5f8ff' : '#fff',
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

// ---------------- ③ 内容生成 ----------------

export function GenerationSection({
  form, spec,
}: { form: FormInstance; spec: GenerationSpec | undefined }) {
  const structure = Form.useWatch(['generationSpec', 'contentStructure'], form)
  const tone = Form.useWatch(['generationSpec', 'tone'], form)
  const visual = Form.useWatch(['generationSpec', 'visualStyle'], form)
  const wordCount = Form.useWatch(['generationSpec', 'targetWordCount'], form)
  const { options } = useEnums()

  // 按应用类型裁剪：后端不返回这个 key = 该类型没这个概念 = 不渲染
  const showWordCount = hasTypeField(spec, 'targetWordCount')
  const showStructure = hasTypeField(spec, 'contentStructure')
  const showVisual = hasTypeField(spec, 'visualStyle')

  return (
    <>
      {sectionTitle('内容生成', '设置目标受众、内容结构和表达方式。这些同时是成品评审的判断依据。')}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['generationSpec', 'targetAudience']}
            label="目标受众"
            rules={[{ required: true, message: '请填写目标受众' }]}
          >
            <Input placeholder="写给谁看" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['generationSpec', 'creationGoal']}
            label="创作目标"
            rules={[{ required: true, message: '请填写创作目标' }]}
          >
            <Input placeholder="要达到什么效果" allowClear />
          </Form.Item>
        </Col>
      </Row>

      {(showWordCount || showStructure) && (
        <Row gutter={16}>
          {showWordCount && (
            <Col span={12}>
              <Form.Item
                name={['generationSpec', 'targetWordCount']}
                label="正文字数"
                rules={[{ required: true, message: '请填写正文字数' }]}
                extra="评审按 ±10% 判定。可直接输入具体数字。"
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  addonAfter="字"
                  placeholder="例如 2000"
                />
              </Form.Item>
              <div style={{ marginTop: -18, marginBottom: 18 }}>
                {WORD_COUNT_PRESETS.map((p) => (
                  <a
                    key={p.value}
                    style={{
                      fontSize: 12, marginRight: 12,
                      color: wordCount === p.value ? '#2563eb' : '#94a3b8',
                    }}
                    onClick={() =>
                      form.setFieldValue(['generationSpec', 'targetWordCount'], p.value)
                    }
                  >
                    {p.label}
                  </a>
                ))}
              </div>
            </Col>
          )}
          {showStructure && (
            <Col span={12}>
              <Form.Item
                name={['generationSpec', 'contentStructure']}
                label="内容结构"
                rules={[{ required: true, message: '请选择内容结构' }]}
              >
                <Select options={options('contentStructure')} />
              </Form.Item>
              {structure && (
                <div
                  style={{
                    marginTop: -14, marginBottom: 16, padding: '10px 12px',
                    background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#64748b',
                  }}
                >
                  结构预览：
                  {CONTENT_STRUCTURE_PREVIEW[structure as keyof typeof CONTENT_STRUCTURE_PREVIEW] ?? '—'}
                </div>
              )}
            </Col>
          )}
        </Row>
      )}

      {needsCustom(structure) && (
        <Form.Item
          name={['generationSpec', 'customSections']}
          label="自定义段落"
          rules={[{ required: true, message: '请填写自定义段落' }]}
          extra="⚠️ 从上到下就是正文段落的顺序。拖左边的手柄可以调整。"
        >
          <SortableTextList placeholder="例如：开篇引入。输入后回车添加" />
        </Form.Item>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name={['generationSpec', 'tone']} label="表达风格">
            <Select options={options('tone')} />
          </Form.Item>
          {needsCustom(tone) && (
            <Form.Item
              name={['generationSpec', 'customTone']}
              label="自定义表达风格"
              rules={[{ required: true, message: '请描述表达风格' }]}
            >
              <Input allowClear />
            </Form.Item>
          )}
        </Col>
        {showVisual && (
          <Col span={12}>
            <Form.Item name={['generationSpec', 'visualStyle']} label="视觉风格">
              <Select options={options('visualStyle')} />
            </Form.Item>
            {needsCustom(visual) && (
              <Form.Item
                name={['generationSpec', 'customVisualStyle']}
                label="自定义视觉风格"
                rules={[{ required: true, message: '请描述视觉风格' }]}
              >
                <Input allowClear />
              </Form.Item>
            )}
          </Col>
        )}
      </Row>

      <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
        更多创作要求（选填）
      </Typography.Text>
      <Row gutter={16} style={{ marginTop: 10 }}>
        <Col span={12}>
          <Form.Item name={['generationSpec', 'titlePreference']} label="标题偏好">
            <Input allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['generationSpec', 'narrativePerspective']} label="叙述视角">
            <Input allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['generationSpec', 'mustInclude']} label="必须包含">
            <Select mode="tags" open={false} placeholder="回车添加" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name={['generationSpec', 'forbiddenContent']} label="禁止出现">
            <Select mode="tags" open={false} placeholder="回车添加" />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}

// ---------------- ④ 质量评审 ----------------

export function ReviewSection() {
  return (
    <>
      {sectionTitle('质量评审', '设置成品未通过时的处理方式。')}

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
          不开放修改——保证不同客户的成品有一致的质量底线。
        </Typography.Text>
      </Card>

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16 }}
        message="「触发与决策」本期不开放"
        description="触发规则同样由平台管理，接口不返回，因此页面上不提供配置入口。"
      />
    </>
  )
}
