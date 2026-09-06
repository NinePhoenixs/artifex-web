import type { App, ErrorBody, FieldError, Recipe } from '@/api/types'
import { MOCK_ENUMS, MOCK_SYSTEM_RECIPES, seedApps, seedRecipes } from './data'

/**
 * 后端没启动时的兜底。**只在开发环境启用**（见 client.ts）。
 *
 * 它模拟的是接口的**形状和关键行为**，不是完整后端：
 * - 应用列表扁平、系统配方不返回 appType（照实调结果）
 * - 保存只过格式校验（400 单字段），转就绪查必填项（422 一次给全部）
 * - 只有就绪配方能被选中（409）
 *
 * 刻意不做的：软删、事务、跨类型校验、重名判重的完整规则。
 * 需要验证这些必须连真后端。
 */

export class MockError extends Error {
  constructor(
    readonly status: number,
    readonly body: ErrorBody,
  ) {
    super(body.message)
  }
}

interface Store {
  apps: App[]
  recipes: Recipe[]
}

let store: Store = { apps: seedApps(), recipes: seedRecipes() }

/** 供测试或"重置演示数据"用。 */
export function resetMockStore() {
  store = { apps: seedApps(), recipes: seedRecipes() }
}

let seq = 100
const nextId = (prefix: string) => `${prefix}-${++seq}`
const now = () => new Date().toISOString()

function findApp(appId: string): App {
  const app = store.apps.find((a) => a.appId === appId)
  if (!app) throw new MockError(404, { code: 'APP_NOT_FOUND', message: '应用不存在' })
  return app
}

function findRecipe(appId: string, recipeId: string): Recipe {
  const r = store.recipes.find((x) => x.recipeId === recipeId && x.appId === appId)
  if (!r) throw new MockError(404, { code: 'RECIPE_NOT_FOUND', message: '配方不存在' })
  return r
}

/** 转就绪的完整性校验——一次返回**全部**缺失字段，这是刻意的。 */
function validateForReady(r: Recipe): FieldError[] {
  const errors: FieldError[] = []
  const g = r.generationSpec
  const m = r.materialSpec

  if (!g.targetAudience?.trim()) {
    errors.push({ field: 'generationSpec.targetAudience', message: '请填写目标受众' })
  }
  if (!g.creationGoal?.trim()) {
    errors.push({ field: 'generationSpec.creationGoal', message: '请填写创作目标' })
  }
  if ('targetWordCount' in g && !(g.targetWordCount && g.targetWordCount > 0)) {
    errors.push({ field: 'generationSpec.targetWordCount', message: '请填写正文字数' })
  }
  if (g.tone === 'custom' && !g.customTone?.trim()) {
    errors.push({ field: 'generationSpec.customTone', message: '请描述自定义表达风格' })
  }
  if (g.contentStructure === 'custom' && !g.customSections?.length) {
    errors.push({ field: 'generationSpec.customSections', message: '请填写自定义段落' })
  }
  if (g.visualStyle === 'custom' && !g.customVisualStyle?.trim()) {
    errors.push({ field: 'generationSpec.customVisualStyle', message: '请描述自定义视觉风格' })
  }
  if (m.freshness === 'custom' && !(m.customFreshness && m.customFreshness >= 1)) {
    errors.push({ field: 'materialSpec.customFreshness', message: '请填写自定义天数' })
  }
  const overlap = m.allowedSources.filter((s) => m.excludedSources.includes(s))
  if (overlap.length) {
    errors.push({
      field: 'materialSpec.excludedSources',
      message: `与指定来源重复：${overlap.join('、')}`,
    })
  }
  return errors
}

/** 保存时的格式校验——只查区间/枚举，返回**单个** field（照后端行为）。 */
function validateForSave(body: Partial<Recipe>): void {
  const m = body.materialSpec
  if (m && ![1, 2, 3].includes(m.maxSearchRounds)) {
    throw new MockError(400, {
      code: 'RECIPE_REQUEST_INVALID',
      message: '检索轮数只能是 1、2 或 3',
      field: 'materialSpec.maxSearchRounds',
    })
  }
  const rp = body.reviewPolicy
  if (rp && ![0, 1, 2].includes(rp.autoRevisionCount)) {
    throw new MockError(400, {
      code: 'RECIPE_REQUEST_INVALID',
      message: '自动修改次数只能是 0、1 或 2',
      field: 'reviewPolicy.autoRevisionCount',
    })
  }
  if (body.name !== undefined && !body.name.trim()) {
    throw new MockError(400, {
      code: 'RECIPE_REQUEST_INVALID',
      message: '请填写配方名称',
      field: 'name',
    })
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 命中返回数据，未命中返回 undefined（让调用方按 404 处理）。 */
export function handleMock(method: Method, path: string, body?: unknown): unknown {
  const url = path.split('?')[0]
  const seg = url.replace(/^\/+|\/+$/g, '').split('/') // ['v1','apps',...]
  const b = (body ?? {}) as Record<string, never>

  // GET /v1/meta/enums
  if (method === 'GET' && url === '/v1/meta/enums') return MOCK_ENUMS

  // /v1/apps
  if (seg[0] === 'v1' && seg[1] === 'apps') {
    if (seg.length === 2) {
      if (method === 'GET') {
        return {
          items: store.apps.map((a) => ({
            ...a,
            recipeCount: store.recipes.filter((r) => r.appId === a.appId).length,
            latestJob: null,
          })),
          total: store.apps.length,
        }
      }
      if (method === 'POST') {
        const appType = (b as Record<string, string>).appType
        const name = (b as Record<string, string>).name
        if (!appType) {
          throw new MockError(400, { code: 'APP_TYPE_REQUIRED', message: '请选择应用类型', field: 'appType' })
        }
        const meta = MOCK_ENUMS.appType.find((o) => o.value === appType)
        if (!meta) {
          throw new MockError(400, { code: 'APP_TYPE_INVALID', message: '应用类型取值非法', field: 'appType' })
        }
        if (!meta.available) {
          throw new MockError(400, {
            code: 'APP_TYPE_UNAVAILABLE',
            message: '该应用类型尚未开放，敬请期待',
            field: 'appType',
          })
        }
        if (!name?.trim()) {
          throw new MockError(400, { code: 'APP_NAME_REQUIRED', message: '请填写应用名称', field: 'name' })
        }

        const appId = nextId('mock-app')
        // 建应用自动备好该类型全部模板副本，并选中第一份
        const copies = MOCK_SYSTEM_RECIPES.map((sr, i) => {
          const base = store.recipes.find((r) => r.systemRecipeId === sr.systemRecipeId)!
          return {
            ...structuredClone(base),
            recipeId: `${appId}-r${i + 1}`,
            appId,
            status: 'ready' as const,
            createdAt: now(),
            updatedAt: now(),
          }
        })
        store.recipes.push(...copies)
        const app: App = {
          appId,
          appType: appType as App['appType'],
          appTypeName: meta.label,
          name: name.trim(),
          description: (b as Record<string, string>).description ?? '',
          selectedRecipeId: copies[0].recipeId,
          iconUrl: null,
          createdAt: now(),
          updatedAt: now(),
        }
        store.apps.push(app)
        return app
      }
    }

    const appId = seg[2]
    if (seg.length === 3) {
      const app = findApp(appId)
      if (method === 'GET') return app
      if (method === 'PATCH') {
        const patch = b as Record<string, string>
        // appType 提交了也不生效
        if (patch.name !== undefined) app.name = patch.name
        if (patch.description !== undefined) app.description = patch.description
        app.updatedAt = now()
        return app
      }
    }

    // /v1/apps/{appId}/system-recipes
    if (seg.length === 4 && seg[3] === 'system-recipes' && method === 'GET') {
      findApp(appId)
      return { items: MOCK_SYSTEM_RECIPES, total: MOCK_SYSTEM_RECIPES.length }
    }

    // /v1/apps/{appId}/recipes
    if (seg[3] === 'recipes') {
      const app = findApp(appId)

      if (seg.length === 4) {
        if (method === 'GET') {
          const items = store.recipes
            .filter((r) => r.appId === appId)
            .sort((a, x) => x.updatedAt.localeCompare(a.updatedAt))
            .map(({ recipeId, name, description, status, updatedAt }) => ({
              recipeId, name, description, status, updatedAt,
            }))
          return { items, total: items.length }
        }
        if (method === 'POST') {
          const srId = (b as Record<string, string>).systemRecipeId
          const src = MOCK_SYSTEM_RECIPES.find((s) => s.systemRecipeId === srId)
          if (!src) {
            throw new MockError(404, { code: 'SYSTEM_RECIPE_NOT_FOUND', message: '模板不存在' })
          }
          const base = store.recipes.find((r) => r.systemRecipeId === srId)!
          const dupe = store.recipes.some((r) => r.appId === appId && r.name === src.name)
          const created: Recipe = {
            ...structuredClone(base),
            recipeId: nextId('mock-recipe'),
            appId,
            status: 'draft',
            name: dupe ? `${src.name}（副本）` : src.name,
            createdAt: now(),
            updatedAt: now(),
          }
          store.recipes.push(created)
          return created
        }
      }

      const recipeId = seg[4]
      if (seg.length === 5) {
        const r = findRecipe(appId, recipeId)
        if (method === 'GET') return r
        if (method === 'PUT') {
          const patch = b as unknown as Partial<Recipe>
          validateForSave(patch)
          Object.assign(r, {
            name: patch.name ?? r.name,
            description: patch.description ?? r.description,
            materialSpec: patch.materialSpec ?? r.materialSpec,
            generationSpec: patch.generationSpec ?? r.generationSpec,
            reviewPolicy: patch.reviewPolicy ?? r.reviewPolicy,
            updatedAt: now(),
          })
          return r
        }
      }

      if (seg.length === 6 && method === 'POST') {
        const r = findRecipe(appId, recipeId)

        if (seg[5] === 'ready') {
          const errors = validateForReady(r)
          if (errors.length) {
            throw new MockError(422, {
              code: 'RECIPE_VALIDATION_FAILED',
              message: '配方仍有必要配置未完成',
              errors,
            })
          }
          r.status = 'ready'
          r.updatedAt = now()
          // 应用尚无选中配方时，第一份转就绪的被自动选中
          if (!app.selectedRecipeId) app.selectedRecipeId = r.recipeId
          return r
        }

        if (seg[5] === 'select') {
          if (r.status !== 'ready') {
            throw new MockError(409, {
              code: 'RECIPE_STATUS_CONFLICT',
              message: '只有就绪的配方才能被选中',
            })
          }
          app.selectedRecipeId = r.recipeId
          app.updatedAt = now()
          return r
        }
      }
    }
  }

  throw new MockError(404, { code: 'NOT_FOUND', message: `演示数据里没有这条接口：${method} ${url}` })
}
