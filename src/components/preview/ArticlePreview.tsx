import type { ReactNode } from 'react'
import type { JobFile } from '@/api/types'
import { imageUrl } from '@/components/jobArtifacts'
import { type Block, type PreviewContent, headImage, parseBlocks, topicsText, trailingImages, wordCount } from './content'

/** 文章：阅读页的样子。头图、小标题、表格、列表、引用，配图插在正文里。 */
export default function ArticlePreview({ c }: { c: PreviewContent }) {
  const byNo = new Map(c.files.map((f) => [f.no, f]))
  const head = headImage(c.files)
  const words = wordCount(c.body)
  const pictures = c.files.length

  return (
    <div className="pv-article-col">
      <div className="pv-cap">
        阅读预览<span>约 {words} 字{pictures ? ` · ${pictures} 张配图` : ''}</span>
        {!c.delivered && <span>· 还没交付，这是最新一稿</span>}
      </div>
      <article className="pv-article">
        <h1>{c.title || '（无标题）'}</h1>
        <div className="byline">读完约 {Math.max(1, Math.round(words / 400))} 分钟</div>
        {head && <Figure f={head} />}
        {parseBlocks(c.body).map((b, i) => <BlockView key={i} b={b} byNo={byNo} />)}
        {trailingImages(c).map((f) => <Figure key={f.no} f={f} />)}
        {c.tags.length > 0 && <div className="tags">{topicsText(c.tags)}</div>}
      </article>
    </div>
  )
}

function BlockView({ b, byNo }: { b: Block; byNo: Map<number, JobFile> }) {
  switch (b.type) {
    case 'h': {
      const H = `h${b.level}` as 'h2' | 'h3' | 'h4'
      return <H>{inline(b.text)}</H>
    }
    case 'p': return <p>{inline(b.text)}</p>
    case 'quote': return <blockquote>{inline(b.text)}</blockquote>
    case 'ul': return <ul>{b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</ul>
    case 'ol': return <ol>{b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</ol>
    case 'table':
      return (
        <table>
          <tbody>
            {b.rows.map((r, ri) => <tr key={ri}>{r.map((x, ci) => <td key={ci}>{inline(x)}</td>)}</tr>)}
          </tbody>
        </table>
      )
    case 'img': {
      const f = byNo.get(b.no)
      // 还没画的图先留个位置
      return f ? <Figure f={f} alt={b.alt} /> : (
        <figure><div className="hole">这里会放一张图：{b.alt || `第 ${b.no} 张`}</div></figure>
      )
    }
  }
}

function Figure({ f, alt }: { f: JobFile; alt?: string }) {
  const cap = alt || f.caption
  return (
    <figure>
      <img src={imageUrl(f)} alt={cap ?? ''} />
      {cap && <figcaption>{cap}</figcaption>}
    </figure>
  )
}

/** 行内：**加粗**、`代码`。按文本渲染，不用 innerHTML。 */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return <span key={i}>{part}</span>
  })
}
