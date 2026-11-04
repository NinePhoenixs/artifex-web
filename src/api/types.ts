/**
 * 后端接口类型。依据 docs/recipe.proto，但**以实调结果为准**——
 * proto 有几处与实际响应不符，见 docs/设计方案.md §5.2。
 */

export type AppType = 'article' | 'video' | 'audio' | 'slides'
export type RecipeStatus = 'draft' | 'ready'
export type SourceMode = 'automatic' | 'user_first' | 'user_only'

export type Freshness =
  | 'unlimited' | 'last_7_days' | 'last_30_days'
  | 'last_90_days' | 'last_year' | 'custom'

// ---------- 应用 ----------

export interface App {
  appId: string
  appType: AppType
  appTypeName: string
  name: string
  description: string
  selectedRecipeId: string
  iconUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * ⚠️ proto 里 AppListItem 是嵌套的 `{ app: {...}, recipeCount }`，
 * 但**实际响应是扁平的**——App 的字段与 recipeCount 平铺同级。
 * 照 proto 字面写会导致整个应用列表页取不到值。
 */
export interface AppListItem extends App {
  recipeCount: number
  latestJob: null // 后端目前恒为空，不要设计依赖它的 UI
}

export interface ListAppsResponse {
  items: AppListItem[]
  total: number
}

export interface CreateAppRequest {
  appType: AppType
  name: string
  description?: string
}

export interface UpdateAppRequest {
  name?: string
  description?: string
}

// ---------- 模板（系统配方）----------

/** ⚠️ proto 声明了 appType / appTypeName，实际响应**不返回**这两个字段。 */
export interface SystemRecipe {
  systemRecipeId: string
  name: string
  description: string
  features: string[]
  available: boolean
}

export interface ListSystemRecipesResponse {
  items: SystemRecipe[]
  total: number
}

// ---------- 配方 ----------

/** 列表项不含策略：后端为避免 N+1 刻意不加载。要完整配方走详情接口。 */
export interface RecipeListItem {
  recipeId: string
  name: string
  description: string
  status: RecipeStatus
  updatedAt: string
}

export interface ListRecipesResponse {
  items: RecipeListItem[]
  total: number
}

export interface MaterialSpec {
  sourceMode: SourceMode
  allowedSources: string[]
  excludedSources: string[]
  freshness: Freshness
  customFreshness: number | null
  maxSearchRounds: number
}

/** 只开放自动修改次数；分数线 / 权重 / 硬性规则由平台管理，接口不返回。 */
export interface ReviewPolicy {
  autoRevisionCount: number
}

export interface Recipe {
  recipeId: string
  appId: string
  appType: AppType
  appTypeName: string
  systemRecipeId: string
  status: RecipeStatus
  name: string
  description: string
  materialSpec: MaterialSpec
  reviewPolicy: ReviewPolicy
  aiSetting: AiSetting
  createdAt: string
  updatedAt: string
}

/** 全量保存：状态、类型、系统管理字段不在其中，提交了也不生效。 */
export interface UpdateRecipeRequest {
  name: string
  description: string
  materialSpec: MaterialSpec
  reviewPolicy: ReviewPolicy
  /** 不传 = 不改 AI 装配 */
  aiSetting?: AiSetting
}

// ---------- AI 装配（配方第 ④ 类策略）----------

/** 各阶段授权的能力编号，顺序即装载顺序；每阶段最多 8 个。 */
export interface StageGrants {
  retrieval: string[]
  generation: string[]
  review: string[]
}

export interface AiSetting {
  /** 每一步由哪个 Agent 做；空串 = 平台自带（采风 / 执笔 / 校审） */
  agents: StagePrompts
  /** 每一步在 Agent 之外额外带的能力 */
  grants: StageGrants
  /** 每一步的任务要求；空串 = 没写；「写」必须有，可用 {{主题}} 代表每次生产时填的主题 */
  prompts: StagePrompts
  /** 每一步给 MCP 工具挑的动作：能力编号 → 动作名；没出现 = 该工具全部动作可用 */
  actions: StageActions
  /** 只读：每一步实际由谁完成（配方详情接口给，保存时不传） */
  effectiveAgents?: Record<keyof StageGrants, EffectiveAgent>
}

export interface EffectiveAgent {
  agentId: string
  name: string
  modelLabel: string
  capabilities: { capabilityId: string; name: string; kind: 'skill' | 'tool' }[]
}

export interface StageActions {
  retrieval: Record<string, string[]>
  generation: Record<string, string[]>
  review: Record<string, string[]>
}

export interface StagePrompts {
  retrieval: string
  generation: string
  review: string
}

// ---------- 模型目录与 Agent（能力中心「模型」「Agent」两页）----------

export type ActiveStatus = 'active' | 'disabled'
export type StageName = 'retrieval' | 'generation' | 'review'

export interface AiModel {
  modelId: string
  providerId: string
  /** 厂商侧模型名，调接口时传 */
  name: string
  label: string
  /** 元 / 千 token */
  inputPricePer1k: string
  outputPricePer1k: string
  maxOutputTokens: number
  disableThinking: boolean
  requestTimeoutSec: number
  status: ActiveStatus
  usedByAgents: number
}

export interface AiProvider {
  providerId: string
  name: string
  baseUrl: string
  /** 密钥名（如 ARK_API_KEY）。页面上填的密钥存在这个名字下；也可由服务器同名配置提供 */
  secretRef: string
  /** 能不能取到密钥 */
  secretConfigured: boolean
  /** saved = 页面上保存的；server = 服务器配置；空 = 没配 */
  secretSource: 'saved' | 'server' | ''
  /** 页面上保存的密钥尾号，如 ****abcd。密钥本身任何接口都不返回 */
  secretHint: string
  maxConcurrency: number
  status: ActiveStatus
  models: AiModel[]
}

export type ProviderInput = Partial<Pick<AiProvider, 'name' | 'baseUrl' | 'secretRef' | 'maxConcurrency' | 'status'>> & {
  /** 只写：填了就加密保存；空串 = 清除已保存的；不传 = 不改 */
  apiKey?: string
}
export type ModelInput = Partial<Omit<AiModel, 'modelId' | 'usedByAgents'>>

export interface ModelTestResult {
  ok: boolean
  costMs: number
  reply: string
  error: string
}

export interface AgentCapabilityRef {
  capabilityId: string
  name?: string
  kind?: 'skill' | 'tool'
  /** MCP 工具开放的动作；空 = 全部 */
  actions: string[]
}

export type AgentUsage = StageName | 'assist' | ''

export interface Agent {
  agentId: string
  name: string
  description: string
  modelId: string
  modelLabel: string
  /** 常用在哪一步；assist = 写提示词（配方页的 AI 生成 / 优化 / 检查），不能用在生产步骤 */
  recommendStage: AgentUsage
  capabilities: AgentCapabilityRef[]
  origin: 'platform' | 'custom'
  status: ActiveStatus
  usedByRecipes: number
  /** 以下只在详情里有 */
  rolePrompt?: string
  maxLlmCalls?: number
  costCapCent?: number
  recipes?: { appId: string; recipeId: string; name: string; stage: StageName }[]
}

export interface AgentInput {
  name?: string
  description?: string
  modelId?: string
  rolePrompt?: string
  recommendStage?: AgentUsage
  capabilities?: { capabilityId: string; actions: string[] }[]
  maxLlmCalls?: number
  costCapCent?: number
  status?: ActiveStatus
}

export interface AgentTryResult {
  runId: string
  output?: Record<string, unknown>
  error: string
}

// ---------- AI 运行记录（GET /v1/ai-runs）----------

export type RunStatus = 'running' | 'succeeded' | 'failed' | 'over_limit'

export interface AiRunStep {
  seq: number
  kind: 'model' | 'tool' | 'skill'
  capabilityId?: string
  name: string
  inputSummary: string
  outputSummary: string
  skillVersion?: number
  inputTokens?: number
  outputTokens?: number
  cost?: string
  status: 'succeeded' | 'failed'
  costMs: number
  errorMsg?: string
}

export interface AiRun {
  runId: string
  stage: 'retrieval' | 'generation' | 'review'
  attempt: number
  /** 这一步由哪个 Agent 做（Agent 上线前的记录为空） */
  agentId: string
  modelId: string
  model: string
  status: RunStatus
  granted: string[]
  skipped: string[]
  inputTokens: number
  outputTokens: number
  cost: string
  costMs: number
  errorMsg: string
  steps: AiRunStep[]
  createdAt: string
}

// ---------- 枚举字典（GET /v1/meta/enums）----------

export interface EnumOption {
  value: string
  label: string
  /** 仅 appType 组有：该类型是否已开放。 */
  available?: boolean
}

/** 4 组共 17 个选项。所有下拉框的选项与中文文案都从这拿。 */
export interface EnumDict {
  appType: EnumOption[]
  recipeStatus: EnumOption[]
  sourceMode: EnumOption[]
  freshness: EnumOption[]
}

export type EnumGroup = keyof EnumDict

// ---------- 错误 ----------

export interface FieldError {
  /** DTO 字段路径，如 aiSetting.prompts.generation */
  field: string
  /** 可直接展示给用户的中文 */
  message: string
}

export interface ErrorBody {
  code: string
  message: string
  field?: string
  errors?: FieldError[]
}

// ---------- 能力中心（agent 模块） ----------
// 枚举与配方接口同一套写法：小写语义串（article / generation / active）。

export type CapabilityKind = 'skill' | 'tool' | 'knowledge'
export type CapabilityStatus =
  | 'active'
  | 'disabled'
  | 'unreachable'
export type CapabilityOrigin = 'platform' | 'enterprise'
export type CapAppType = AppType
export type Stage = 'retrieval' | 'generation' | 'review'
export type McpTransport = 'streamable' | 'sse'

export interface SkillContent {
  body: string
  version: number
  /** 技能包附带的脚本与参考文件；纯文档技能为空数组 */
  files: SkillFile[]
  /** 脚本扫描结果（每次读出按当前规则重算） */
  scan: ScanReport
}

/** 技能包里的一个文件。scripts/ 下的 .py / .sh / .js 能在沙箱里运行 */
export interface SkillFile {
  path: string
  content: string
  size?: number
  script?: boolean
}

export interface ScanFinding {
  /** high 高危：不能登记 · medium 可疑：给人看 */
  level: 'high' | 'medium'
  file: string
  line: number
  rule: string
  snippet: string
}

export interface ScanReport {
  scripts: number
  blocked: boolean
  findings: ScanFinding[]
}

export interface ToolSpec {
  provider: 'builtin' | 'mcp'
  builtinKey?: string
  mcpTransport?: McpTransport
  mcpUrl?: string
  /** 鉴权配置名，不是密钥本身 */
  secretRef?: string
  toolAllowlist?: string[]
  timeoutMs?: number
  /** 接入时从 MCP 服务发现的动作，描述由服务自带（直接给 AI，不用人写） */
  actions?: ToolAction[]
}

export interface ToolAction {
  name: string
  description: string
}

/** POST /v1/capabilities/discover：测试连接，不落库 */
export interface DiscoverRequest {
  mcpTransport: McpTransport
  mcpUrl: string
  secretRef?: string
  timeoutMs?: number
}

export interface Capability {
  capabilityId: string
  kind: CapabilityKind
  name: string
  summary: string
  /** 空数组 = 通用 */
  appTypes: CapAppType[]
  /** 不出现 = 不限 */
  recommendStage?: Stage
  origin: CapabilityOrigin
  status: CapabilityStatus
  /** 仅详情接口、仅技能 */
  skill?: SkillContent
  /** 仅详情接口、仅工具 */
  tool?: ToolSpec
}

export interface ListCapabilitiesQuery {
  appType?: CapAppType
  stage?: Stage
  kind?: CapabilityKind
  status?: CapabilityStatus
}

export interface ListCapabilitiesResponse {
  items: Capability[]
  total: number
  /** 传了 appType 时，因不适用没列出的数量 */
  hiddenCount: number
}

export interface CreateCapabilityRequest {
  kind: 'skill' | 'tool'
  name: string
  summary: string
  appTypes: CapAppType[]
  recommendStage?: Stage
  skill?: { body: string; files?: Pick<SkillFile, 'path' | 'content'>[] }
  tool?: {
    mcpTransport: McpTransport
    mcpUrl: string
    secretRef?: string
    toolAllowlist?: string[]
    timeoutMs?: number
  }
}

/** 部分更新：不传 = 不改；appTypes / toolAllowlist 传 [] = 改成通用 / 开放全部动作 */
export interface UpdateCapabilityRequest {
  status?: 'active' | 'disabled'
  name?: string
  summary?: string
  appTypes?: CapAppType[]
  recommendStage?: Stage | 'unspecified'
  skill?: { body?: string }
  tool?: {
    mcpTransport?: McpTransport
    mcpUrl?: string
    secretRef?: string
    toolAllowlist?: string[]
    timeoutMs?: number
  }
}

// ---------- 生产任务（试跑用）----------

export type JobStatus =
  | 'received' | 'planned' | 'materializing' | 'generating' | 'reviewing' | 'delivering'
  | 'success' | 'skipped' | 'rejected' | 'failed' | 'waiting_human'

export interface ProductionJob {
  jobId: string
  appId: string
  subjectId: string
  /** 本次主题：替换提示词里的 {{主题}} */
  topic: string
  /** 本次其它变量的值 */
  variables?: Record<string, string>
  status: JobStatus
  currentStage: 'planning' | 'material' | 'generation' | 'review' | 'delivery' | 'none'
  report?: {
    status: JobStatus
    stages: { stage: string; success: boolean; errorMsg?: string }[]
    artifacts: { type: string; role: string; content: string }[]
  }
}

export interface SubmitJobRequest {
  appId: string
  subjectId: string
  recipeId: string
  topic: string
  /** 提示词里其它变量的值，如 { 商品名: '羊毛混纺沙发毯' } */
  variables?: Record<string, string>
}

/** GET /v1/production-jobs 列表项 */
export interface JobListItem {
  jobId: string
  appId: string
  recipeId: string
  topic: string
  status: JobStatus
  currentStage: ProductionJob['currentStage']
  /** 成稿标题；还没写出来为空 */
  title: string
  createdAt: string
  updatedAt: string
}

// ---------- 技能：技能库 / 导入 / AI 起草 ----------

/** 技能草稿：填进登记表单，人确认后再登记 */
export interface SkillDraft {
  name: string
  /** 什么时候用它（SKILL.md 的 description） */
  summary: string
  body: string
}

export interface SkillTemplate extends SkillDraft {
  slug: string
  recommendStage?: Stage
}

export interface SkillDraftResult {
  draft: SkillDraft
  /** 上传技能包时：包里附带的文件与扫描结果；AI 起草时为空 */
  files?: SkillFile[]
  scan?: ScanReport
  warnings: string[]
}

// ---------- 提示词助手 ----------

export type PromptAssistMode = 'generate' | 'optimize' | 'check'

export interface PromptAssistRequest {
  mode: PromptAssistMode
  stage: Stage
  recipeName?: string
  appTypeName?: string
  /** generate 用：想让这一步做什么，可空 */
  idea?: string
  /** optimize / check 必填 */
  prompt?: string
  /** 这一步选的 Agent，空 = 平台自带；它自带的能力也能 @ */
  agentId?: string
  /** 这一步带了的能力编号：AI 据此知道能 @ 谁 */
  grants: string[]
}

export interface PromptFinding {
  /** error 会让 AI 做错 · warn 大概率效果不好 · tip 可以更好 */
  level: 'error' | 'warn' | 'tip'
  text: string
}

export interface PromptAssistResponse {
  prompt?: string
  findings: PromptFinding[]
  /** 生成 / 优化结果里程序发现、AI 没改好的地方，如「原文的 {{商品名}} 不见了」 */
  notes?: string[]
}
