import { useState } from 'react'
import {
  CloseOutlined, EditOutlined, ExclamationCircleFilled, FileSearchOutlined, InfoCircleFilled,
  ThunderboltOutlined, WarningFilled,
} from '@ant-design/icons'
import { Alert, Button, Form, Input, Modal, Spin, Typography } from 'antd'
import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { promptAssist } from '@/api/endpoints'
import type { PromptAssistResponse, PromptFinding, StageName } from '@/api/types'
import { brand } from '@/theme'

const WAIT_HINT = '一般要 10 秒到 1 分钟。可以先关掉这个窗口，写好了按钮上会提示'

/** 想法的示例：点一下就填进去，告诉运营「一句话」可以写到多具体。 */
const IDEAS: Record<StageName, string[]> = {
  retrieval: ['只找近 30 天的新闻和官方公告，不要论坛帖子', '先查商品库里这款商品的参数，再找真实用户评价'],
  generation: ['写给第一次露营的年轻人，口吻像朋友推荐，600 字左右', '写成清单式测评，每一条都要有具体参数'],
  review: ['逐条核对价格、尺寸是否和商品资料一致', '检查有没有广告法禁用词和绝对化用语'],
}

interface Props {
  stage: StageName
  recipeName: string
  appTypeName: string
}

type Mode = 'generate' | 'optimize'
/** 生成传想法，优化传当时的原文：关掉窗口后 AI 继续写，再打开看到的是同一份结果 */
type Run = UseMutationResult<PromptAssistResponse, Error, string>

/**
 * 提示词板上的三个按钮：AI 生成 / AI 优化 / AI 帮我检查，都由平台助手「参谋」完成。
 * 生成和优化的结果先放在窗口里，人看过点「用这一版」才替换；窗口关了也继续写，按钮上提示写好了。
 * 检查只列意见，不动原文。
 */
export default function PromptAssist({ stage, recipeName, appTypeName }: Props) {
  const form = Form.useFormInstance()
  const promptPath = ['aiSetting', 'prompts', stage]
  const prompt = ((Form.useWatch(promptPath, { form, preserve: true }) as string | undefined) ?? '').trim()
  const grants = (Form.useWatch(['aiSetting', 'grants', stage], { form, preserve: true }) as string[] | undefined) ?? []
  const agentId = (Form.useWatch(['aiSetting', 'agents', stage], { form, preserve: true }) as string | undefined) ?? ''
  const base = { stage, recipeName, appTypeName, grants, agentId }

  const [open, setOpen] = useState<Mode | null>(null)
  const [idea, setIdea] = useState('')
  const [drafts, setDrafts] = useState<Record<Mode, string>>({ generate: '', optimize: '' })
  const [findings, setFindings] = useState<PromptFinding[] | null>(null)

  const keepDraft = (mode: Mode) => (r: PromptAssistResponse) => setDrafts((d) => ({ ...d, [mode]: r.prompt ?? '' }))
  const gen: Run = useMutation({
    mutationFn: (idea: string) => promptAssist({ ...base, mode: 'generate', idea, prompt }),
    onSuccess: keepDraft('generate'),
  })
  const opt: Run = useMutation({
    mutationFn: (original: string) => promptAssist({ ...base, mode: 'optimize', prompt: original }),
    onSuccess: keepDraft('optimize'),
  })
  const check = useMutation({
    mutationFn: () => promptAssist({ ...base, mode: 'check', prompt }),
    onMutate: () => setFindings(null),
    onSuccess: (r) => setFindings(r.findings),
  })

  const openOptimize = () => {
    // 原文改过了，旧的优化结果作废，按现在的重新优化
    if (opt.isIdle || opt.isError || (opt.variables !== prompt && !opt.isPending)) opt.mutate(prompt)
    setOpen('optimize')
  }
  const done = () => {
    ;(open === 'generate' ? gen : opt).reset()
    setOpen(null)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 0 8px -8px' }}>
        <RunButton run={gen} icon={<ThunderboltOutlined />} label="AI 生成" busy="正在生成…" onClick={() => setOpen('generate')} />
        <RunButton run={opt} icon={<EditOutlined />} label="AI 优化" busy="正在优化…" disabled={!prompt && opt.isIdle}
          onClick={openOptimize} />
        <Button type="text" size="small" icon={<FileSearchOutlined />} disabled={!prompt} loading={check.isPending}
          onClick={() => check.mutate()}>
          {check.isPending ? '正在检查…' : 'AI 帮我检查'}
        </Button>
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <Typography.Text code style={{ fontSize: 12 }}>@</Typography.Text> 点名能力 ·{' '}
          <Typography.Text code style={{ fontSize: 12 }}>{'{{变量}}'}</Typography.Text> 试产时填
        </Typography.Text>
      </div>

      {check.isError && (
        <Alert type="error" showIcon closable style={{ marginBottom: 10 }} title={errText(check.error)} onClose={() => check.reset()} />
      )}
      {findings && <Findings items={findings} onClose={() => setFindings(null)} />}

      {open && (
        <AssistModal
          mode={open}
          stage={stage}
          run={open === 'generate' ? gen : opt}
          current={prompt}
          idea={idea}
          onIdea={setIdea}
          draft={drafts[open]}
          onDraft={(v) => setDrafts((d) => ({ ...d, [open]: v }))}
          onClose={() => setOpen(null)}
          onDiscard={done}
          onUse={(text) => {
            form.setFieldValue(promptPath, text)
            setFindings(null)
            done()
          }}
        />
      )}
    </>
  )
}

/** 生成 / 优化按钮：写的时候转圈，写好了没看过就提示「写好了」。 */
function RunButton({ run, icon, label, busy, disabled, onClick }: {
  run: Run
  icon: React.ReactNode
  label: string
  busy: string
  disabled?: boolean
  onClick: () => void
}) {
  const ready = run.isSuccess
  return (
    <Button type="text" size="small" icon={icon} loading={run.isPending} disabled={disabled} onClick={onClick}
      style={ready ? { color: brand.ink, fontWeight: 600 } : undefined}>
      {run.isPending ? busy : ready ? `${label} · 写好了` : label}
    </Button>
  )
}

function AssistModal({
  mode, stage, run, current, idea, onIdea, draft, onDraft, onClose, onDiscard, onUse,
}: {
  mode: Mode
  stage: StageName
  run: Run
  /** 现在提示词板上的内容 */
  current: string
  idea: string
  onIdea: (v: string) => void
  draft: string
  onDraft: (v: string) => void
  onClose: () => void
  onDiscard: () => void
  onUse: (text: string) => void
}) {
  const hasResult = run.isSuccess && draft.trim() !== ''
  const notes = run.data?.notes ?? []
  const title = mode === 'generate' ? 'AI 生成提示词' : 'AI 优化提示词'

  return (
    <Modal
      open
      title={title}
      width={mode === 'optimize' ? 960 : 720}
      onCancel={onClose}
      footer={
        hasResult ? (
          <>
            {mode === 'generate' && <Button onClick={() => run.mutate(idea)}>重新生成</Button>}
            <Button onClick={onDiscard}>不用了</Button>
            <Button type="primary" onClick={() => onUse(draft.trim())}>用这一版</Button>
          </>
        ) : mode === 'generate' && !run.isPending ? (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => run.mutate(idea)}>写一版</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>{run.isPending ? '先关掉' : '关闭'}</Button>
            {run.isError && <Button type="primary" onClick={() => run.mutate(run.variables ?? current)}>再试一次</Button>}
          </>
        )
      }
    >
      {mode === 'generate' && !hasResult && !run.isPending && (
        <>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            一句话说这一步想让 AI 做什么。不写也行，会按这个配方的常见做法写一版。
            {current && ' 现在写的内容会一并参考。'}
          </Typography.Paragraph>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
            value={idea}
            onChange={(e) => onIdea(e.target.value)}
            placeholder="如：写给第一次露营的年轻人，口吻像朋友推荐"
          />
          <div style={{ margin: '10px 0 0' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>可以这样说：</Typography.Text>
            {IDEAS[stage].map((s) => (
              <Button key={s} type="link" size="small" style={{ height: 'auto', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => onIdea(s)}>
                {s}
              </Button>
            ))}
          </div>
        </>
      )}

      {run.isPending && (
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <Spin />
          <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>{WAIT_HINT}</Typography.Paragraph>
        </div>
      )}
      {run.isError && <Alert type="error" showIcon style={{ marginTop: 12 }} title={errText(run.error)} />}

      {hasResult && notes.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} title="这几处 AI 没改好，用之前看一下"
          description={<ul style={{ margin: 0, paddingLeft: 18 }}>{notes.map((n) => <li key={n}>{n}</li>)}</ul>} />
      )}
      {hasResult && mode === 'generate' && (
        <>
          {current && <Alert type="info" showIcon style={{ marginBottom: 12 }} title="点「用这一版」会替换现在写的提示词" />}
          <ResultBoard value={draft} onChange={onDraft} />
        </>
      )}
      {hasResult && mode === 'optimize' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Typography.Text type="secondary">原来</Typography.Text>
            <div
              style={{
                marginTop: 6, padding: '12px 14px', borderRadius: 8, border: `1px solid ${brand.line}`,
                background: brand.paper, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8, maxHeight: 480, overflow: 'auto',
              }}
            >
              {run.variables}
            </div>
          </div>
          <div>
            <Typography.Text type="secondary">优化后（可以直接改）</Typography.Text>
            <div style={{ marginTop: 6 }}>
              <ResultBoard value={draft} onChange={onDraft} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ResultBoard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input.TextArea
      autoSize={{ minRows: 12, maxRows: 22 }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: 13, lineHeight: 1.8, borderRadius: 8 }}
    />
  )
}

const LEVEL = {
  error: { icon: <ExclamationCircleFilled />, color: brand.danger, label: '要改' },
  warn: { icon: <WarningFilled />, color: '#B7791F', label: '建议改' },
  tip: { icon: <InfoCircleFilled />, color: brand.ink, label: '可以更好' },
} as const

function Findings({ items, onClose }: { items: PromptFinding[]; onClose: () => void }) {
  return (
    <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${brand.line}`, background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: items.length ? 6 : 0 }}>
        <Typography.Text strong>
          {items.length ? `AI 检查出 ${items.length} 处可以改` : '没发现问题，这样写 AI 能看懂'}
        </Typography.Text>
        <Button type="text" size="small" icon={<CloseOutlined />} style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="收起检查结果" />
      </div>
      {items.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13, lineHeight: 1.7 }}>
          <span style={{ color: LEVEL[f.level].color, flexShrink: 0 }}>
            {LEVEL[f.level].icon} {LEVEL[f.level].label}
          </span>
          <span>{f.text}</span>
        </div>
      ))}
    </div>
  )
}

function errText(err: unknown) {
  return err instanceof ApiError ? err.message : 'AI 暂时没给出结果，请稍后再试'
}
