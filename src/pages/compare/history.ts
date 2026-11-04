import type { JobListItem } from '@/api/types'

/** 一次对比：同一个主题、几份配方几乎同时发起的几篇生产。 */
export interface CompareGroup {
  topic: string
  createdAt: string
  jobs: Record<string, string> // recipeId → jobId
}

/** 同一主题、前后不超过这么久发起的，算同一次对比。 */
const WINDOW_MS = 60_000

/**
 * 从生产记录里认出历史对比：同一主题、一分钟内、至少两份不同配方。新的在前。
 * 不另存对比记录——生产本身已经落库，按时间和主题就能还原出哪几篇是一组。
 */
export function groupComparisons(items: JobListItem[]): CompareGroup[] {
  const sorted = [...items].filter((j) => j.topic).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const groups: CompareGroup[] = []
  let cur: CompareGroup | null = null
  for (const j of sorted) {
    const t = Date.parse(j.createdAt)
    if (cur && cur.topic === j.topic && t - Date.parse(cur.createdAt) <= WINDOW_MS && !cur.jobs[j.recipeId]) {
      cur.jobs[j.recipeId] = j.jobId
      continue
    }
    cur = { topic: j.topic, createdAt: j.createdAt, jobs: { [j.recipeId]: j.jobId } }
    groups.push(cur)
  }
  return groups.filter((g) => Object.keys(g.jobs).length >= 2).reverse()
}
