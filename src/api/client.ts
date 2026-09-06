import type { ErrorBody, FieldError } from './types'

/** 网络层失败（请求根本没发出去 / 断网）用这个状态码占位。 */
export const NETWORK_ERROR_STATUS = 0

/** Vite 代理在后端没起来时回这些，不是后端的业务响应。 */
const BACKEND_DOWN_STATUSES = new Set([502, 503, 504])

/**
 * 演示数据兜底只在开发环境启用，且可用 VITE_DISABLE_MOCK=1 关掉。
 * **生产构建里这段是死代码，会被摇掉**——线上绝不能出现假数据。
 */
const MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DISABLE_MOCK !== '1'

/**
 * 后端地址。默认直连 `http://localhost:18080`（后端已开 CORS 白名单）。
 *
 * 留空则走同源相对路径 `/v1/...`，由 Vite 代理转发——同源部署或
 * 后端没配 CORS 时用这个。改 `.env.development` 里的 VITE_API_BASE 切换。
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

const toUrl = (path: string) => `${API_BASE}${path}`

// ---------- 离线（后端未启动）状态 ----------

let offline = false
const listeners = new Set<(v: boolean) => void>()

export const isOffline = () => offline
export function subscribeOffline(fn: (v: boolean) => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
function setOffline(next: boolean) {
  if (offline === next) return
  offline = next
  listeners.forEach((fn) => fn(next))
}

/**
 * 后端错误体统一包成这个。状态码即契约，不会出现 200 包着错误体。
 * 分发规则见 docs/设计方案.md §5.4。
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field?: string
  readonly errors?: FieldError[]

  constructor(status: number, body: Partial<ErrorBody>) {
    super(body.message || `请求失败（HTTP ${status}）`)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code ?? 'UNKNOWN'
    this.field = body.field
    this.errors = body.errors
  }

  /**
   * 能不能定位到具体输入框。
   * true = 交给表单标红，**不要弹提示条**——否则用户同时看到飘过的黑框
   * 和一堆红字，说的还是同一件事。
   */
  get isFormError(): boolean {
    return Boolean(this.field) || Boolean(this.errors?.length)
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * **动态导入**，不是顶层 import。
 *
 * mocks/server.ts 顶层就初始化了演示数据（模块副作用），静态导入的话
 * 打包器不敢删，假数据会跟着进生产产物。动态导入 + DEV 判定后，
 * 整个分支在生产构建里是死代码，会被完整摇掉——已用 grep 产物验证。
 */
async function fromMock<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const { MockError, handleMock } = await import('@/mocks/server')
  try {
    return handleMock(method, path, body) as T
  } catch (e) {
    if (e instanceof MockError) throw new ApiError(e.status, e.body)
    throw new ApiError(500, { code: 'MOCK_ERROR', message: '演示数据出错' })
  }
}

/**
 * **每次都先真调，失败才回落 mock。**
 * 不做"一旦离线就永久走 mock"，是为了后端启动后能自动切回真数据，
 * 用户不用刷新页面。代价是后端没起时每个请求多一次本地往返（约 1ms）。
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(toUrl(path), {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    if (MOCK_ENABLED) {
      setOffline(true)
      return fromMock<T>(method, path, body)
    }
    throw new ApiError(NETWORK_ERROR_STATUS, {
      code: 'NETWORK_ERROR',
      message: '网络连接失败，请检查后重试',
    })
  }

  if (MOCK_ENABLED && BACKEND_DOWN_STATUSES.has(res.status)) {
    setOffline(true)
    return fromMock<T>(method, path, body)
  }

  const text = await res.text()
  let data: unknown = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      if (res.ok) {
        throw new ApiError(res.status, {
          code: 'BAD_RESPONSE',
          message: '服务返回了无法解析的内容',
        })
      }
      // 错误响应体解析不了就退回空对象，让下面按状态码兜底
    }
  }

  // 真后端答上话了 → 退出离线模式
  setOffline(false)

  if (!res.ok) {
    throw new ApiError(res.status, (data ?? {}) as Partial<ErrorBody>)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
}

/**
 * 把后端的 DTO 字段路径转成 antd Form 的 namePath。
 * 'generationSpec.targetAudience' → ['generationSpec', 'targetAudience']
 * 数字段转成 number，以支持 'x.0.y' 这种数组下标路径。
 */
export function toNamePath(field: string): (string | number)[] {
  return field
    .split('.')
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg))
}
