import { App, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'

/**
 * 发起生产时额度用完（402 QUOTA_EXCEEDED）：弹窗引导去接自己的模型或看套餐。
 * 返回 true 表示已处理，调用方不用再报错。
 */
export function useQuotaExceeded() {
  const { modal } = App.useApp()
  const navigate = useNavigate()
  return (err: unknown) => {
    if (!(err instanceof ApiError) || err.code !== 'QUOTA_EXCEEDED') return false
    const m = modal.confirm({
      title: '额度用完了',
      content: (
        <>
          这份配方用的是平台提供的模型，这个空间的篇数已经用完。接入自己的模型后不受限制：在「能力中心 · 模型」填上厂商密钥，再把 Agent 的模型换成它。也可以
          <Typography.Link onClick={() => { m.destroy(); navigate('/billing') }}>升级套餐</Typography.Link>。
        </>
      ),
      okText: '去接入模型',
      cancelText: '知道了',
      onOk: () => navigate('/capabilities/models'),
    })
    return true
  }
}
