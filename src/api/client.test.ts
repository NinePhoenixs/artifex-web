import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, isOffline, toNamePath } from './client'
import { resetMockStore } from '@/mocks/server'

afterEach(() => {
  vi.unstubAllGlobals()
  resetMockStore()
})

/** 让 fetch 直接抛（模拟后端没起、连接被拒）。 */
function stubFetchThrows() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
}

/** 让 fetch 返回指定状态码与 body。 */
function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    }),
  )
}

describe('toNamePath', () => {
  it('把后端字段路径拆成 antd 的 namePath', () => {
    expect(toNamePath('generationSpec.targetAudience')).toEqual([
      'generationSpec',
      'targetAudience',
    ])
  })

  it('数组下标转成 number', () => {
    expect(toNamePath('generationSpec.customSections.0')).toEqual([
      'generationSpec',
      'customSections',
      0,
    ])
  })
})

describe('ApiError 分类', () => {
  it('带 field 的算表单错误（不该弹提示条）', async () => {
    stubFetch(400, { code: 'APP_TYPE_REQUIRED', message: '请选择应用类型', field: 'appType' })
    const err = await api.post<never>('/v1/apps', {}).catch((e) => e as ApiError)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.field).toBe('appType')
    expect(err.isFormError).toBe(true)
  })

  it('带 errors[] 的算表单错误', async () => {
    stubFetch(422, {
      code: 'RECIPE_VALIDATION_FAILED',
      message: '配方仍有必要配置未完成',
      errors: [
        { field: 'generationSpec.targetAudience', message: '请填写目标受众' },
        { field: 'generationSpec.creationGoal', message: '请填写创作目标' },
      ],
    })
    const err = await api.post<never>('/v1/x/ready').catch((e) => e as ApiError)
    expect(err.isFormError).toBe(true)
    expect(err.errors).toHaveLength(2)
  })

  it('404 / 409 不算表单错误（该弹提示条）', async () => {
    stubFetch(409, { code: 'RECIPE_STATUS_CONFLICT', message: '只有就绪的配方才能被选中' })
    const err = await api.post<never>('/v1/x/select').catch((e) => e as ApiError)
    expect(err.isFormError).toBe(false)
    expect(err.message).toBe('只有就绪的配方才能被选中')
  })
})

describe('后端没启动时回落演示数据', () => {
  it('fetch 抛异常 → 返回 mock 数据并进入离线态', async () => {
    stubFetchThrows()
    const res = await api.get<{ items: unknown[]; total: number }>('/v1/apps')
    expect(res.total).toBeGreaterThan(0)
    expect(isOffline()).toBe(true)
  })

  it('Vite 代理回 502 → 同样回落', async () => {
    stubFetch(502, undefined)
    const res = await api.get<{ items: unknown[] }>('/v1/apps')
    expect(res.items.length).toBeGreaterThan(0)
  })

  it('应用列表是扁平结构，不是 proto 字面上的嵌套', async () => {
    stubFetchThrows()
    const res = await api.get<{ items: Record<string, unknown>[] }>('/v1/apps')
    const first = res.items[0]
    expect(first).toHaveProperty('appId')
    expect(first).toHaveProperty('recipeCount')
    expect(first).not.toHaveProperty('app') // 嵌套的话这里会有 app
  })

  it('图文配方不含视频/音频/演示类的专有字段', async () => {
    stubFetchThrows()
    const r = await api.get<{ generationSpec: Record<string, unknown> }>(
      '/v1/apps/mock-app-1/recipes/mock-recipe-1-1',
    )
    expect(r.generationSpec).toHaveProperty('targetWordCount')
    for (const k of ['durationSec', 'shotCount', 'slideCount', 'hostCount']) {
      expect(r.generationSpec).not.toHaveProperty(k)
    }
  })

  it('转就绪缺必填项时，一次返回全部缺失字段', async () => {
    stubFetchThrows()
    const err = await api
      .post<never>('/v1/apps/mock-app-1/recipes/mock-recipe-1-4/ready')
      .catch((e) => e as ApiError)
    expect(err.status).toBe(422)
    const fields = err.errors?.map((e) => e.field) ?? []
    expect(fields).toContain('generationSpec.targetAudience')
    expect(fields).toContain('generationSpec.creationGoal')
  })

  it('草稿配方不能被选中', async () => {
    stubFetchThrows()
    const err = await api
      .post<never>('/v1/apps/mock-app-1/recipes/mock-recipe-1-4/select')
      .catch((e) => e as ApiError)
    expect(err.status).toBe(409)
  })

  it('后端恢复后自动退出离线态', async () => {
    stubFetchThrows()
    await api.get('/v1/apps')
    expect(isOffline()).toBe(true)

    stubFetch(200, { items: [], total: 0 })
    await api.get('/v1/apps')
    expect(isOffline()).toBe(false)
  })
})
