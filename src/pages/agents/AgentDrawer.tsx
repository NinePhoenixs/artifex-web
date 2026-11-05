import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert, App, Button, Drawer, Form, Image, Input, InputNumber, Popconfirm, Segmented, Select, Skeleton, Space, Spin, Typography,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAgent, getAgent, listCapabilities, listProviders, tryAgent, updateAgent,
} from '@/api/endpoints'
import { ApiError } from '@/api/client'
import { qk } from '@/api/queryKeys'
import type { Agent, AgentInput, AgentTryResult, AgentUsage, PipelineStage, StageName } from '@/api/types'
import GrantPicker from '@/components/GrantPicker'
import MarkdownView from '@/components/MarkdownView'
import { DESCRIPTION_MAX_LEN, MAX_PER_STAGE, NAME_MAX_LEN, PROMPT_MAX_LEN } from '@/constants/limits'
import { STAGE_LABEL, USAGE_LABEL } from '@/constants/stage'
import { useApiError } from '@/hooks/useApiError'

interface Props {
  /** 'new' = 新建；Agent 编号 = 编辑；null = 关闭 */
  agentId: string | 'new' | null
  onClose: () => void
  onCreated: (agentId: string) => void
}

/** 「常用在」的选项：按流水线先后，最后是写提示词和不限 */
const USAGE_OPTIONS: { value: AgentUsage; label: string }[] = [
  ...(['retrieval', 'generation', 'review', 'illustration', 'assist'] as const).map((u) => ({ value: u, label: USAGE_LABEL[u] })),
  { value: '', label: '不限' },
]

interface FormValues {
  name: string
  description: string
  modelId: string
  recommendStage: AgentUsage
  rolePrompt: string
  capabilities: string[]
  maxLlmCalls: number | null
  costCapYuan: number | null
}

/**
 * 新建 / 编辑一个 Agent：大脑必选，角色说明和能力可选。下面能「试一下」，并列出哪些配方在用它。
 * 平台自带的能改，但不能停用。
 */
export default function AgentDrawer({ agentId, onClose, onCreated }: Props) {
  const isNew = agentId === 'new'
  const open = agentId !== null
  const { message } = App.useApp()
  const onError = useApiError()
  const client = useQueryClient()
  const [form] = Form.useForm<FormValues>()

  const { data: agent, isLoading } = useQuery({
    queryKey: qk.agent(String(agentId)),
    queryFn: () => getAgent(String(agentId)),
    enabled: open && !isNew,
  })
  const { data: providers } = useQuery({ queryKey: qk.providers(), queryFn: listProviders, enabled: open })
  const { data: caps } = useQuery({ queryKey: qk.capabilities({}), queryFn: () => listCapabilities({}), enabled: open })
  const usage = Form.useWatch('recommendStage', form) as AgentUsage | undefined
  const modelId = Form.useWatch('modelId', form) as string | undefined
  // 配图的大脑是图片模型，不走对话和工具；其余用文字模型
  const drawing = usage === 'illustration'
  // 能力清单按步骤排推荐；写提示词、不限按「写」排
  const stage: StageName = usage === 'retrieval' || usage === 'review' ? usage : 'generation'

  useEffect(() => {
    if (!open) return
    if (isNew) {
      form.setFieldsValue({ name: '', description: '', modelId: undefined, recommendStage: 'generation', rolePrompt: '',
        capabilities: [], maxLlmCalls: null, costCapYuan: null })
    } else if (agent) {
      form.setFieldsValue({
        name: agent.name, description: agent.description, modelId: agent.modelId, recommendStage: agent.recommendStage,
        rolePrompt: agent.rolePrompt ?? '', capabilities: agent.capabilities.map((c) => c.capabilityId),
        maxLlmCalls: agent.maxLlmCalls || null, costCapYuan: agent.costCapCent ? agent.costCapCent / 100 : null,
      })
    }
  }, [open, isNew, agent, form])

  const refresh = (a: Agent) => {
    client.invalidateQueries({ queryKey: qk.agents() })
    client.setQueryData(qk.agent(a.agentId), a)
    client.invalidateQueries({ queryKey: qk.providers() }) // 模型被几个 Agent 用
  }
  const save = useMutation({
    mutationFn: (body: AgentInput) => (isNew ? createAgent(body) : updateAgent(String(agentId), body)),
    onSuccess: (a) => {
      refresh(a)
      message.success(isNew ? `已新建「${a.name}」` : '已保存')
      if (isNew) onCreated(a.agentId)
    },
    onError: (e) => {
      // 字段错误标到对应输入框（花费上限在表单里按元填）
      if (e instanceof ApiError && e.field) {
        const name = e.field === 'costCapCent' ? 'costCapYuan' : e.field
        form.setFields([{ name: name as keyof FormValues, errors: [e.message] }])
      }
      onError(e)
    },
  })
  const toggle = useMutation({
    mutationFn: (a: Agent) => updateAgent(a.agentId, { status: a.status === 'active' ? 'disabled' : 'active' }),
    onSuccess: (a) => {
      refresh(a)
      message.success(a.status === 'active' ? '已启用' : '已停用')
    },
    onError: (e) => onError(e),
  })

  const submit = (v: FormValues) => {
    // 已挑过的 MCP 动作原样保留；新勾的默认全部动作
    const prev = new Map((agent?.capabilities ?? []).map((c) => [c.capabilityId, c.actions]))
    save.mutate({
      name: v.name, description: v.description, modelId: v.modelId, recommendStage: v.recommendStage, rolePrompt: v.rolePrompt,
      capabilities: v.capabilities.map((id) => ({ capabilityId: id, actions: prev.get(id) ?? [] })),
      maxLlmCalls: v.maxLlmCalls ?? 0, costCapCent: v.costCapYuan ? Math.round(v.costCapYuan * 100) : 0,
    })
  }

  const models = (providers?.items ?? []).flatMap((p) => p.models.map((m) => ({ ...m, providerName: p.name })))
  const modelOptions = models
    .filter((m) => (m.status === 'active' || m.modelId === agent?.modelId) && (m.modality === 'image') === drawing)
    .map((m) => ({ value: m.modelId, label: `${m.label} · ${m.providerName}` }))

  // 换了「常用在」后原来的大脑类型不对，清掉让用户重选，免得保存时才报错
  useEffect(() => {
    const m = models.find((x) => x.modelId === modelId)
    if (m && (m.modality === 'image') !== drawing) form.setFieldValue('modelId', undefined)
  }, [drawing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={isNew ? '新建 Agent' : agent?.name}
      destroyOnHidden
      extra={
        !isNew && agent && agent.origin !== 'platform' ? (
          agent.status === 'active' ? (
            <Popconfirm title={`停用「${agent.name}」？`} description="有配方在用它时不能停用。" okText="停用" cancelText="取消"
              onConfirm={() => toggle.mutate(agent)}>
              <Button>停用</Button>
            </Popconfirm>
          ) : (
            <Button onClick={() => toggle.mutate(agent)}>启用</Button>
          )
        ) : null
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>
            {isNew ? '新建' : '保存'}
          </Button>
        </div>
      }
    >
      {!isNew && isLoading ? (
        <Skeleton active />
      ) : (
        <>
          {agent?.origin === 'platform' && agent.usedByRecipes > 0 && (
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              title={`${agent.usedByRecipes} 份配方在用它，改动会影响这些配方之后写的每一篇。`} />
          )}
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
                <Input maxLength={NAME_MAX_LEN} placeholder="如：执笔 · 好模型" />
              </Form.Item>
              <Form.Item name="modelId" label="大脑（模型）" rules={[{ required: true, message: '请选择模型' }]}
                extra={<Link to="/capabilities/models">去「模型」页加模型</Link>}>
                <Select options={modelOptions} placeholder={drawing ? '选一个图片模型' : '选一个模型'}
                  notFoundContent={drawing ? '还没有图片模型，先去「模型」页加一个' : undefined} />
              </Form.Item>
            </div>
            <Form.Item name="description" label="一句话说明" extra="选 Agent 时显示在名字下面">
              <Input maxLength={DESCRIPTION_MAX_LEN} placeholder="如：写要求高的长稿，用更强的模型" />
            </Form.Item>
            <Form.Item name="recommendStage" label="常用在哪一步"
              extra={usage === 'assist'
                ? '用来写配方提示词：配方页的 AI 生成 / 优化 / 检查和技能的「让 AI 帮我写」由平台自带的这一个完成，不能选进生产步骤'
                : drawing
                  ? '用来给成稿配图：大脑选图片模型，只能放进配方的「配图」这一步'
                  : '配方里选 Agent 时排在前面'}>
              <Segmented options={USAGE_OPTIONS} />
            </Form.Item>
            <Form.Item name="rolePrompt" label="角色说明"
              extra={drawing ? '每张图都会带上的画面要求，配方里的风格要求接在后面。' : '它是谁、做事守哪些原则。每份配方的具体要求写在配方里。'}>
              <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} maxLength={PROMPT_MAX_LEN}
                placeholder={drawing
                  ? '如：画面和文字说的东西一致，构图干净；不出现文字、水印和品牌标志。'
                  : '如：你负责把素材写成成稿：只用素材里的事实和数字，按任务要求的读者、口吻和篇幅写。'} />
            </Form.Item>
            <Form.Item name="capabilities" label={`自带能力（最多 ${MAX_PER_STAGE} 个，可以不带）`}
              extra={drawing ? '配图时不用：图片模型直接出图，不调技能和工具。' : '每份用它的配方都会带上。只有个别配方要用的，在配方里单独加。'}>
              <CapabilityList stage={stage} caps={caps?.items ?? []} disabled={drawing} />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="maxLlmCalls" label="一次最多调模型几次"
                extra={drawing ? '配图时不用：一张图调一次' : '不填按步骤默认：找资料 16 / 写 6 / 检查 8'}>
                <InputNumber min={1} max={30} style={{ width: '100%' }} placeholder="按步骤默认" disabled={drawing} />
              </Form.Item>
              <Form.Item name="costCapYuan" label="一次最多花多少" extra="只对按量计费的模型生效，不填用平台默认 1 元">
                <InputNumber min={0} step={0.5} precision={2} suffix="元" style={{ width: '100%' }} placeholder="平台默认" />
              </Form.Item>
            </div>
          </Form>

          {!isNew && agent && (
            <>
              <TryAgent agent={agent} />
              <UsedBy agent={agent} />
            </>
          )}
        </>
      )}
    </Drawer>
  )
}

/** 能力勾选：表单值是能力编号数组。复用配方页的能力清单。 */
function CapabilityList({ stage, caps, disabled, value = [], onChange }: {
  stage: StageName
  caps: Parameters<typeof GrantPicker>[0]['caps']
  disabled?: boolean
  value?: string[]
  onChange?: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const names = value.map((id) => caps.find((c) => c.capabilityId === id)?.name ?? id)
  return (
    <div>
      <Space wrap>
        <Typography.Text type={names.length ? undefined : 'secondary'}>{names.length ? names.join('、') : '不带能力'}</Typography.Text>
        <Button size="small" disabled={disabled} onClick={() => setOpen(!open)}>{open ? '收起' : '选能力'}</Button>
      </Space>
      {open && !disabled && (
        <div style={{ marginTop: 10, maxHeight: 360, overflow: 'auto' }}>
          <GrantPicker stage={stage} caps={caps.filter((c) => c.kind !== 'knowledge')} value={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

type TryStage = Exclude<PipelineStage, 'review'>

/** 试一下：不建生产任务，用这个 Agent 按「找资料」「写」或「配图」的格式跑一次。 */
function TryAgent({ agent }: { agent: Agent }) {
  const drawing = agent.recommendStage === 'illustration'
  const [stage, setStage] = useState<TryStage>(
    drawing ? 'illustration' : agent.recommendStage === 'retrieval' ? 'retrieval' : 'generation',
  )
  const [topic, setTopic] = useState('')
  const [task, setTask] = useState('')
  const run = useMutation({ mutationFn: () => tryAgent(agent.agentId, { stage, topic, task }) })
  return (
    <div style={{ marginTop: 8, padding: 16, borderRadius: 10, background: '#FAFAFA' }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>试一下</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 配图的大脑是图片模型，只能按配图试；文字 Agent 按找资料或写试 */}
        {!drawing && (
          <Segmented value={stage} onChange={(v) => setStage(v as TryStage)}
            options={(['retrieval', 'generation'] as const).map((s) => ({ value: s, label: `按${STAGE_LABEL[s]}试` }))} />
        )}
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={255}
          placeholder={drawing ? '画什么，如：木桌上一杯冒热气的咖啡' : '主题，如：羊毛混纺沙发毯'} />
        <Input.TextArea value={task} onChange={(e) => setTask(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder={drawing ? '风格要求（可不填），如：清新水彩，暖色调' : '任务要求（可不填），如：写 300 字的小红书笔记'} />
        <Button onClick={() => run.mutate()} loading={run.isPending} disabled={!topic.trim()}>{drawing ? '画一张' : '试一下'}</Button>
        {run.isPending && (
          <Typography.Text type="secondary">
            <Spin size="small" /> {drawing ? '正在画，一般 10 到 30 秒…' : '正在写，一般 10 秒到 1 分钟…'}
          </Typography.Text>
        )}
        {run.data && <TryOutput result={run.data} stage={stage} />}
      </Space>
    </div>
  )
}

function TryOutput({ result, stage }: { result: AgentTryResult; stage: TryStage }) {
  if (result.error) return <Alert type="error" showIcon title="没跑成" description={result.error} />
  const out = result.output ?? {}
  if (stage === 'illustration') {
    return <Image src={String(out.image ?? '')} width={240} style={{ borderRadius: 8 }} alt="试画的图" />
  }
  if (stage === 'generation') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 12 }}>
        <Typography.Text strong>{String(out.title ?? '')}</Typography.Text>
        <div style={{ marginTop: 6 }}><MarkdownView text={String(out.body ?? '')} /></div>
      </div>
    )
  }
  const materials = (out.materials ?? []) as { title?: string; url?: string; excerpt?: string }[]
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 12 }}>
      {materials.length === 0 ? <Typography.Text type="secondary">没找到资料</Typography.Text> : materials.map((m, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <Typography.Text strong>{m.title}</Typography.Text>
          {m.url && <Typography.Link href={m.url} target="_blank" style={{ marginLeft: 8, fontSize: 12 }}>来源</Typography.Link>}
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.65)' }}>{m.excerpt}</div>
        </div>
      ))}
    </div>
  )
}

/** 哪些配方在用它（平台自带的另外还被所有没选 Agent 的配方用着）。 */
function UsedBy({ agent }: { agent: Agent }) {
  const recipes = agent.recipes ?? []
  return (
    <div style={{ marginTop: 16 }}>
      <Typography.Title level={5}>被 {agent.usedByRecipes} 份配方用</Typography.Title>
      {agent.origin === 'platform' && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          没单独选 Agent 的配方也默认用它，不在这里列出。
        </Typography.Paragraph>
      )}
      {recipes.map((r) => (
        <div key={r.recipeId + r.stage}>
          <Link to={`/apps/${r.appId}/recipes/${r.recipeId}`}>{r.name}</Link>
          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>「{STAGE_LABEL[r.stage]}」这一步</Typography.Text>
        </div>
      ))}
    </div>
  )
}
