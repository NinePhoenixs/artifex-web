import type { AppType, Capability, CreateCapabilityRequest, UpdateCapabilityRequest } from '@/api/types'

/** 演示数据不做真实扫描 */
const NO_SCAN = { scripts: 0, blocked: false, findings: [] }

/**
 * 能力中心的演示数据，内容与后端种子（migrations/005_agent_seed.sql）一致。
 * 只在后端没起来的开发环境兜底用。
 */

type MockErrorCtor = new (status: number, body: { code: string; message: string; field?: string }) => Error

const SEED: Capability[] = [
  {
    capabilityId: 'web_search', kind: 'tool', name: '联网搜索', summary: '全网公开信息检索',
    appTypes: [], recommendStage: 'retrieval', origin: 'platform', status: 'active',
    tool: { provider: 'builtin', builtinKey: 'duckduckgo', timeoutMs: 15000 },
  },
  {
    capabilityId: 'web_reader', kind: 'tool', name: '读网页', summary: '读取指定网页的正文',
    appTypes: [], recommendStage: 'retrieval', origin: 'platform', status: 'active',
    tool: { provider: 'builtin', builtinKey: 'webfetch', timeoutMs: 15000 },
  },
  {
    capabilityId: 'xhs_writing', kind: 'skill', name: '小红书种草写法', summary: '标题公式、正文节奏、标签选择',
    appTypes: ['article'], recommendStage: 'generation', origin: 'platform', status: 'active',
    skill: { body: '（演示数据）标题不超过 20 字，带一个具体场景……', version: 1, files: [], scan: NO_SCAN },
  },
  {
    capabilityId: 'de_ai_tone', kind: 'skill', name: '去除 AI 味', summary: '去掉套话和机器腔，读起来像人写的',
    appTypes: [], recommendStage: 'generation', origin: 'platform', status: 'active',
    skill: { body: '（演示数据）不用「值得注意的是」「综上所述」……', version: 1, files: [], scan: NO_SCAN },
  },
]

let caps: Capability[] = structuredClone(SEED)
let seq = 0

export const resetCapabilityMock = () => {
  caps = structuredClone(SEED)
  seq = 0
}

const brief = ({ skill: _s, tool: _t, ...rest }: Capability) => rest

/** 命中返回数据；不归能力中心管的路径返回 undefined。 */
export function handleCapabilityMock(
  method: string,
  path: string,
  body: unknown,
  MockError: MockErrorCtor,
): unknown {
  const [url, qs = ''] = path.split('?')
  if (!url.startsWith('/v1/capabilities')) return undefined
  const id = decodeURIComponent(url.slice('/v1/capabilities'.length).replace(/^\//, ''))

  const DEMO_ACTIONS = [
    { name: 'get_product', description: '（演示）按商品编号查一件商品的名称、材质、尺寸、价格' },
    { name: 'search_products', description: '（演示）按关键词搜商品' },
  ]
  if (method === 'POST' && id === 'discover') return { actions: DEMO_ACTIONS }
  if (method === 'POST' && id.endsWith('/discover')) {
    const c = caps.find((x) => x.capabilityId === id.slice(0, -'/discover'.length))
    if (!c?.tool || c.tool.provider !== 'mcp') throw new MockError(400, { code: 'CAPABILITY_NOT_MCP', message: '只有接入的 MCP 工具才能发现动作' })
    c.tool.actions = DEMO_ACTIONS
    return c
  }

  const find = () => {
    const c = caps.find((x) => x.capabilityId === id)
    if (!c) throw new MockError(404, { code: 'CAPABILITY_NOT_FOUND', message: '能力不存在' })
    return c
  }

  if (!id && method === 'GET') {
    const q = new URLSearchParams(qs)
    const appType = q.get('appType') as AppType | null
    const kind = q.get('kind')
    let list = caps.filter((c) => !kind || c.kind === kind)
    const before = list.length
    if (appType) list = list.filter((c) => c.appTypes.length === 0 || c.appTypes.includes(appType))
    return { items: list.map(brief), total: list.length, hiddenCount: appType ? before - list.length : 0 }
  }

  if (!id && method === 'POST') {
    const b = body as CreateCapabilityRequest
    if (!b.name?.trim()) throw new MockError(400, { code: 'CAPABILITY_REQUEST_INVALID', message: '请填写名称', field: 'name' })
    if (b.kind === 'skill' && !b.summary?.trim()) throw new MockError(400, { code: 'CAPABILITY_REQUEST_INVALID', message: '请填写一句话简介', field: 'summary' })
    const c: Capability = {
      capabilityId: `cap-mock-${++seq}`, kind: b.kind, name: b.name.trim(), summary: b.summary.trim(),
      appTypes: b.appTypes ?? [], recommendStage: b.recommendStage,
      origin: 'enterprise', status: 'active',
      skill: b.skill ? { body: b.skill.body, version: 1, files: (b.skill.files ?? []).map((f) => ({ ...f, script: f.path.startsWith('scripts/') })), scan: NO_SCAN } : undefined,
      tool: b.tool ? { provider: 'mcp', ...b.tool, timeoutMs: b.tool.timeoutMs ?? 15000, actions: DEMO_ACTIONS } : undefined,
    }
    caps.push(c)
    return c
  }

  if (id && method === 'GET') return find()

  if (id && method === 'PATCH') {
    const c = find()
    const b = body as UpdateCapabilityRequest
    const onlyStatus = Object.keys(b).every((k) => k === 'status')
    if (c.origin === 'platform' && !onlyStatus) {
      throw new MockError(409, { code: 'CAPABILITY_READONLY', message: '平台内置能力只能停用或启用' })
    }
    if (b.status) c.status = b.status
    if (b.name) c.name = b.name
    if (b.summary) c.summary = b.summary
    if (b.appTypes) c.appTypes = b.appTypes
    if (b.skill?.body !== undefined && c.skill && b.skill.body !== c.skill.body) {
      c.skill = { ...c.skill, body: b.skill.body, version: c.skill.version + 1 }
    }
    return c
  }

  return undefined
}
