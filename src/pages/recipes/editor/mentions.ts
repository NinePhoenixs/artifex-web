/**
 * 提示词里的「@名称」= 点名一个能力，这一步必须用它。规则与后端 domain.FindMentions 一致：
 * 名称可以带空格，所以在每个 @ 处拿已知名称做最长前缀匹配；邮箱这类 @ 前紧挨字母数字的不算。
 */
export function findMentions(text: string, names: string[]): string[] {
  const known = names.map((n) => n.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  const out: string[] = []
  const chars = Array.from(text)
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== '@' || (i > 0 && /[A-Za-z0-9._]/.test(chars[i - 1]))) continue
    const rest = chars.slice(i + 1).join('')
    const hit = known.find((n) => rest.startsWith(n))
    if (!hit) continue
    if (!out.includes(hit)) out.push(hit)
    i += Array.from(hit).length
  }
  return out
}

/** 一段提示词按点名切开：name 有值的片段是「@名称」（含 @），其余是普通文字。规则同 findMentions。 */
export function splitMentions(text: string, names: string[]): { text: string; name?: string }[] {
  const known = names.map((n) => n.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  const out: { text: string; name?: string }[] = []
  const chars = Array.from(text)
  let plain = ''
  for (let i = 0; i < chars.length; i++) {
    const hit = chars[i] === '@' && !(i > 0 && /[A-Za-z0-9._]/.test(chars[i - 1]))
      ? known.find((n) => chars.slice(i + 1).join('').startsWith(n))
      : undefined
    if (!hit) {
      plain += chars[i]
      continue
    }
    if (plain) out.push({ text: plain })
    plain = ''
    out.push({ text: '@' + hit, name: hit })
    i += Array.from(hit).length
  }
  if (plain) out.push({ text: plain })
  return out
}
