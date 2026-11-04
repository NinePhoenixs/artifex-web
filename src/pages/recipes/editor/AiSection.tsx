import type React from 'react'
import { Checkbox, Tag, Typography } from 'antd'
import type { Capability, StageGrants } from '@/api/types'
import { KIND_LABEL, STATUS_META } from '@/constants/capability'
import { brand } from '@/theme'

export type StageKey = keyof StageGrants

/** 每一步最多带几个能力（Agent 自带 + 配方额外，合计），与后端一致。 */
export const MAX_PER_STAGE = 8

/** 配方步骤没选 Agent 时由谁做，与后端 domain.DefaultAgentFor 一致。 */
export const DEFAULT_AGENT: Record<StageKey, string> = { retrieval: 'caifeng', generation: 'zhibi', review: 'jiaoshen' }

/**
 * 一个阶段的能力清单（勾选）。勾选顺序就是装载顺序；推荐给本阶段的排前面。
 * 停用、连接异常的也列出来并可勾选：先授权，启用或恢复后自动生效。
 */
export function GrantPicker({
  stage, caps, value = [], onChange, renderExtra, max = MAX_PER_STAGE,
}: {
  stage: StageKey
  caps: Capability[]
  value?: string[]
  onChange?: (v: string[]) => void
  /** 还能勾几个（Agent 自带的已占掉一部分） */
  max?: number
  /** 勾上之后在卡片下方追加的内容（如挑 MCP 动作） */
  renderExtra?: (c: Capability) => React.ReactNode
}) {
  const sorted = [...caps].sort(
    (a, b) => Number(b.recommendStage === stage) - Number(a.recommendStage === stage),
  )
  const full = value.length >= max
  const toggle = (id: string, on: boolean) =>
    onChange?.(on ? [...value, id] : value.filter((x) => x !== id))

  if (!sorted.length) {
    return <Typography.Text type="secondary">还没有适用于这类应用的能力，去能力中心登记一个。</Typography.Text>
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {sorted.map((c) => {
        const checked = value.includes(c.capabilityId)
        return (
          <div
            key={c.capabilityId}
            style={{
              padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${checked ? brand.ink : brand.line}`,
              background: checked ? brand.inkSoft : '#FFFFFF',
            }}
          >
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: !checked && full ? 'not-allowed' : 'pointer' }}>
              <Checkbox
                checked={checked}
                disabled={!checked && full}
                onChange={(e) => toggle(c.capabilityId, e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Typography.Text strong>{c.name}</Typography.Text>
                  <Tag variant="filled" style={{ marginInlineEnd: 0 }}>{KIND_LABEL[c.kind]}</Tag>
                  {c.recommendStage === stage && <Tag color="gold" style={{ marginInlineEnd: 0 }}>推荐</Tag>}
                  {c.status !== 'active' && (
                    <Tag color={STATUS_META[c.status].color} style={{ marginInlineEnd: 0 }}>
                      {STATUS_META[c.status].label}
                    </Tag>
                  )}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{c.summary}</Typography.Text>
              </div>
            </label>
            {/* 放在 label 外面：里面的勾选框不会连带切换外层 */}
            <div style={{ paddingLeft: 26 }}>{renderExtra?.(c)}</div>
          </div>
        )
      })}
      {full && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          每一步最多带 {MAX_PER_STAGE} 个能力，带太多 AI 反而挑不准。
        </Typography.Text>
      )}
    </div>
  )
}
