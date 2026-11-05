import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { App, Button, Checkbox, Input, Select, Skeleton, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRecipe, listCapabilities, listJobs, listRecipes, submitJob } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { JobDrawer } from '@/components/JobView'
import { DONE } from '@/components/jobStatus'
import { UNTITLED, jobArticle } from '@/components/jobArtifacts'
import MarkdownView from '@/components/MarkdownView'
import { JOB_STEP_LABEL } from '@/constants/stage'
import { useApiError } from '@/hooks/useApiError'
import { useJobWatch } from '@/hooks/useJobWatch'
import { brand } from '@/theme'
import { formatShortDateTime } from '@/utils/time'
import { groupComparisons } from './history'

/**
 * 对比试产（内部工具，入口是配方列表右上角的文字链接）：/apps/:appId/recipes/compare
 * 同一个主题，几份配方各产一篇，并排看。用来验证技能、MCP、联网各自带来什么。
 * 历史对比不另存：从生产记录里按「同一主题、一分钟内发起」认出来（见 history.ts）。
 */

const MAX = 4

interface Run {
  topic: string
  jobs: Record<string, string> // recipeId → jobId
}

export default function ComparePage() {
  const { appId = '' } = useParams()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const handleError = useApiError()
  const { data: list, isLoading } = useQuery({ queryKey: qk.recipes(appId), queryFn: () => listRecipes(appId) })
  const ready = (list?.items ?? []).filter((r) => r.status === 'ready').sort((a, b) => a.name.localeCompare(b.name, 'zh'))

  const { data: jobs } = useQuery({ queryKey: qk.jobs({ appId, limit: 100 }), queryFn: () => listJobs({ appId, limit: 100 }) })
  const history = useMemo(() => groupComparisons(jobs?.items ?? []), [jobs])

  // ?recipes=a,b,c 打开时预选、开一次新对比；否则默认看最近一次对比
  const [params] = useSearchParams()
  const fromUrl = (params.get('recipes') ?? '').split(',').filter(Boolean)
  const [chosen, setChosen] = useState<Run | null | undefined>(fromUrl.length ? null : undefined) // undefined = 跟随最近一次
  const run = chosen === undefined ? (history[0] ?? null) : chosen
  const [pickedState, setPicked] = useState<string[] | null>(fromUrl.length ? fromUrl : null)
  const picked = pickedState ?? (run ? Object.keys(run.jobs) : [])
  const [topicState, setTopic] = useState<string | null>(null)
  const topic = topicState ?? run?.topic ?? ''
  const [viewing, setViewing] = useState<string | null>(null)
  const setRun = (r: Run | null) => setChosen(r)

  const start = useMutation({
    mutationFn: async () => {
      const jobs = await Promise.all(picked.map((recipeId) => submitJob({ appId, recipeId, subjectId: 'compare', topic: topic.trim() })))
      return { topic: topic.trim(), jobs: Object.fromEntries(picked.map((id, i) => [id, jobs[i].jobId])) }
    },
    onSuccess: (r) => {
      setRun(r)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      message.success('已开始，这一组会出现在「历史对比」里')
    },
    onError: (e) => handleError(e),
  })

  if (isLoading) return <Skeleton active />

  const canStart = topic.trim() !== '' && picked.length >= 2
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>对比试产</Typography.Title>
        {history.length > 0 && (
          <Select
            size="small"
            style={{ width: 240 }}
            placeholder="历史对比"
            value={run && history.some((g) => historyKey(g) === historyKey(run)) ? historyKey(run) : undefined}
            onChange={(k) => {
              const g = history.find((x) => historyKey(x) === k)
              if (!g) return
              setRun(g)
              setPicked(Object.keys(g.jobs))
              setTopic(g.topic)
            }}
            options={history.map((g) => ({
              value: historyKey(g),
              label: `${g.topic} · ${formatShortDateTime(g.createdAt)} · ${Object.keys(g.jobs).length} 份`,
            }))}
          />
        )}
        <Input
          style={{ width: 320, marginLeft: 'auto' }}
          placeholder="主题"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onPressEnter={() => canStart && start.mutate()}
        />
        <Button type="primary" disabled={!canStart} loading={start.isPending} onClick={() => start.mutate()}>
          一起试产
        </Button>
      </div>

      <Checkbox.Group
        value={picked}
        onChange={(v) => {
          setPicked((v as string[]).slice(0, MAX))
          setRun(null)
        }}
        style={{ marginBottom: 20, rowGap: 6 }}
        options={ready.map((r) => ({ value: r.recipeId, label: r.name, disabled: picked.length >= MAX && !picked.includes(r.recipeId) }))}
      />

      {picked.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${picked.length}, minmax(0, 1fr))`, gap: 16, alignItems: 'start' }}>
          {/* 栏的顺序跟勾选框一致（按名字），不跟勾选先后 */}
          {ready.filter((r) => picked.includes(r.recipeId)).map(({ recipeId: rid }) => (
            <Column key={rid} appId={appId} recipeId={rid} jobId={run?.jobs[rid] ?? null} onOpen={setViewing} />
          ))}
        </div>
      )}
      <JobDrawer jobId={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

const historyKey = (g: Run) => Object.values(g.jobs).sort().join(',')

function Column({ appId, recipeId, jobId, onOpen }: {
  appId: string
  recipeId: string
  jobId: string | null
  onOpen: (jobId: string) => void
}) {
  const { data: recipe } = useQuery({ queryKey: qk.recipe(appId, recipeId), queryFn: () => getRecipe(appId, recipeId) })
  const { data: caps } = useQuery({ queryKey: qk.capabilities({}), queryFn: () => listCapabilities({}) })
  const { job, runs } = useJobWatch(jobId)

  const names = [...new Set(Object.values(recipe?.aiSetting?.grants ?? {}).flat())]
    .map((id) => caps?.items.find((c) => c.capabilityId === id)?.name ?? id)
  const done = Boolean(job && DONE.includes(job.status))
  const article = jobArticle(job)
  const body = article.body
  const step = (JOB_STEP_LABEL as Partial<Record<string, string>>)[job?.currentStep ?? '']
  const seconds = Math.round(runs.reduce((s, r) => s + r.costMs, 0) / 1000)

  return (
    <section style={{ background: '#fff', border: `1px solid ${brand.line}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Typography.Text strong>{recipe?.name ?? '…'}</Typography.Text>
        {done && (job?.status === 'success'
          ? <Tag color="success" style={{ marginLeft: 'auto', marginInlineEnd: 0 }}>已交付</Tag>
          : <Tag color="error" style={{ marginLeft: 'auto', marginInlineEnd: 0 }}>未交付</Tag>)}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>带了：{names.join('、') || '无'}</Typography.Text>

      <div style={{ marginTop: 12, minHeight: 80 }}>
        {!jobId && null}
        {jobId && !done && <Typography.Text type="secondary">正在{step ?? '排队'}…</Typography.Text>}
        {done && (body ? (
          <>
            <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>{article.title || UNTITLED}</Typography.Text>
            <div style={{ fontSize: 13.5, color: '#3a3a3c' }}><MarkdownView text={body} /></div>
          </>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>没写出来</Typography.Text>
        ))}
      </div>

      {done && (
        <div style={{ display: 'flex', marginTop: 12, fontSize: 12, color: 'rgba(0,0,0,.45)', fontVariantNumeric: 'tabular-nums' }}>
          {seconds} 秒
          <Button type="link" size="small" style={{ marginLeft: 'auto', padding: 0, height: 'auto' }} onClick={() => onOpen(jobId!)}>
            看全文
          </Button>
        </div>
      )}
    </section>
  )
}
