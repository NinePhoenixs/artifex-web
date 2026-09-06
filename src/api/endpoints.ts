import { api } from './client'
import type {
  App,
  CreateAppRequest,
  EnumDict,
  ListAppsResponse,
  ListRecipesResponse,
  ListSystemRecipesResponse,
  Recipe,
  UpdateAppRequest,
  UpdateRecipeRequest,
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

/** 全量保存。草稿只过格式校验，失败 400 带 field。 */
export const updateRecipe = (appId: string, recipeId: string, body: UpdateRecipeRequest) =>
  api.put<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}`, body)

/** 草稿 → 就绪。完整性校验不过返回 422，一次给出全部缺失字段。 */
export const markRecipeReady = (appId: string, recipeId: string) =>
  api.post<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}/ready`)

/** 设为应用当前使用的配方。仅就绪配方可选中，否则 409。 */
export const selectRecipe = (appId: string, recipeId: string) =>
  api.post<Recipe>(`/v1/apps/${appId}/recipes/${recipeId}/select`)
