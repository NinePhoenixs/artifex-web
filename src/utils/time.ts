/** 后端返回 ISO 8601 带时区，直接能 new Date()。 */

const pad = (n: number) => String(n).padStart(2, '0')

/** 2026-11-05 09:30。空值、解析不了的显示「—」。 */
export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 今天的只显示「今天 09:30」，其余显示「11月5日 09:30」。 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.toDateString() === new Date().toDateString() ? `今天 ${hm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

/** 11-5 09:30：下拉框里放得下，不分今天与否。 */
export function formatShortDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
