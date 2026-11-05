import { api, apiUrl } from './client'
import type {
  AiRun,
  SkillDraftResult,
  SkillTemplate,
  DiscoverRequest,
  ToolAction,
  JobListItem,
  ProductionJob,
  SubmitJobRequest,
  App,
  Capability,
  CreateCapabilityRequest,
  ListCapabilitiesQuery,
  ListCapabilitiesResponse,
  UpdateCapabilityRequest,
  CreateAppRequest,
  EnumDict,
  ListAppsResponse,
  ListRecipesResponse,
  ListSystemRecipesResponse,
  Recipe,
  UpdateAppRequest,
  UpdateRecipeRequest,
  PromptAssistRequest,
  PromptAssistResponse,
  Agent,
  AgentInput,
  AgentTryResult,
  AiModel,
  AiProvider,
  ModelInput,
  ModelTestResult,
  PipelineStage,
  ProviderInput,
  StageName,
} from './types'

// ---------- 元数据 ----------

/** 枚举字典，7 组 37 项。所有下拉框的选项与中文文案的唯一来源。 */
export const getEnums = () => api.get<EnumDict>('/v1/meta/enums')

// ---------- 应用 ----------

export const listApps = () => api.get<ListAppsResponse>('/v1/apps')

export const getApp = (appId: string) => api.get<App>(`/v1/apps/${appId}`)

export const createApp = (body: CreateAppRequest) => api.post<App>('/v1/apps', body)

/** appType 不可更新，提交了也不生效。 */
export const updateApp = (appId: string, body: UpdateAppRequest) =>
  api.patch<App>(`/v1/apps/${appId}`, body)

// ---------- 模板 ----------

/** 服务端按该应用的 app_type 过滤，前端不用传类型。 */
export const listSystemRecipes = (appId: string) =>
  api.get<ListSystemRecipesResponse>(`/v1/apps/${appId}/system-recipes`)

// ---------- 配方 ----------

/** 只回主表字段，不含策略。要完整配方走 getRecipe。 */
export const listRecipes = (appId: string) =>
  api.get<ListRecipesResponse>(`/v1/apps/${appId}/recipes`)

export const getRecipe = (appId: string, recipeId: string) =>
  api.get<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}`)

/** 从模板创建，深拷贝模板全部策略。重名自动追加「（副本）」。 */
export const createRecipe = (appId: string, systemRecipeId: string) =>
  api.post<Recipe>(`/v1/apps/${appId}/recipes`, { systemRecipeId })

/** 从空白建：三步提示词都空着，草稿态。 */
export const createBlankRecipe = (appId: string) =>
  api.post<Recipe>(`/v1/apps/${appId}/recipes`, { blank: true })

/** 全量保存。草稿只过格式校验，失败 400 带 field。 */
export const updateRecipe = (appId: string, recipeId: string, body: UpdateRecipeRequest) =>
  api.put<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}`, body)

/** 草稿 → 就绪。完整性校验不过返回 422，一次给出全部缺失字段。 */
export const markRecipeReady = (appId: string, recipeId: string) =>
  api.post<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}/ready`)

/** 设为应用当前使用的配方。仅就绪配方可选中，否则 409。 */
export const selectRecipe = (appId: string, recipeId: string) =>
  api.post<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}/select`)

// ---------- 能力中心 ----------

/** 列能力。传 appType 时只列适用于该类型的（含通用），并给出因不适用而隐藏的数量。 */
export const listCapabilities = (q: ListCapabilitiesQuery = {}) => {
  const params = new URLSearchParams()
  Object.entries(q).forEach(([k, v]) => v && params.set(k, v))
  const qs = params.toString()
  return api.get<ListCapabilitiesResponse>(`/v1/capabilities${qs ? `?${qs}` : ''}`)
}

/** 详情带技能正文或工具接法。 */
export const getCapability = (id: string) =>
  api.get<Capability>(`/v1/capabilities/${encodeURIComponent(id)}`)

/** 企业登记技能或 MCP 工具，201。 */
export const createCapability = (body: CreateCapabilityRequest) =>
  api.post<Capability>('/v1/capabilities', body)

/** 部分更新；平台内置能力只能改状态，改别的 409 CAPABILITY_READONLY。 */
export const updateCapability = (id: string, body: UpdateCapabilityRequest) =>
  api.patch<Capability>(`/v1/capabilities/${encodeURIComponent(id)}`, body)

// ---------- AI 装配与运行记录 ----------

/** 「指定模型」下拉框：可选模型、档位映射、平台默认上限 */
// ---- 模型目录与 Agent ----
export const listProviders = () => api.get<{ items: AiProvider[] }>('/v1/ai-providers')
export const createProvider = (body: ProviderInput) => api.post<AiProvider>('/v1/ai-providers', body)
export const updateProvider = (providerId: string, body: ProviderInput) =>
  api.patch<AiProvider>(`/v1/ai-providers/${providerId}`, body)
export const createModel = (body: ModelInput) => api.post<AiModel>('/v1/ai-models', body)
export const updateModel = (modelId: string, body: ModelInput) => api.patch<AiModel>(`/v1/ai-models/${modelId}`, body)
/** 厂商那边这个 API Key 能用的模型名；拿不到时 items 为空、error 说明原因 */
export const listRemoteModels = (providerId: string) =>
  api.get<{ items: string[]; error: string }>(`/v1/ai-providers/${providerId}/remote-models`)
export const testModel = (modelId: string) => api.post<ModelTestResult>(`/v1/ai-models/${modelId}/test`, {})

export const listAgents = (stage?: StageName) =>
  api.get<{ items: Agent[] }>(`/v1/agents${stage ? `?stage=${stage}` : ''}`)
export const getAgent = (agentId: string) => api.get<Agent>(`/v1/agents/${agentId}`)
export const createAgent = (body: AgentInput) => api.post<Agent>('/v1/agents', body)
export const updateAgent = (agentId: string, body: AgentInput) => api.patch<Agent>(`/v1/agents/${agentId}`, body)
/** 试一下：同步等 AI 跑完，免费模型可能要一两分钟 */
export const tryAgent = (agentId: string, body: { stage: Exclude<PipelineStage, 'review'>; task: string; topic: string }) =>
  api.post<AgentTryResult>(`/v1/agents/${agentId}/try`, body)

/** 某个生产任务里 AI 做了什么：每次阶段运行及其步骤 */
export const listAiRuns = (bizId: string, bizType = 'production') =>
  api.get<{ items: AiRun[]; total: number }>(
    `/v1/ai-runs?${new URLSearchParams({ bizType, bizId })}`,
  )

// ---------- 生产任务 ----------

export const submitJob = (body: SubmitJobRequest) => api.post<ProductionJob>('/v1/production-jobs', body)

export const getJob = (jobId: string) => api.get<ProductionJob>(`/v1/production-jobs/${jobId}`)

/** 一个任务全部画好的图打成 zip 的下载地址 */
export const jobImagesZipUrl = (jobId: string) => apiUrl(`/v1/production-jobs/${encodeURIComponent(jobId)}/images.zip`)

/** 最近的任务，新的在前；appId 为空 = 全部应用 */
export const listJobs = (q: { appId?: string; limit?: number } = {}) => {
  const p = new URLSearchParams()
  if (q.appId) p.set('appId', q.appId)
  if (q.limit) p.set('limit', String(q.limit))
  const qs = p.toString()
  return api.get<{ items: JobListItem[]; total: number }>(`/v1/production-jobs${qs ? `?${qs}` : ''}`)
}

/** 测试连接：连上 MCP 服务取回它提供的动作，不落库。连不上 400，field=tool.mcpUrl */
export const discoverTools = (body: DiscoverRequest) =>
  api.post<{ actions: ToolAction[] }>('/v1/capabilities/discover', body)

/** 重新发现已登记 MCP 工具的动作（对方加了新动作时用） */
export const refreshToolActions = (id: string) =>
  api.post<Capability>(`/v1/capabilities/${encodeURIComponent(id)}/discover`, {})

// ---------- 技能的三个起点（只出草稿，登记仍走 createCapability） ----------

/** 平台技能库：一份份标准 SKILL.md */
export const listSkillTemplates = () => api.get<{ items: SkillTemplate[]; total: number }>('/v1/skill-templates')

/** 上传 .zip 技能包或 SKILL.md，解析成草稿 */
export const importSkill = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.upload<SkillDraftResult>('/v1/skills/import', form)
}

/** 一句话描述，让 AI 写一份技能草稿（约 20~40 秒） */
export const draftSkill = (idea: string) => api.post<SkillDraftResult>('/v1/skills/draft', { idea })

/** 导出成标准 SKILL.md 的下载地址 */
export const skillExportUrl = (id: string) => apiUrl(`/v1/capabilities/${encodeURIComponent(id)}/skill.md`)

/** 提示词助手：AI 生成 / 优化 / 检查。只给建议，不落库；免费模型可能要 1~2 分钟 */
export const promptAssist = (body: PromptAssistRequest) =>
  api.post<PromptAssistResponse>('/v1/prompt-assist', body)
