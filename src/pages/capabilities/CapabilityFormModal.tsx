import { useState } from 'react'
import { ApiOutlined, CheckCircleFilled } from '@ant-design/icons'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Segmented, Select, Steps, Tag, Typography } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, toNamePath } from '@/api/client'
import { createCapability, discoverTools } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { CapAppType, CreateCapabilityRequest, McpTransport, SkillFile, Stage, ToolAction } from '@/api/types'
import { CAP_APP_TYPES, STAGES } from '@/constants/capability'
import { useApiError } from '@/hooks/useApiError'
import { brand } from '@/theme'
import MarkdownView from '@/components/MarkdownView'
import SkillStarter, { type StartResult } from './SkillStarter'
import SkillPackage from './SkillPackage'

type Kind = CreateCapabilityRequest['kind']

interface FormValues {
  kind: Kind
  name: string
  summary?: string
  appTypes: CapAppType[]
  recommendStage?: Stage
  skillBody?: string
  mcpTransport?: McpTransport
  mcpUrl?: string
  secretRef?: string
  timeoutMs?: number
}

/** 接入 MCP 工具的三步。没有「给 AI 的说明」——MCP 服务里每个动作自带描述，AI 连上就看得到。 */
const MCP_STEPS = [{ title: '连接' }, { title: '发现工具' }, { title: '适用范围' }]

/**
 * 登记能力：技能从技能库 / 上传技能包 / AI 起草起步再改；工具接企业自己的 MCP 服务。
 * 能力中心只管「有哪些能力」；某个配方用 MCP 的哪几个动作，到配方里挑。
 */
export default function CapabilityFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm()
  const kind = (Form.useWatch('kind', form) ?? 'skill') as Kind
  const [step, setStep] = useState(0)
  const [actions, setActions] = useState<ToolAction[]>([])
  // 技能：先选起点（技能库 / 上传 / AI 起草 / 空白），再进编辑
  const [skillStart, setSkillStart] = useState<StartResult | null>(null)
  const [preview, setPreview] = useState(false)
  const skillBody = (Form.useWatch('skillBody', form) as string | undefined) ?? ''
  const { message } = App.useApp()
  const qc = useQueryClient()
  const handleError = useApiError()

  /** 后端字段错误标到对应输入框；连接类错误回到第一步。 */
  const markField = (err: unknown) => {
    if (err instanceof ApiError && err.field) {
      form.setFields([{ name: toFormName(err.field), errors: [err.message] }])
      if (err.field.startsWith('tool.')) setStep(0)
      return true
    }
    return false
  }

  const discover = useMutation({
    mutationFn: (v: FormValues) =>
      discoverTools({
        mcpTransport: v.mcpTransport ?? 'streamable',
        mcpUrl: (v.mcpUrl ?? '').trim(),
        secretRef: v.secretRef?.trim() || undefined,
        timeoutMs: v.timeoutMs,
      }),
    onSuccess: (r) => {
      setActions(r.actions)
      setStep(1)
    },
    onError: (err) => {
      if (!markField(err)) handleError(err)
    },
  })

  const create = useMutation({
    mutationFn: (v: FormValues) => createCapability(toRequest(v, skillStart?.files)),
    onSuccess: (c) => {
      message.success(c.kind === 'tool' ? `已接入「${c.name}」，发现 ${c.tool?.actions?.length ?? 0} 个动作` : `已登记「${c.name}」`)
      qc.invalidateQueries({ queryKey: qk.capabilities() })
      close()
    },
    onError: (err) => {
      if (!markField(err)) handleError(err)
    },
  })

  const close = () => {
    setStep(0)
    setActions([])
    setSkillStart(null)
    setPreview(false)
    onClose()
  }

  const startSkill = (r: StartResult) => {
    form.setFieldsValue({
      name: r.draft.name, summary: r.draft.summary, skillBody: r.draft.body,
      recommendStage: r.recommendStage,
    })
    setPreview(Boolean(r.draft.body))
    setSkillStart(r)
  }

  const connectFields = ['name', 'mcpTransport', 'mcpUrl', 'secretRef', 'timeoutMs']
  const testConnection = () =>
    form.validateFields(connectFields).then(() => discover.mutate(form.getFieldsValue(true)))
  const submit = () => form.validateFields().then(() => create.mutate(form.getFieldsValue(true)))

  const footer =
    kind === 'skill' ? (
      skillStart ? (
        <>
          <Button onClick={() => setSkillStart(null)}>换个起点</Button>
          <Button type="primary" loading={create.isPending} disabled={skillStart.scan?.blocked} onClick={submit}>登记</Button>
        </>
      ) : (
        <Button onClick={close}>取消</Button>
      )
    ) : step === 0 ? (
      <>
        <Button onClick={close}>取消</Button>
        <Button type="primary" icon={<ApiOutlined />} loading={discover.isPending} onClick={testConnection}>测试连接</Button>
      </>
    ) : (
      <>
        <Button onClick={() => setStep(step - 1)}>上一步</Button>
        {step === 1 ? (
          <Button type="primary" onClick={() => setStep(2)}>下一步</Button>
        ) : (
          <Button type="primary" loading={create.isPending} onClick={submit}>接入</Button>
        )}
      </>
    )

  return (
    <Modal open={open} title="登记能力" onCancel={close} footer={footer} destroyOnHidden width={640}>
      <Form
        form={form}
        layout="vertical"
        preserve
        initialValues={{ kind: 'skill', appTypes: [], mcpTransport: 'streamable', timeoutMs: 15000 }}
      >
        <Form.Item name="kind" style={{ marginBottom: 16 }}>
          <Segmented
            options={[
              { value: 'skill', label: '技能：一段做法' },
              { value: 'tool', label: '工具：接入自己的 MCP 服务' },
            ]}
            onChange={() => {
              setStep(0)
              setSkillStart(null)
            }}
          />
        </Form.Item>

        {kind === 'skill' ? (
          !skillStart ? (
            <SkillStarter onStart={startSkill} />
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <Tag variant="filled">起点：{skillStart.source}</Tag>
              </div>
              {skillStart.warnings.map((w) => (
                <Alert key={w} type="warning" showIcon title={w} style={{ marginBottom: 12 }} />
              ))}
              <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, message: '请填写名称' }, { max: 64 }]}>
                <Input placeholder="如：品牌口吻 · 轻松版" />
              </Form.Item>
              <Form.Item
                name="summary"
                label="什么时候用它"
                extra="AI 只先看到名称和这句话，靠它决定要不要读正文。写清楚在什么情况下用、用了能做到什么"
                rules={[{ required: true, whitespace: true, message: '请写清楚什么时候用它' }, { max: 255 }]}
              >
                <Input placeholder="如：写拾光家居的内容时用：口吻像会过日子的朋友" />
              </Form.Item>
              <ScopeFields />
              <SkillPackage files={skillStart.files ?? []} scan={skillStart.scan} />
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Typography.Text>正文</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>AI 决定要用时才读，Markdown 格式</Typography.Text>
                <Segmented
                  size="small"
                  style={{ marginLeft: 'auto' }}
                  value={preview ? 'preview' : 'edit'}
                  onChange={(v) => setPreview(v === 'preview')}
                  options={[{ value: 'edit', label: '编辑' }, { value: 'preview', label: '预览' }]}
                />
              </div>
              {preview && (
                <div style={{ border: `1px solid ${brand.line}`, borderRadius: 8, padding: '14px 18px', maxHeight: 380, overflow: 'auto', marginBottom: 24 }}>
                  <MarkdownView text={skillBody} />
                </div>
              )}
              <Form.Item
                name="skillBody"
                hidden={preview}
                rules={[{ required: true, whitespace: true, message: '请填写技能正文' }, { max: 20000 }]}
              >
                <Input.TextArea autoSize={{ minRows: 10, maxRows: 18 }} style={{ fontFamily: 'inherit' }} />
              </Form.Item>
            </>
          )
        ) : (
          <>
            <Steps size="small" current={step} items={MCP_STEPS} style={{ marginBottom: 20 }} />

            <div style={{ display: step === 0 ? 'block' : 'none' }}>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                title="填上 MCP 服务的地址，连上后会自动列出它能做的事，不用自己写说明。"
              />
              <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, message: '请填写名称' }, { max: 64 }]}>
                <Input placeholder="如：商品库" />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16 }}>
                <Form.Item name="mcpTransport" label="传输方式">
                  <Select options={[{ value: 'streamable', label: 'streamable' }, { value: 'sse', label: 'sse' }]} />
                </Form.Item>
                <Form.Item
                  name="mcpUrl"
                  label="服务地址"
                  rules={[{ required: true, whitespace: true, message: '请填写服务地址' }, { type: 'url', message: '地址格式不对' }]}
                >
                  <Input placeholder="https://mcp.example.com/products" />
                </Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16 }}>
                <Form.Item name="secretRef" label="密钥名" extra="密钥配在服务器上，这里只填名字；不需要密钥就留空">
                  <Input placeholder="如：PRODUCT_MCP_TOKEN" />
                </Form.Item>
                <Form.Item name="timeoutMs" label="超时（毫秒）">
                  <InputNumber min={1} step={1000} style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </div>

            {step === 1 && (
              <div>
                <Typography.Paragraph>
                  <CheckCircleFilled style={{ color: '#2E7D4F', marginRight: 6 }} />
                  连上了，这个服务提供 <Typography.Text strong>{actions.length}</Typography.Text> 个动作。
                  <Typography.Text type="secondary">AI 看到的就是下面这些说明，配方里可以只开放其中几个。</Typography.Text>
                </Typography.Paragraph>
                <ActionList actions={actions} />
              </div>
            )}

            <div style={{ display: step === 2 ? 'block' : 'none' }}>
              <ScopeFields />
              <Form.Item
                name="summary"
                label="一句话简介（选填）"
                extra="只给人在能力中心里看，不填会按动作自动生成"
                rules={[{ max: 255 }]}
              >
                <Input placeholder={actions.length ? `提供 ${actions.length} 个动作：${actions.map((a) => a.name).join('、')}` : ''} />
              </Form.Item>
            </div>
          </>
        )}
      </Form>
    </Modal>
  )
}

/** 适用类型 + 推荐阶段。 */
function ScopeFields() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Form.Item name="appTypes" label="适用应用类型" extra="不选就是通用，所有应用都能用">
        <Select mode="multiple" allowClear placeholder="通用" options={CAP_APP_TYPES} />
      </Form.Item>
      <Form.Item name="recommendStage" label="推荐阶段" extra="在这一步的能力列表里排在前面，不限制用在哪一步">
        <Select allowClear placeholder="不限" options={STAGES} />
      </Form.Item>
    </div>
  )
}

/** 发现到的动作：名字 + 服务自带的说明。 */
export function ActionList({ actions }: { actions: ToolAction[] }) {
  return (
    <div style={{ border: `1px solid ${brand.line}`, borderRadius: 8, maxHeight: 320, overflow: 'auto' }}>
      {actions.map((a, i) => (
        <div key={a.name} style={{ padding: '10px 14px', borderTop: i ? `1px solid ${brand.line}` : 'none' }}>
          <Typography.Text code>{a.name}</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {a.description || '（服务没有提供说明）'}
          </Typography.Paragraph>
        </div>
      ))}
    </div>
  )
}

function toRequest(v: FormValues, files?: SkillFile[]): CreateCapabilityRequest {
  const base = {
    kind: v.kind,
    name: v.name.trim(),
    summary: (v.summary ?? '').trim(),
    appTypes: v.appTypes ?? [],
    recommendStage: v.recommendStage,
  }
  if (v.kind === 'skill') {
    return { ...base, skill: { body: v.skillBody ?? '', files: (files ?? []).map(({ path, content }) => ({ path, content })) } }
  }
  return {
    ...base,
    tool: {
      mcpTransport: v.mcpTransport ?? 'streamable',
      mcpUrl: (v.mcpUrl ?? '').trim(),
      secretRef: v.secretRef?.trim() || undefined,
      toolAllowlist: [],
      timeoutMs: v.timeoutMs,
    },
  }
}

/** 后端字段路径 → 表单项名：skill.body → skillBody，tool.mcpUrl → mcpUrl，其余原样。 */
function toFormName(field: string): (string | number)[] {
  if (field === 'skill.body') return ['skillBody']
  if (field.startsWith('tool.')) return [field.slice('tool.'.length)]
  return toNamePath(field)
}
