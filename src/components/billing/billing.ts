import type { LedgerKind, Quota } from '@/api/types'

/** 流水类型的中文 */
export const LEDGER_LABEL: Record<LedgerKind, string> = {
  consume: '生产扣减',
  refund: '生产退回',
  activate: '开通套餐',
  reset: '每月重置',
  bonus: '赠送',
  expire: '套餐到期',
  trial: '试用发放',
  adjust: '调整',
}

/** 剩几篇时开始提醒 */
export const LOW_QUOTA = 3

/** 额度快用完：不限篇数的不提醒 */
export const isLow = (q: Quota) => !q.plan.unlimited && q.left.total <= LOW_QUOTA

/** 套餐 N 天内到期 */
export function expiresWithin(q: Quota, days: number) {
  if (!q.plan.expiresAt) return false
  const ms = new Date(q.plan.expiresAt).getTime() - Date.now()
  return ms > 0 && ms <= days * 86_400_000
}

/** 到期日显示：后端存的是「那天结束」= 次日 0 点，显示时退回一天 */
export function expiryDate(iso: string) {
  const d = new Date(new Date(iso).getTime() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 2026-12-15 这样的日期 */
export function day(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
