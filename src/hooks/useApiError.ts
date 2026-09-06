import { App } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ApiError, NETWORK_ERROR_STATUS } from '@/api/client'

/**
 * 错误分发，规则见 docs/设计方案.md §5.4。
 *
 * 核心一条：**带 field / errors[] 的错误直接返回，不弹提示条**——
 * 那些交给表单标红。否则用户同时看到飘过的黑框和一堆红字，说的还是同一件事。
 */
export function useApiError() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  return (err: unknown, opts?: { onNotFound?: () => void }) => {
    if (!(err instanceof ApiError)) {
      message.error('发生未知错误，请重试')
      return
    }

    // 能定位到输入框 → 表单负责，这里什么都不做
    if (err.isFormError) return

    if (err.status === 404) {
      message.error(err.message)
      if (opts?.onNotFound) opts.onNotFound()
      else navigate('/apps')
      return
    }

    if (err.status === NETWORK_ERROR_STATUS) {
      message.error(err.message)
      return
    }

    // 5xx 不展示技术细节
    if (err.status >= 500) {
      message.error('服务异常，请稍后重试')
      return
    }

    // 4xx（含 409 业务冲突）：后端 message 是可直接展示的中文
    message.error(err.message)
  }
}
