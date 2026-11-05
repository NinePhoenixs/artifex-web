import type { McpAuthType, McpToolInput, ToolSpec } from '@/api/types'

/** 鉴权方式：给人看的名字。 */
export const AUTH_LABEL: Record<McpAuthType, string> = {
  none: '不需要',
  bearer: 'Bearer Token',
  header: '自定义请求头',
  query: '地址里带参数',
}

export const AUTH_OPTIONS = (Object.keys(AUTH_LABEL) as McpAuthType[]).map((value) => ({ value, label: AUTH_LABEL[value] }))

/** 超时默认 15 秒。 */
export const DEFAULT_TIMEOUT_SEC = 15

/** 表单里接 MCP 服务的那几项。超时按秒填。 */
export interface McpFormValues {
  mcpUrl?: string
  authType?: McpAuthType
  authParam?: string
  apiKey?: string
  timeoutSec?: number
}

export const secToMs = (sec?: number) => Math.round((sec && sec > 0 ? sec : DEFAULT_TIMEOUT_SEC) * 1000)
export const msToSec = (ms?: number) => (ms && ms > 0 ? Math.round(ms / 100) / 10 : DEFAULT_TIMEOUT_SEC)

/** 表单 → 登记 / 测试连接的请求。鉴权不需要时不带参数名和密钥；只有自定义请求头、地址带参数才带参数名。 */
export function toToolInput(v: McpFormValues): McpToolInput {
  const authType = v.authType ?? 'none'
  const out: McpToolInput = { mcpUrl: (v.mcpUrl ?? '').trim(), authType, timeoutMs: secToMs(v.timeoutSec) }
  if (authType === 'header' || authType === 'query') out.authParam = (v.authParam ?? '').trim()
  const key = (v.apiKey ?? '').trim()
  if (authType !== 'none' && key) out.apiKey = key
  return out
}

/**
 * 表单 → 修改请求。密钥留空 = 不改；clearKey = 清除已保存的密钥；鉴权改成不需要时服务端自己清掉密钥。
 */
export function toToolPatch(v: McpFormValues, clearKey = false): Partial<McpToolInput> {
  const out = toToolInput(v)
  if (clearKey && out.authType !== 'none' && !out.apiKey) out.apiKey = ''
  return out
}

/** 已登记的工具 → 表单初值。密钥不回显。 */
export function fromToolSpec(t: ToolSpec): McpFormValues {
  return { mcpUrl: t.mcpUrl, authType: t.authType ?? 'none', authParam: t.authParam, timeoutSec: msToSec(t.timeoutMs) }
}

/** 鉴权参数名的标签和示例：请求头名 / 参数名。 */
export function authParamMeta(t: McpAuthType) {
  return t === 'header'
    ? { label: '请求头名', placeholder: 'X-API-Key' }
    : t === 'query'
      ? { label: '参数名', placeholder: 'api_key' }
      : null
}

/** 修改时是否必须重新填密钥：从不需要鉴权改成需要，且之前没存过密钥。 */
export function needsKey(v: McpFormValues, saved: boolean) {
  return (v.authType ?? 'none') !== 'none' && !saved && !(v.apiKey ?? '').trim()
}
