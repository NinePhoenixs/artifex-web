import { Select, Typography } from 'antd'
import type { Agent, PipelineStage } from '@/api/types'
import { DEFAULT_AGENT } from '@/constants/stage'
import { useAgents } from '@/hooks/useAgents'

/**
 * 「由谁完成」：只能从已有的 Agent 里选，不能在这里新建（Agent 在能力中心维护）。
 * 值为空串 = 平台自带（采风 / 执笔 / 校审 / 画师），下拉里显示成「执笔（默认）」。
 */
export default function AgentSelect({ stage, value = '', onChange }: {
  stage: PipelineStage
  value?: string
  onChange?: (v: string) => void
}) {
  const { data } = useAgents()
  // 停用的不给选，但配方正用着的照样显示，免得下拉框里只剩一串编号
  const items = (data?.items ?? []).filter((a) => fitsStage(a, stage) && (a.status === 'active' || a.agentId === value))
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

/**
 * 配图的大脑是图片模型，只列「常用在」配图的；写提示词、配图的 Agent 用不了前三步。
 * 后端保存时同样会拦。
 */
function fitsStage(a: Agent, stage: PipelineStage) {
  if (stage === 'illustration') return a.recommendStage === 'illustration'
  return a.recommendStage !== 'assist' && a.recommendStage !== 'illustration'
}
