import { useRef, useState } from 'react'
import { Drawer, Skeleton } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getRecipe } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { ProductionJob } from '@/api/types'
import { useEnums } from '@/hooks/useEnums'
import { useJobWatch } from '@/hooks/useJobWatch'
import CrewProgress from './crew/CrewProgress'
import { revisionCount } from './crew/derive'
import { JOB_STATUS } from './jobStatus'
import { secondsText } from './usage'
import ArticlePreview from './preview/ArticlePreview'
import NotePreview from './preview/NotePreview'
import ResultSide from './preview/ResultSide'
import { pickLayout, previewContent } from './preview/content'
import './preview/preview.css'

/** 生产详情：头部是成品标题，下面一排角色演生产过程，再往下左边成品预览、右边拿去用和过程。试产与生产记录共用。 */
export function JobDrawer({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { job, runs } = useJobWatch(jobId)
  // 「生产过程」展开没有，跟着任务走：换一个任务重新收起
  const [processFor, setProcessFor] = useState<string | null>(null)
  const processOpen = processFor !== null && processFor === jobId
  const setProcessOpen = (open: boolean) => setProcessFor(open ? jobId : null)
  const sideRef = useRef<HTMLDivElement>(null)
  const c = previewContent(job)

  const showProcess = () => {
    setProcessOpen(true)
    requestAnimationFrame(() => sideRef.current?.querySelector('.pv-fold:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  return (
    <Drawer
      open={Boolean(jobId)}
      onClose={onClose}
      size={1120}
      title={job ? <JobHeader job={job} title={c?.title} /> : '生产详情'}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {!job ? (
        <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
      ) : (
        <div className="pv">
          <div style={{ padding: '16px 24px 18px', borderBottom: '1px solid var(--line-2)' }}>
            <CrewProgress job={job} runs={runs} onShowProcess={showProcess} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', alignItems: 'start' }}>
            <div style={{ background: 'var(--paper)', padding: '28px 32px 64px', minHeight: 560, display: 'flex', justifyContent: 'center' }}>
              {c ? (c.layout === 'article' ? <ArticlePreview c={c} /> : <NotePreview c={c} />) : (
                <div className="pv-empty">{job.status === 'failed' || job.status === 'skipped' ? '这次没有成稿' : '成稿写出来后在这里预览'}</div>
              )}
            </div>
            <div style={{ alignSelf: 'stretch', borderLeft: '1px solid var(--line-2)' }}>
              <div ref={sideRef} style={{ position: 'sticky', top: 0, padding: 24 }}>
                <ResultSide job={job} runs={runs} c={c} processOpen={processOpen} onProcessToggle={setProcessOpen} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

/** 头部：成品标题是主角，下面一行灰字（版式 · 配方 · 主题 · 用时），右边一个状态。 */
function JobHeader({ job, title }: { job: ProductionJob; title?: string }) {
  const { label } = useEnums()
  const { data: recipe } = useQuery({
    queryKey: qk.recipe(job.appId, job.recipeId),
    queryFn: () => getRecipe(job.appId, job.recipeId),
    enabled: Boolean(job.appId && job.recipeId),
    staleTime: 60_000,
  })
  const total = job.steps.reduce((s, x) => s + x.costMs, 0)
  const revisions = revisionCount(job)
  const meta = [
    label('layout', pickLayout(job)),
    recipe?.name && `配方「${recipe.name}」`,
    job.topic && `主题：${job.topic}`,
    total > 0 && `${secondsText(total)}，${revisions ? `返修 ${revisions} 次` : '没有返修'}`,
  ].filter(Boolean) as string[]
  const status = job.status === 'success'
    ? { text: '已交付', fg: '#2E7D4F', bg: '#EAF4EE' }
    : job.status === 'failed'
      ? { text: '没跑成', fg: '#C2412D', bg: '#FBEDEA' }
      : { text: JOB_STATUS[job.status].label, fg: '#2C4E92', bg: '#EDF1F8' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title || job.topic || '生产详情'}
        </div>
        <div style={{ marginTop: 2, color: 'rgba(0,0,0,.42)', fontSize: 12.5, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {meta.join(' · ')}
        </div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 13, background: status.bg, color: status.fg, fontSize: 12.5, fontWeight: 500, flex: 'none' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
        {status.text}
      </span>
    </div>
  )
}
