/**
 * 提示词变量：{{主题}} 之外的 {{名字}}（如 {{商品名}}），每次试产 / 生产时填值。
 * 与后端 RenderPrompt 的替换规则一致：名字去掉首尾空白，花括号里为空的不算。
 */
export function findVariables(...texts: (string | undefined)[]): string[] {
  const out: string[] = []
  for (const t of texts) {
    for (const m of (t ?? '').matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
      const name = m[1]
      if (name && name !== '主题' && !out.includes(name)) out.push(name)
    }
  }
  return out
}
