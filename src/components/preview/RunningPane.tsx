import type { AiRun, Layout, ProductionJob } from '@/api/types'
import { activityOf, hms } from './activity'

/**
 * 还没有成稿时的预览区：左边是成品的骨架（手机 / 阅读页），让人知道最后会长什么样；
 * 上面一张「正在做什么」，按时间列出 AI 每一步做的事，最新的在上。
 */
export default function RunningPane({ job, runs, layout, ended }: { job: ProductionJob; runs: AiRun[]; layout: Layout; ended: boolean }) {
  const items = activityOf(job, runs)
  return (
    <div className="pv-running">
      <section className="pv-activity">
        <div className="head">
          {ended ? '这次没有成稿，下面是 AI 做过的事' : '正在做什么'}
          {!ended && <span className="live" aria-hidden />}
        </div>
        {items.length === 0 ? (
          <p className="none">{ended ? 'AI 还没来得及做事' : '刚开始，AI 马上动手'}</p>
        ) : (
          <ol>
            {items.slice(0, 12).map((a, i) => (
              <li key={a.key} className={`${i === 0 && !ended ? 'now' : ''}${a.failed ? ' bad' : ''}`}>
                <b>{a.who}</b>
                <span>{a.text}</span>
                <time>{hms(a.at)}</time>
              </li>
            ))}
          </ol>
        )}
        {items.length > 12 && <p className="more">还有 {items.length - 12} 条更早的，见右边「生产过程」</p>}
      </section>
      {!ended && (layout === 'article' ? <ArticleSkeleton /> : <NoteSkeleton />)}
    </div>
  )
}

function NoteSkeleton() {
  return (
    <div className="pv-phone pv-skel" aria-label="小红书笔记的样子，写好后在这里预览">
      <div className="top"><span className="avatar" /><i style={{ width: 72 }} /></div>
      <div className="img" />
      <div className="pv-note">
        <i style={{ width: '70%', height: 16 }} />
        {[92, 86, 60, 90, 74].map((w, k) => <i key={k} style={{ width: `${w}%` }} />)}
      </div>
    </div>
  )
}

function ArticleSkeleton() {
  return (
    <div className="pv-article-col">
      <div className="pv-article pv-skel" aria-label="文章的样子，写好后在这里预览">
        <i style={{ width: '64%', height: 22 }} />
        <div className="img" />
        {[96, 88, 92, 54].map((w, k) => <i key={k} style={{ width: `${w}%` }} />)}
        <i style={{ width: '38%', height: 16, marginTop: 24 }} />
        {[90, 84, 70].map((w, k) => <i key={k} style={{ width: `${w}%` }} />)}
      </div>
    </div>
  )
}
