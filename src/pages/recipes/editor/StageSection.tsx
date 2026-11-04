import { type ReactNode, useRef, useState } from 'react'
import { BookOutlined, CloseOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { App, Button, Card, Checkbox, Form, Mentions, Modal, Select, Tag, Tooltip, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getCapability, listAgents, listCapabilities } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { Agent, AppType, Capability } from '@/api/types'
import { brand } from '@/theme'
import { DEFAULT_AGENT, GrantPicker, MAX_PER_STAGE, type StageKey } from './AiSection'
import { findMentions, splitMentions } from './mentions'
import PromptAssist from './PromptAssist'

/** 三步，按流水线先后。动词用在标题「这一步让 AI 怎么 X」里。 */
export const STAGE_META: Record<StageKey, { label: string; verb: string; placeholder: string }> = {
  retrieval: {
    label: '找资料',
    verb: '找资料',
    placeholder: '找什么\n围绕本次主题，找……\n\n去哪找\n优先……\n\n时效\n近……天内的优先\n\n不要\n不收没有来源的说法',
  },
  generation: {
    label: '写',
    verb: '写',
    placeholder: '围绕「{{主题}}」写一篇……\n\n目标与读者\n写给……，读完让人觉得……\n\n写作要求\n口吻……，标题……，正文……字\n\n输出结构\n标题（3 个备选）/ 正文 / 话题标签 / 配图建议\n\n不要做的事\n· 不用绝对化用语\n· 不编造数据',
  },
  review: {
    label: '检查',
    verb: '检查',
    placeholder: '检查清单\n1. ……\n2. ……\n3. 没有绝对化用语和违规表述\n\n不写也会查：事实有来源、没有禁用词、紧扣主题',
  },
}

/**
 * 一步的工作区：一整块提示词，写清楚这一步让 AI 怎么做；底部是这一步带了哪些能力。
 * 不再让运营填一堆表单——想要什么直接写出来。
 */
export default function StageSection({
  stage, appType, recipeName, appTypeName, children,
}: { stage: StageKey; appType: AppType; recipeName: string; appTypeName: string; children?: ReactNode }) {
  const meta = STAGE_META[stage]
  const form = Form.useFormInstance()
  const { message } = App.useApp()
  const grantsPath = ['aiSetting', 'grants', stage]
  const prompt = (Form.useWatch(['aiSetting', 'prompts', stage], { form, preserve: true }) as string | undefined) ?? ''
  const grants = (Form.useWatch(grantsPath, { form, preserve: true }) as string[] | undefined) ?? []
  const caps = useStageCaps(appType)
  const agent = useStageAgent(stage)
  const own = (agent?.capabilities ?? []).map((c) => c.capabilityId)
  const has = (id: string) => own.includes(id) || grants.includes(id)

  // 点名 = 必须用：@ 了谁就把谁带上，不用再去「添加」里勾一遍；Agent 自带的已经在了
  const bring = (ids: string[]) => {
    const current = (form.getFieldValue(grantsPath) as string[] | undefined) ?? []
    const next = [...current, ...ids.filter((id) => !current.includes(id) && !own.includes(id))]
    if (next.length + own.length > MAX_PER_STAGE) {
      message.warning(`每一步最多带 ${MAX_PER_STAGE} 个能力（${agent?.name ?? 'Agent'}自带 ${own.length} 个），先去掉不用的再点名`)
      return
    }
    form.setFieldValue(grantsPath, next)
  }
  const missing = findMentions(prompt, caps.map((c) => c.name))
    .map((n) => caps.find((c) => c.name === n)!)
    .filter((c) => !has(c.capabilityId))
  // 已带上的排前面，其次是推荐给这一步的
  const options = [...caps]
    .sort((a, b) => rank(b) - rank(a))
    .map((c) => ({
      value: c.name,
      key: c.capabilityId,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {c.kind === 'tool' ? <ToolOutlined /> : <BookOutlined />}
          {c.name}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {own.includes(c.capabilityId) ? `${agent?.name}自带` : grants.includes(c.capabilityId) ? '已带上' : c.summary}
          </Typography.Text>
        </span>
      ),
    }))
  function rank(c: Capability) {
    return (has(c.capabilityId) ? 2 : 0) + (c.recommendStage === stage ? 1 : 0)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>这一步让 AI 怎么{meta.verb}</Typography.Title>
        <Form.Item name={['aiSetting', 'agents', stage]} noStyle>
          <AgentSelect stage={stage} />
        </Form.Item>
      </div>
      <PromptAssist stage={stage} recipeName={recipeName} appTypeName={appTypeName} />

      <PromptBoard prompt={prompt} caps={caps} grants={[...own, ...grants]}>
      <Form.Item
        name={['aiSetting', 'prompts', stage]}
        rules={[{ max: 20000, message: '提示词最多 20000 字' }]}
        style={{ marginBottom: 0 }}
      >
        <Mentions
          className="prompt-board-input"
          autoSize={{ minRows: 16, maxRows: 32 }}
          placeholder={meta.placeholder}
          prefix="@"
          options={options}
          onSelect={(opt) => {
            const c = caps.find((x) => x.name === opt.value)
            if (c) bring([c.capabilityId])
          }}
          style={{ borderRadius: 10, background: 'transparent', borderColor: brand.line }}
        />
      </Form.Item>
      </PromptBoard>
      {missing.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 0 10px', fontSize: 12 }}>
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            提示词里点名了{missing.map((c) => `「${c.name}」`).join('')}，但这一步还没带上，AI 用不了
          </Typography.Text>
          <Button size="small" type="link" style={{ padding: 0 }} onClick={() => bring(missing.map((c) => c.capabilityId))}>
            带上
          </Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Typography.Text type="secondary">这一步带了：</Typography.Text>
        <Form.Item name={grantsPath} noStyle>
          <GrantChips stage={stage} appType={appType} agent={agent} />
        </Form.Item>
        <Typography.Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {prompt.length} 字
        </Typography.Text>
      </div>
      {stage === 'generation' && !prompt.trim() && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          「写」这一步必须有提示词，没写的配方不能启用。
        </Typography.Paragraph>
      )}
      {children && (
        <Card size="small" title="这一步的设置" style={{ marginTop: 20 }} styles={{ body: { padding: '16px 20px 4px' } }}>
          {children}
        </Card>
      )}
    </>
  )
}

/**
 * 提示词板：在输入框后面垫一层同样排版的文字，把「@能力」染成标签色——
 * 工具蓝、技能绿、还没带上的橙。输入框本身文字透明、只留光标，看到的是底下这层。
 * 标签只加底色和 box-shadow 外扩，不加 padding / 加粗，保证两层逐字对齐。
 */
function PromptBoard({ prompt, caps, grants, children }: {
  prompt: string
  caps: Capability[]
  grants: string[]
  children: ReactNode
}) {
  const backdrop = useRef<HTMLDivElement>(null)
  const parts = splitMentions(prompt, caps.map((c) => c.name))
  return (
    <div
      className="prompt-board"
      onScrollCapture={(e) => {
        if (backdrop.current) backdrop.current.scrollTop = (e.target as HTMLElement).scrollTop
      }}
    >
      <div ref={backdrop} className="prompt-board-backdrop" aria-hidden>
        {parts.map((p, i) => {
          if (!p.name) return p.text
          const c = caps.find((x) => x.name === p.name)!
          const tone = !grants.includes(c.capabilityId) ? 'missing' : c.kind === 'tool' ? 'tool' : 'skill'
          return <mark key={i} className={`prompt-mention ${tone}`}>{p.text}</mark>
        })}
        {/* 末尾换行时 textarea 会多出一行，这里补一个字符撑住，避免最后一行错位 */}
        {'\u200b'}
      </div>
      {children}
    </div>
  )
}

/**
 * 已授权能力的小标签 + 「添加」。点添加弹出这一步可选的能力清单；
 * 勾了 MCP 工具还能再挑这个配方用它的哪几个动作（不挑 = 全部）。
 */
function GrantChips({
  stage, appType, agent, value = [], onChange,
}: { stage: StageKey; appType: AppType; agent?: Agent; value?: string[]; onChange?: (v: string[]) => void }) {
  const form = Form.useFormInstance()
  const actionsPath = ['aiSetting', 'actions', stage]
  // 动作没有单独的输入项，preserve 才能读到直接写进表单存储的值
  const picked = (Form.useWatch(actionsPath, { form, preserve: true }) ?? {}) as Record<string, string[]>
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(value)
  const [draftActions, setDraftActions] = useState<Record<string, string[]>>({})
  const caps = useStageCaps(appType)
  const byId = (id: string): Capability | undefined => caps.find((c) => c.capabilityId === id)
  const own = agent?.capabilities ?? []
  const ownIds = own.map((c) => c.capabilityId)

  return (
    <>
      {/* Agent 自带的：灰色、删不掉，要改去能力中心改 Agent */}
      {own.map((c) => (
        <Tooltip key={c.capabilityId} title={`「${agent?.name}」自带，要去掉请到能力中心改这个 Agent`}>
          <Tag
            icon={c.kind === 'tool' ? <ToolOutlined /> : <BookOutlined />}
            style={{ padding: '2px 8px', fontSize: 13, color: 'rgba(0,0,0,.45)', background: '#F5F5F5', borderColor: '#F0F0F0', marginInlineEnd: 0 }}
          >
            {c.name ?? c.capabilityId}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}> · {agent?.name}自带</Typography.Text>
          </Tag>
        </Tooltip>
      ))}
      {value.filter((id) => !ownIds.includes(id)).map((id) => {
        const c = byId(id)
        return (
          <Tag
            key={id}
            icon={c?.kind === 'tool' ? <ToolOutlined /> : <BookOutlined />}
            closeIcon={<CloseOutlined />}
            onClose={(e) => {
              e.preventDefault()
              onChange?.(value.filter((x) => x !== id))
              const { [id]: _, ...rest } = picked
              form.setFieldValue(actionsPath, rest)
            }}
            style={{ padding: '2px 8px', fontSize: 13, background: '#FFFFFF', borderColor: brand.line, marginInlineEnd: 0 }}
          >
            {c?.name ?? id}
            {picked[id]?.length ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}> · {picked[id].length} 个动作</Typography.Text>
            ) : null}
            {c && c.status !== 'active' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>（{c.status === 'disabled' ? '已停用' : '连接异常'}）</Typography.Text>}
          </Tag>
        )
      })}
      <Button
        type="link"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => {
          setDraft(value)
          setDraftActions(picked)
          setOpen(true)
        }}
      >
        添加
      </Button>
      <Modal
        open={open}
        title={`「${STAGE_META[stage].label}」这一步带哪些能力`}
        okText="确定"
        cancelText="取消"
        onCancel={() => setOpen(false)}
        onOk={() => {
          onChange?.(draft)
          // 只留还勾着的能力、且挑过动作的
          const kept: Record<string, string[]> = {}
          for (const id of draft) if (draftActions[id]?.length) kept[id] = draftActions[id]
          form.setFieldValue(actionsPath, kept)
          setOpen(false)
        }}
        width={560}
      >
        <Typography.Paragraph type="secondary">
          技能教 AI 怎么写，用到时才读全文；工具让 AI 能查资料、调数据。
        </Typography.Paragraph>
        <div style={{ maxHeight: 480, overflow: 'auto' }}>
          <GrantPicker
            stage={stage}
            caps={caps.filter((c) => !ownIds.includes(c.capabilityId))}
            max={MAX_PER_STAGE - ownIds.length}
            value={draft}
            onChange={setDraft}
            renderExtra={(c) =>
              c.kind === 'tool' && c.origin === 'enterprise' && draft.includes(c.capabilityId) ? (
                <ActionPicker
                  capabilityId={c.capabilityId}
                  value={draftActions[c.capabilityId] ?? []}
                  onChange={(names) => setDraftActions({ ...draftActions, [c.capabilityId]: names })}
                />
              ) : null
            }
          />
        </div>
      </Modal>
    </>
  )
}

/** 挑这个配方用 MCP 工具的哪几个动作。一个都不勾 = 全部可用。 */
function ActionPicker({
  capabilityId, value, onChange,
}: { capabilityId: string; value: string[]; onChange: (v: string[]) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: qk.capability(capabilityId),
    queryFn: () => getCapability(capabilityId),
  })
  const actions = data?.tool?.actions ?? []
  return (
    <div
      style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#FFFFFF', border: `1px dashed ${brand.line}` }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        这个配方用它的哪几个动作（不勾 = 全部 {actions.length} 个都能用）
      </Typography.Text>
      {isLoading ? (
        <div style={{ fontSize: 12, marginTop: 6 }}>读取中…</div>
      ) : (
        <Checkbox.Group value={value} onChange={(v) => onChange(v as string[])} style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {actions.map((a) => (
            <Checkbox key={a.name} value={a.name}>
              <Typography.Text code style={{ fontSize: 12 }}>{a.name}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{a.description}</Typography.Text>
            </Checkbox>
          ))}
        </Checkbox.Group>
      )}
    </div>
  )
}

/**
 * 「由谁完成」：只能从已有的 Agent 里选，不能在这里新建（Agent 在能力中心维护）。
 * 值为空串 = 平台自带（采风 / 执笔 / 校审），下拉里显示成「执笔（默认）」。
 */
function AgentSelect({ stage, value = '', onChange }: { stage: StageKey; value?: string; onChange?: (v: string) => void }) {
  const { data } = useQuery({ queryKey: qk.agents(), queryFn: () => listAgents() })
  const items = (data?.items ?? []).filter((a) => !a.assistant && (a.status === 'active' || a.agentId === value))
  const sorted = [...items].sort((a, b) => Number(b.recommendStage === stage) - Number(a.recommendStage === stage))
  const fallback = DEFAULT_AGENT[stage]
  return (
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>由</Typography.Text>
      <Select
        size="small"
        variant="borderless"
        popupMatchSelectWidth={false}
        value={value || fallback}
        onChange={(v) => onChange?.(v === fallback ? '' : v)}
        style={{ minWidth: 96 }}
        options={sorted.map((a) => ({
          value: a.agentId,
          label: a.agentId === fallback ? `${a.name}（默认）` : a.name,
          title: `${a.description} · ${a.modelLabel}`,
        }))}
        optionRender={(o) => {
          const a = sorted.find((x) => x.agentId === o.value)
          return (
            <div style={{ lineHeight: 1.4, padding: '2px 0' }}>
              <div>{o.label}</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{a?.modelLabel} · {a?.description}</Typography.Text>
            </div>
          )
        }}
      />
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>完成</Typography.Text>
    </span>
  )
}

/** 这一步实际由哪个 Agent 做（没选 = 平台自带）。 */
function useStageAgent(stage: StageKey): Agent | undefined {
  const form = Form.useFormInstance()
  const picked = (Form.useWatch(['aiSetting', 'agents', stage], { form, preserve: true }) as string | undefined) ?? ''
  const { data } = useQuery({ queryKey: qk.agents(), queryFn: () => listAgents() })
  return data?.items.find((a) => a.agentId === (picked || DEFAULT_AGENT[stage]))
}

/** 这个应用类型能用的能力（技能 + 工具），提示词点名与「添加」共用一份缓存。 */
function useStageCaps(appType: AppType): Capability[] {
  const { data } = useQuery({
    queryKey: qk.capabilities({ appType }),
    queryFn: () => listCapabilities({ appType }),
  })
  return (data?.items ?? []).filter((c) => c.kind !== 'knowledge')
}
