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

export type ContentStructure =
  | 'introduction_body_conclusion' | 'introduction_body'
  | 'problem_analysis_solution' | 'list' | 'steps' | 'comparison' | 'custom'

export type Tone =
  | 'clear' | 'professional' | 'concise'
  | 'friendly' | 'lively' | 'neutral' | 'custom'

export type VisualStyle =
  | 'simple' | 'business' | 'fresh' | 'editorial'
  | 'infographic' | 'photographic' | 'illustration' | 'custom'

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
  latestJob: null // 后端本期恒为空，不要设计依赖它的 UI
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

/**
 * 字段按 appType 裁剪：不适用的类型在 JSON 里**根本不出现**。
 * 图文配方没有 durationSec / shotCount / slideCount。
 * 因此专有字段一律 optional，页面照响应有什么渲染什么。
 */
export interface GenerationSpec {
  // 共性
  targetAudience: string
  creationGoal: string
  tone: Tone
  customTone: string | null
  titlePreference: string | null
  narrativePerspective: string | null
  mustInclude: string[]
  forbiddenContent: string[]
  // 图文类专有
  targetWordCount?: number
  contentStructure?: ContentStructure
  customSections?: string[]
  visualStyle?: VisualStyle
  customVisualStyle?: string | null
  // 视频 / 音频 / 演示类专有（后端为草案，MVP 不投产）
  shotCount?: number
  narrationSpeed?: number
  bgmStyle?: string
  subtitleStyle?: string
  hostCount?: number
  openingStyle?: string
  durationSec?: number
  slideCount?: number
  pointsPerSlide?: number
  theme?: string
}

/** MVP 只开放自动修改次数；分数线 / 权重 / 硬性规则由平台管理，接口不返回。 */
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
  generationSpec: GenerationSpec
  reviewPolicy: ReviewPolicy
  createdAt: string
  updatedAt: string
}

/** 全量保存：状态、类型、系统管理字段不在其中，提交了也不生效。 */
export interface UpdateRecipeRequest {
  name: string
  description: string
  materialSpec: MaterialSpec
  generationSpec: GenerationSpec
  reviewPolicy: ReviewPolicy
}

// ---------- 枚举字典（GET /v1/meta/enums）----------

export interface EnumOption {
  value: string
  label: string
  /** 仅 appType 组有：该类型是否已开放。 */
  available?: boolean
}

/** 7 组共 37 个选项。所有下拉框的选项与中文文案都从这拿。 */
export interface EnumDict {
  appType: EnumOption[]
  recipeStatus: EnumOption[]
  sourceMode: EnumOption[]
  freshness: EnumOption[]
  contentStructure: EnumOption[]
  tone: EnumOption[]
  visualStyle: EnumOption[]
}

export type EnumGroup = keyof EnumDict

// ---------- 错误 ----------

export interface FieldError {
  /** DTO 字段路径，如 generationSpec.targetAudience */
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
