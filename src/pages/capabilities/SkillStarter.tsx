import { useState } from 'react'
import { BookOutlined, CloudUploadOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Skeleton, Tag, Typography, Upload } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { draftSkill, importSkill, listSkillTemplates } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { ScanReport, SkillDraft, SkillFile, StageName } from '@/api/types'
import { stageLabel } from '@/constants/capability'
import { useApiError } from '@/hooks/useApiError'
import { brand } from '@/theme'

export interface StartResult {
  draft: SkillDraft
  recommendStage?: StageName
  warnings: string[]
  /** 从哪来的，编辑页顶部提示用 */
  source: string
  /** 上传的技能包附带的脚本与参考文件 */
  files?: SkillFile[]
  scan?: ScanReport
}

type Mode = 'pick' | 'library' | 'upload' | 'ai'

/** AI 帮写的示例说法：点一下就填进去，告诉运营「一句话」可以写到多具体。 */
const IDEAS = [
  '写小红书家居笔记时，教 AI 怎么给每张配图写图片说明，要短、要有场景',
  '写新品上市文案时，按「痛点—新品怎么解决—一个真实参数」的结构写',
  '检查成稿时，逐条核对文中的价格、尺寸是不是和商品资料一致',
]

/**
 * 技能的三个起点，与 Claude、Codex、扣子的做法一致：
 * 从技能库选 · 上传技能包（标准 SKILL.md）· 让 AI 帮我写。三条路都只出草稿，交给编辑页确认再登记。
 */
export default function SkillStarter({ onStart }: { onStart: (r: StartResult) => void }) {
  const [mode, setMode] = useState<Mode>('pick')

  if (mode === 'library') return <Library onBack={() => setMode('pick')} onStart={onStart} />
  if (mode === 'upload') return <UploadPackage onBack={() => setMode('pick')} onStart={onStart} />
  if (mode === 'ai') return <AiDraft onBack={() => setMode('pick')} onStart={onStart} />

  const cards: { key: Mode; icon: React.ReactNode; title: string; desc: string }[] = [
    { key: 'library', icon: <BookOutlined />, title: '从技能库选', desc: '平台整理好的常用写法和检查清单，选一个改成自己的' },
    { key: 'upload', icon: <CloudUploadOutlined />, title: '上传技能包', desc: '已有的 SKILL.md 或 .zip 技能包，Claude、Codex、扣子导出的都能用' },
    { key: 'ai', icon: <ThunderboltOutlined />, title: '让 AI 帮我写', desc: '一句话说想要什么，AI 写一版初稿，你再改' },
  ]
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setMode(c.key)}
            style={{
              textAlign: 'left', padding: 16, borderRadius: 10, border: `1px solid ${brand.line}`,
              background: '#FFFFFF', cursor: 'pointer', font: 'inherit',
            }}
          >
            <div style={{ fontSize: 20, color: brand.ink, marginBottom: 8 }}>{c.icon}</div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>{c.title}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{c.desc}</Typography.Text>
          </button>
        ))}
      </div>
      <Button
        type="link"
        icon={<EditOutlined />}
        style={{ marginTop: 12, paddingLeft: 0 }}
        onClick={() => onStart({ draft: { name: '', summary: '', body: '' }, warnings: [], source: '空白' })}
      >
        从空白开始写
      </Button>
    </>
  )
}

function Back({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Button type="link" size="small" style={{ paddingLeft: 0 }} onClick={onBack}>← 换个起点</Button>
      <Typography.Text strong>{title}</Typography.Text>
    </div>
  )
}

function Library({ onBack, onStart }: { onBack: () => void; onStart: (r: StartResult) => void }) {
  const { data, isLoading } = useQuery({ queryKey: qk.skillTemplates(), queryFn: listSkillTemplates })
  return (
    <>
      <Back onBack={onBack} title="从技能库选" />
      {isLoading ? (
        <Skeleton active />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 440, overflow: 'auto' }}>
          {(data?.items ?? []).map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => onStart({ draft: t, recommendStage: t.recommendStage, warnings: [], source: `技能库 · ${t.name}` })}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 8, border: `1px solid ${brand.line}`,
                background: '#FFFFFF', cursor: 'pointer', font: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Typography.Text strong>{t.name}</Typography.Text>
                {t.recommendStage && <Tag variant="filled" style={{ marginInlineEnd: 0 }}>{stageLabel(t.recommendStage)}</Tag>}
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.summary}</Typography.Text>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function UploadPackage({ onBack, onStart }: { onBack: () => void; onStart: (r: StartResult) => void }) {
  const handleError = useApiError()
  const [error, setError] = useState<string | null>(null)
  const parse = useMutation({
    mutationFn: importSkill,
    onSuccess: (r, file) => onStart({ ...r, source: `上传 · ${file.name}` }),
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'SKILL_PACKAGE_INVALID') setError(e.message)
      else handleError(e)
    },
  })
  return (
    <>
      <Back onBack={onBack} title="上传技能包" />
      <Upload.Dragger
        accept=".zip,.md"
        showUploadList={false}
        disabled={parse.isPending}
        beforeUpload={(file) => {
          setError(null)
          parse.mutate(file)
          return false
        }}
      >
        <p style={{ fontSize: 28, color: brand.ink, margin: '8px 0' }}><CloudUploadOutlined /></p>
        <Typography.Text strong>{parse.isPending ? '正在解析…' : '把 SKILL.md 或 .zip 技能包拖到这里，或点击选择'}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0 4px' }}>
          支持单个 SKILL.md，或带 scripts/、references/ 的 zip 包，不超过 5 MB。包里的脚本会先做安全扫描。
        </Typography.Paragraph>
      </Upload.Dragger>
      {error && <Alert type="error" showIcon title={error} style={{ marginTop: 12 }} />}
    </>
  )
}

function AiDraft({ onBack, onStart }: { onBack: () => void; onStart: (r: StartResult) => void }) {
  const [idea, setIdea] = useState('')
  const handleError = useApiError()
  const write = useMutation({
    mutationFn: () => draftSkill(idea),
    onSuccess: (r) => onStart({ ...r, source: 'AI 起草' }),
    onError: (e) => handleError(e),
  })
  return (
    <>
      <Back onBack={onBack} title="让 AI 帮我写" />
      <Input.TextArea
        autoSize={{ minRows: 3, maxRows: 6 }}
        maxLength={500}
        showCount
        placeholder="这个技能要教 AI 做什么？在什么时候用？"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        disabled={write.isPending}
      />
      <div style={{ margin: '10px 0 14px' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>可以这样说：</Typography.Text>
        {IDEAS.map((s) => (
          <div key={s}>
            <Button type="link" size="small" style={{ paddingLeft: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => setIdea(s)}>
              {s}
            </Button>
          </div>
        ))}
      </div>
      <Button type="primary" icon={<ThunderboltOutlined />} loading={write.isPending} disabled={!idea.trim()} onClick={() => write.mutate()}>
        {write.isPending ? 'AI 正在写，约半分钟…' : '写一版'}
      </Button>
    </>
  )
}
