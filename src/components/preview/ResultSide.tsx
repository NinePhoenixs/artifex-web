import { useState, type ReactNode } from 'react'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import { App, Button, Modal } from 'antd'
import { jobImagesZipUrl } from '@/api/endpoints'
import type { AiRun, ProductionJob } from '@/api/types'
import { stepResults } from '@/components/jobArtifacts'
import RunTrace from '@/components/RunTrace'
import { sumUsage, usageText } from '@/components/usage'
import { CREW } from '@/components/crew/characters'
import { CREW_OF, type CrewStep, clock, friendlyError, isRevision } from '@/components/crew/derive'
import { type PreviewContent, absUrl, articleHtml, articleMarkdown, noteText, topicsText } from './content'

/** 成品右侧：拿去用、检查、资料、生产过程。 */
export default function ResultSide({ job, runs, c, processOpen, onProcessToggle }: {
  job: ProductionJob
  runs: AiRun[]
  c: PreviewContent | null
  /** 生产过程这一块展开没有（窄带上的「看生产过程」会把它打开） */
  processOpen: boolean
  onProcessToggle: (open: boolean) => void
}) {
  const report = stepResults(job, 'review_report').at(-1)?.content
  const materials = stepResults(job, 'material_list').at(-1)?.content.items ?? []
  const [refsOpen, setRefsOpen] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const passed = report ? report.items.filter((i) => i.passed).length : 0

  return (
    <div className="pv-side">
      {c && (
        <section className="block">
          <div className="label">拿去用</div>
          {c.layout === 'article' ? <ArticleActions job={job} c={c} /> : <NoteActions job={job} c={c} />}
        </section>
      )}

      {report && (
        <section className="block">
          <div className="label">
            检查
            <span className={`pv-pill${report.passed ? '' : ' bad'}`}>{passed} / {report.items.length} 通过</span>
          </div>
          <ul className="pv-check">
            {report.items.map((it, i) => (
              <li key={i} className={it.passed ? '' : 'bad'}>
                {it.text}
                {!it.passed && (it.reason || it.quote) && <small>{it.reason}{it.quote && ` 原句「${it.quote}」`}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {materials.length > 0 && (
        <Fold title="资料" aside={`${materials.length} 条`} open={refsOpen} onToggle={setRefsOpen}>
          <ul className="pv-refs">
            {materials.map((m) => (
              <li key={m.no}>
                {m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.title || m.url}</a> : m.title}
                <small>{[hostOf(m.url), m.publishedAt].filter(Boolean).join(' · ')}</small>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {job.steps.length > 0 && (
        <Fold title="生产过程" aside={processAside(runs)} open={processOpen} onToggle={onProcessToggle}>
          <ul className="pv-steps">
            {job.steps.map((s, i) => {
              const crew = s.step in CREW_OF ? CREW[CREW_OF[s.step as CrewStep]].name : '决策'
              const revision = isRevision(s)
              const what = s.status === 'running' ? '进行中'
                : revision ? '没过，退回去改'
                  : s.status === 'failed' ? clip(friendlyError(s.errorMsg ?? '') || '没做成', 60)
                    : s.attempt > 1 ? `第 ${s.attempt} 次 · 完成` : '完成'
              return (
                <li key={i} className={s.status === 'running' ? 'now' : s.status === 'failed' && !revision ? 'bad' : ''}>
                  <b>{crew}</b><span>{what}</span><span className="t">{s.status === 'running' ? '' : clock(s.costMs)}</span>
                </li>
              )
            })}
          </ul>
          {runs.length > 0 && <button type="button" className="pv-more" onClick={() => setTraceOpen(true)}>看 AI 每一步做了什么 ›</button>}
        </Fold>
      )}

      <Modal open={traceOpen} onCancel={() => setTraceOpen(false)} footer={null} width={760} title="AI 每一步做了什么" destroyOnHidden>
        <RunTrace runs={runs} />
      </Modal>
    </div>
  )
}

function NoteActions({ job, c }: { job: ProductionJob; c: PreviewContent }) {
  const copy = useCopy()
  return (
    <div className="actions">
      <Button type="primary" size="large" icon={<CopyOutlined />} onClick={() => copy(noteText(c), '已复制标题 + 正文 + 话题')}>复制文案</Button>
      <div className="row2">
        <Button onClick={() => copy(c.title, '已复制标题')}>复制标题</Button>
        <Button disabled={!c.tags.length} onClick={() => copy(topicsText(c.tags), '已复制话题')}>复制话题</Button>
      </div>
      <Button icon={<DownloadOutlined />} disabled={!c.delivered || !c.files.length} href={jobImagesZipUrl(job.jobId)}>
        下载图片{c.files.length ? ` · ${c.files.length} 张` : ''}
      </Button>
      <p className="tip">文案连标题和话题一起复制，粘进小红书正文即可</p>
    </div>
  )
}

function ArticleActions({ job, c }: { job: ProductionJob; c: PreviewContent }) {
  const { message } = App.useApp()
  const copyRich = async () => {
    const md = articleMarkdown(c, (f) => absUrl(f))
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([articleHtml(c, (f) => absUrl(f))], { type: 'text/html' }),
          'text/plain': new Blob([md], { type: 'text/plain' }),
        })])
      } else {
        await navigator.clipboard.writeText(md)
      }
      message.success('已复制全文（带格式和图），可以直接粘进公众号编辑器')
    } catch {
      message.error('复制失败，浏览器没给剪贴板权限')
    }
  }
  const exportMd = () => {
    const blob = new Blob([articleMarkdown(c, (f) => absUrl(f))], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(c.title || '成稿').replace(/[\\/:*?"<>|]/g, '')}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="actions">
      <Button type="primary" size="large" icon={<CopyOutlined />} onClick={copyRich}>复制全文</Button>
      <div className="row2">
        <Button onClick={exportMd}>导出 Markdown</Button>
        <Button icon={<DownloadOutlined />} disabled={!c.delivered || !c.files.length} href={jobImagesZipUrl(job.jobId)}>下载图片</Button>
      </div>
      <p className="tip">带格式和图复制，粘进公众号编辑器即可</p>
    </div>
  )
}

function useCopy() {
  const { message } = App.useApp()
  return async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(ok)
    } catch {
      message.error('复制失败，浏览器没给剪贴板权限')
    }
  }
}

function Fold({ title, aside, open, onToggle, children }: {
  title: string; aside?: string; open: boolean; onToggle: (v: boolean) => void; children: ReactNode
}) {
  return (
    <section className={`block pv-fold${open ? ' open' : ''}`}>
      <button type="button" onClick={() => onToggle(!open)} aria-expanded={open}>
        {title}{aside && <span className="aside">{aside}</span>}
        <svg className="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3l5 5-5 5" /></svg>
      </button>
      <div className="inner">{children}</div>
    </section>
  )
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function hostOf(url: string): string {
  try { return url ? new URL(url).host : '' } catch { return '' }
}

/** 生产过程那一行的小字：还没有一步做完时写「进行中」，不显示 0 秒 0 token。 */
function processAside(runs: Parameters<typeof sumUsage>[0]) {
  const u = sumUsage(runs)
  return u.tokens === 0 && u.ms === 0 ? '进行中' : usageText(u)
}
