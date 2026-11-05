import type {
  CapabilityKind,
  CapabilityOrigin,
  CapabilityStatus,
  StageName,
} from '@/api/types'
import { STAGE_LABEL } from './stage'

/**
 * 能力中心的中文文案。能力接口还没有枚举字典接口（配方那套 /v1/meta/enums 不含这些），
 * 先在前端维护一份；后端加了字典接口后改为从接口取。
 */
// 应用类型不在这里：与配方共用 /v1/meta/enums 的 appType 组，页面经 useEnums() 取

export const KIND_LABEL: Record<CapabilityKind, string> = {
  skill: '技能',
  tool: '工具',
  knowledge: '资料库',
}

/** 能力的「推荐阶段」只有带能力的三步，配图不带能力 */
const CAP_STAGES: StageName[] = ['retrieval', 'generation', 'review']
export const STAGES: { value: StageName; label: string }[] = CAP_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))

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

export const stageLabel = (s?: StageName) => (s ? STAGE_LABEL[s] ?? s : '不限')
