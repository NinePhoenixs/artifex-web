import type {
  CapAppType,
  CapabilityKind,
  CapabilityOrigin,
  CapabilityStatus,
  Stage,
} from '@/api/types'

/**
 * 能力中心的中文文案。能力接口还没有枚举字典接口（配方那套 /v1/meta/enums 不含这些），
 * 先在前端维护一份；后端加了字典接口后改为从接口取。
 */

export const CAP_APP_TYPES: { value: CapAppType; label: string }[] = [
  { value: 'article', label: '图文' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
  { value: 'slides', label: '演示' },
]

export const KIND_LABEL: Record<CapabilityKind, string> = {
  skill: '技能',
  tool: '工具',
  knowledge: '资料库',
}

export const STAGES: { value: Stage; label: string }[] = [
  { value: 'retrieval', label: '检索' },
  { value: 'generation', label: '生产' },
  { value: 'review', label: '审核' },
]

export const ORIGIN_LABEL: Record<CapabilityOrigin, string> = {
  platform: '平台',
  enterprise: '我们登记',
}

/** 状态：文案 + antd Tag 颜色。连接异常只会出现在 MCP 工具上，由系统设置。 */
export const STATUS_META: Record<CapabilityStatus, { label: string; color: string }> = {
  active: { label: '可用', color: 'success' },
  disabled: { label: '已停用', color: 'default' },
  unreachable: { label: '连接异常', color: 'error' },
}

export const appTypeLabel = (t: CapAppType) =>
  CAP_APP_TYPES.find((x) => x.value === t)?.label ?? t

export const stageLabel = (s?: Stage) => (s ? STAGES.find((x) => x.value === s)?.label ?? s : '不限')
