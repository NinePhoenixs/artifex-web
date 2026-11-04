/**
 * 用量怎么显示：token 和用时照实显示；钱只在真的花了钱时显示（免费、包月的模型花费为 0，不显示「0 元」）。
 * 钱精确到分，不到一分写「不到 1 分钱」。
 */
export interface Usage {
  tokens: number
  /** 元 */
  cost: number
  ms: number
}

export function costText(cost: number): string {
  if (!(cost > 0)) return ''
  return cost < 0.01 ? '不到 1 分钱' : `${cost.toFixed(2)} 元`
}

export function secondsText(ms: number): string {
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)} 秒` : `${Math.floor(s / 60)} 分 ${Math.round(s % 60)} 秒`
}

export function usageText(u: Usage): string {
  return [secondsText(u.ms), `${u.tokens.toLocaleString()} token`, costText(u.cost)].filter(Boolean).join(' · ')
}

export function sumUsage(runs: { inputTokens: number; outputTokens: number; cost: string | number; costMs: number }[]): Usage {
  return runs.reduce(
    (s, r) => ({ tokens: s.tokens + r.inputTokens + r.outputTokens, cost: s.cost + Number(r.cost), ms: s.ms + r.costMs }),
    { tokens: 0, cost: 0, ms: 0 },
  )
}
