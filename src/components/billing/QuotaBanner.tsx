import { useState } from 'react'
import { Alert, Button } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSpaceQuota } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { useSession } from '@/session/SessionContext'
import { expiresWithin, expiryDate, isLow } from './billing'

const todayKey = (what: string, spaceId: string) => `quota-banner:${what}:${spaceId}:${new Date().toDateString()}`

/** 工作台顶部：额度快用完、套餐 7 天内到期，各每天提醒一次（关掉当天不再出现）。 */
export default function QuotaBanner() {
  const { space, can } = useSession()
  const navigate = useNavigate()
  const { data: q } = useQuery({ queryKey: qk.quota(space.spaceId), queryFn: () => getSpaceQuota(space.spaceId) })
  const [, force] = useState(0)
  if (!q) return null

  const dismiss = (what: string) => { localStorage.setItem(todayKey(what, space.spaceId), '1'); force((n) => n + 1) }
  const hidden = (what: string) => localStorage.getItem(todayKey(what, space.spaceId)) === '1'
  const action = <Button size="small" type="link" onClick={() => navigate('/billing')}>查看用量</Button>

  if (isLow(q) && !hidden('low')) {
    return (
      <Alert type={q.left.total === 0 ? 'error' : 'warning'} showIcon closable onClose={() => dismiss('low')} action={action}
        style={{ marginBottom: 16 }}
        title={q.left.total === 0
          ? '这个空间的篇数用完了。接入自己的模型不受限制，或升级套餐。'
          : `还剩 ${q.left.total} 篇。接入自己的模型不受限制，或升级套餐。`} />
    )
  }
  if (can.manageMembers && expiresWithin(q, 7) && !hidden('expire')) {
    return (
      <Alert type="info" showIcon closable onClose={() => dismiss('expire')} action={action} style={{ marginBottom: 16 }}
        title={`${q.plan.name}将于 ${expiryDate(q.plan.expiresAt!)} 到期，到期后回到免费版。续费请联系我们。`} />
    )
  }
  return null
}
