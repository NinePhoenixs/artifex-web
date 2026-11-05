import { useState } from 'react'
import { markdownToPlain } from '@/components/MarkdownView'
import { imageUrl } from '@/components/jobArtifacts'
import { type PreviewContent, topicsText } from './content'

/** 小红书笔记：手机里的样子。图在上能左右翻，下面标题、正文、话题。 */
export default function NotePreview({ c }: { c: PreviewContent }) {
  const [pick, setI] = useState(0)
  const n = c.files.length
  const i = Math.min(pick, Math.max(0, n - 1))
  const go = (k: number) => setI(n ? (k + n) % n : 0)
  const paragraphs = markdownToPlain(c.body).split(/\n{2,}/).filter((p) => p.trim())

  return (
    <div>
      <div className="pv-cap">手机预览{!c.delivered && <span>· 还没交付，这是最新一稿</span>}</div>
      <div className="pv-phone">
        <div className="top"><span className="avatar" /><span>你的账号</span></div>
        <div className="pv-carousel">
          {n ? (
            <>
              <div className="track" style={{ transform: `translateX(-${i * 100}%)` }}>
                {c.files.map((f) => <img key={f.no} src={imageUrl(f)} alt={f.caption ?? ''} />)}
              </div>
              <span className="count">{i + 1}/{n}</span>
              {n > 1 && (
                <>
                  <button type="button" className="nav prev" aria-label="上一张" onClick={() => go(i - 1)}>‹</button>
                  <button type="button" className="nav next" aria-label="下一张" onClick={() => go(i + 1)}>›</button>
                </>
              )}
            </>
          ) : (
            <div className="noimg">{c.delivered ? '这篇没有配图' : '图还没画'}</div>
          )}
        </div>
        {n > 1 && <div className="pv-dots">{c.files.map((f, k) => <i key={f.no} className={k === i ? 'on' : ''} />)}</div>}
        <div className="pv-note">
          <h2>{c.title || '（无标题）'}</h2>
          {paragraphs.map((p, k) => <p key={k}>{p}</p>)}
          {c.tags.length > 0 && <p className="topics">{topicsText(c.tags)}</p>}
          <div className="date">预览 · 还没发布</div>
        </div>
      </div>
    </div>
  )
}
