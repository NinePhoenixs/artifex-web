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

export type ImageRatio = '3:4' | '1:1' | '4:3' | '16:9' | '9:16'

/** 版式：成品做成什么样子。note 小红书笔记（图在上、字在下）/ article 文章（图插在正文里） */
export type Layout = 'note' | 'article'

/** 「配图」这一步：检查通过后按成稿出图，第一张当封面。画什么风格写在 aiSetting.prompts.illustration */
export interface IllustrationSetting {
  enabled: boolean
  /** 1~9 */
  imageCount: number
  imageRatio: ImageRatio
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
  illustration: IllustrationSetting
  /** 版式；老配方没有时按小红书笔记 */
  layout?: Layout
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
  /** 不传 = 不改配图设置 */
  illustration?: IllustrationSetting
  /** 不传 = 不改版式 */
  layout?: Layout
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
  /** 每一步由哪个 Agent 做；空串 = 平台自带（采风 / 执笔 / 校审 / 画师） */
  agents: StagePrompts
  /** 每一步在 Agent 之外额外带的能力（配图不带能力） */
  grants: StageGrants
  /** 每一步的任务要求；空串 = 没写；「写」必须有，可用 {{主题}} 代表每次生产时填的主题 */
  prompts: StagePrompts
  /** 每一步给 MCP 工具挑的动作：能力编号 → 动作名；没出现 = 该工具全部动作可用 */
  actions: StageActions
  /** 只读：每一步实际由谁完成（配方详情接口给，保存时不传） */
  effectiveAgents?: Record<keyof StagePrompts, EffectiveAgent>
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
  illustration: string
}

// ---------- 模型目录与 Agent（能力中心「模型」「Agent」两页）----------

export type ActiveStatus = 'active' | 'disabled'
/** 带能力、写提示词的三步：找资料 / 写 / 检查 */
export type StageName = 'retrieval' | 'generation' | 'review'
/** 流水线上由 AI 完成的四步：三步之外加配图（配图不带能力） */
export type PipelineStage = StageName | 'illustration'

export interface AiModel {
  modelId: string
  providerId: string
  /** 厂商侧模型名，调接口时传 */
  name: string
  label: string
  /** text 文字（对话、带工具）/ image 图片（只用来配图） */
  modality: 'text' | 'image'
  /** free 免费 / plan 包月或套餐 / metered 按量计费（只有它按单价算钱） */
  billing: 'free' | 'plan' | 'metered'
  /** 元 / 千 token，只对按量计费的文字模型有意义 */
  inputPricePer1k: string
  outputPricePer1k: string
  /** 元 / 张，只对按量计费的图片模型有意义 */
  pricePerImage: string
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

export type AgentUsage = PipelineStage | 'assist' | ''

export interface Agent {
  agentId: string
  name: string
  description: string
  modelId: string
  modelLabel: string
  /** 常用在哪一步；assist = 写提示词（配方页的 AI 生成 / 优化 / 检查）、illustration = 配图（大脑要是图片模型），都不能用在找资料 / 写 / 检查 */
  recommendStage: AgentUsage
  capabilities: AgentCapabilityRef[]
  origin: 'platform' | 'custom'
  status: ActiveStatus
  usedByRecipes: number
  /** 以下只在详情里有 */
  rolePrompt?: string
  maxLlmCalls?: number
  costCapCent?: number
  recipes?: { appId: string; recipeId: string; name: string; stage: PipelineStage }[]
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
  stage: PipelineStage
  /** 配图时是第几张 */
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
  layout: EnumOption[]
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
export type McpTransport = 'streamable' | 'sse'

/** MCP 工具的鉴权方式：none 不需要 · bearer Authorization: Bearer 密钥 · header 自定义请求头 · query 地址里带参数 */
export type McpAuthType = 'none' | 'bearer' | 'header' | 'query'

/** 登记 / 修改 / 测试连接 MCP 工具时的接法。传输方式不传，由服务端自动识别 */
export interface McpToolInput {
  mcpUrl: string
  authType: McpAuthType
  /** header：请求头名，如 X-API-Key；query：参数名，如 api_key；其余忽略 */
  authParam?: string
  /** 密钥值。登记、测试连接时鉴权方式不是 none 就要填；修改时不传 = 不改，传空串 = 清除 */
  apiKey?: string
  timeoutMs?: number
}

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
  /** 自动识别出的传输方式 */
  mcpTransport?: McpTransport
  mcpUrl?: string
  authType?: McpAuthType
  authParam?: string
  /** 密钥是否已保存（值不返回） */
  secretConfigured?: boolean
  /** 已保存密钥的尾号，如 ****abcd */
  secretHint?: string
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
export type DiscoverRequest = McpToolInput

export interface Capability {
  capabilityId: string
  kind: CapabilityKind
  name: string
  summary: string
  /** 空数组 = 通用 */
  appTypes: AppType[]
  /** 不出现 = 不限 */
  recommendStage?: StageName
  origin: CapabilityOrigin
  status: CapabilityStatus
  /** 仅详情接口、仅技能 */
  skill?: SkillContent
  /** 仅详情接口、仅工具 */
  tool?: ToolSpec
}

export interface ListCapabilitiesQuery {
  appType?: AppType
  stage?: StageName
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
  appTypes: AppType[]
  recommendStage?: StageName
  skill?: { body: string; files?: Pick<SkillFile, 'path' | 'content'>[] }
  tool?: McpToolInput & { toolAllowlist?: string[] }
}

/** 部分更新：不传 = 不改；appTypes / toolAllowlist 传 [] = 改成通用 / 开放全部动作 */
export interface UpdateCapabilityRequest {
  status?: 'active' | 'disabled'
  name?: string
  summary?: string
  appTypes?: AppType[]
  recommendStage?: StageName | 'unspecified'
  skill?: { body?: string }
  tool?: Partial<McpToolInput> & { toolAllowlist?: string[] }
}

// ---------- 生产任务（试跑用）----------

export type JobStatus =
  | 'received' | 'planned' | 'materializing' | 'generating' | 'reviewing' | 'illustrating' | 'delivering'
  | 'success' | 'skipped' | 'rejected' | 'failed' | 'waiting_human'

/** 生产走到哪一步 */
export type JobStepName = 'planning' | 'material' | 'generation' | 'review' | 'illustration' | 'delivery' | 'none'

/** 文件角色：cover 封面 / illustration 配图 */
export type FileRole = 'cover' | 'illustration'

/** 内容带的一个文件：序号、角色，地址和尺寸（读不出来时没有尺寸） */
export interface JobFile {
  no: number
  role: FileRole
  fileId: string
  caption?: string
  /** 相对地址，带 ?download=true 下载 */
  url: string
  mime?: string
  width?: number
  height?: number
  sizeBytes?: number
}

/** 资料清单（找资料交出） */
export interface MaterialList {
  items: { no: number; title: string; url: string; excerpt: string; publishedAt: string }[]
}

/** 图文稿（写交出）。body 是 Markdown */
export interface ArticleDraft {
  title: string
  titleCandidates: string[]
  body: string
  tags: string[]
  imageHints: string[]
}

/** 检查报告（检查交出）：逐条结果，quote 是出问题的原句 */
export interface ReviewReport {
  passed: boolean
  score: number
  items: { text: string; passed: boolean; reason: string; quote: string }[]
}

/** 图片组（配图交出），含没画出来的 */
export interface ImageSet {
  images: {
    no: number
    role: FileRole
    caption: string
    fileId?: string
    status: 'succeeded' | 'failed'
    error?: string
    prompt?: string
  }[]
}

/** 图文成品（交付物）。body 是 Markdown，可用 ![说明](image:序号) 放图 */
export interface Article {
  /** 版式；早期的交付物没有，按小红书笔记 */
  layout?: Layout
  title: string
  body: string
  tags: string[]
  files: { no: number; role: FileRole; fileId: string; caption?: string }[]
}

/** 一步交出的一份东西，content 的形状由 format 定 */
export type StepResult = { resultId: string; files: JobFile[] } & (
  | { format: 'material_list'; content: MaterialList }
  | { format: 'article_draft'; content: ArticleDraft }
  | { format: 'review_report'; content: ReviewReport }
  | { format: 'image_set'; content: ImageSet }
)

/** 做了一次某一步 */
export interface JobStepRecord {
  step: JobStepName
  /** 这一步第几次，从 1 起 */
  attempt: number
  status: 'running' | 'succeeded' | 'failed'
  startedAt?: string
  finishedAt?: string
  costMs: number
  errorMsg?: string
  results: StepResult[]
}

/** 交付物：最终成品 */
export interface Deliverable {
  deliverableId: string
  format: 'article'
  content: Article
  files: JobFile[]
}

export interface ProductionJob {
  jobId: string
  appId: string
  recipeId: string
  subjectId: string
  /** 本次主题：替换提示词里的 {{主题}} */
  topic: string
  /** 本次其它变量的值 */
  variables?: Record<string, string>
  status: JobStatus
  currentStep: JobStepName
  /** 定稿是哪条步骤结果，没定稿为空 */
  finalResultId: string
  steps: JobStepRecord[]
  /** 还没交付为 null */
  deliverable: Deliverable | null
  /** 受理时生效的配方设置，复盘用 */
  recipeSnapshot?: { illustration?: { enabled: boolean; count: number }; layout?: Layout } & Record<string, unknown>
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
  currentStep: JobStepName
  /** 交付物的标题，没交付取最新一稿的；都没有为空 */
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
  recommendStage?: StageName
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
  stage: StageName
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
