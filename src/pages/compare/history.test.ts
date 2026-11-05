import { describe, expect, it } from 'vitest'
import type { JobListItem } from '@/api/types'
import { groupComparisons } from './history'

const job = (jobId: string, recipeId: string, topic: string, at: string): JobListItem =>
  ({ jobId, recipeId, topic, createdAt: at, appId: 'a', status: 'success', currentStep: 'delivery', title: '', updatedAt: at })

describe('groupComparisons', () => {
  it('同一主题、一分钟内、不同配方算一组；单篇试产不算；新的在前', () => {
    const groups = groupComparisons([
      job('j1', 'r1', 'iPhone Duo', '2026-11-01T18:40:00+08:00'),
      job('j2', 'r2', 'iPhone Duo', '2026-11-01T18:40:01+08:00'),
      job('j3', 'r3', '黄仁勋', '2026-11-01T17:00:00+08:00'),
      job('j4', 'r1', '黄仁勋', '2026-11-01T17:00:02+08:00'),
      job('j5', 'r1', '沙发毯', '2026-11-01T16:00:00+08:00'),
      job('j6', 'r1', 'iPhone Duo', '2026-11-01T18:45:00+08:00'),
    ])
    expect(groups.map((g) => g.topic)).toEqual(['iPhone Duo', '黄仁勋'])
    expect(groups[0].jobs).toEqual({ r1: 'j1', r2: 'j2' })
  })
})
