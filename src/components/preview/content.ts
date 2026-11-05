import { apiUrl } from '@/api/client'
import type { JobFile, Layout, ProductionJob } from '@/api/types'
import { stepResults } from '@/components/jobArtifacts'
import { markdownToPlain } from '@/components/MarkdownView'

/** 成品预览要的东西：交付了取交付物，没交付取最新一稿（和已经画好的图）。 */
export interface PreviewContent {
  layout: Layout
  title: string
  body: string
  tags: string[]
  /** 按序号排；文章版第 1 张是头图 */
  files: JobFile[]
  delivered: boolean
}

/** 版式：交付物上记着；还没交付用生产时配方的版式；都没有（早期的任务）按小红书笔记。 */
export function pickLayout(job: ProductionJob): Layout {
  return job.deliverable?.content.layout ?? job.recipeSnapshot?.layout ?? 'note'
}

export function previewContent(job: ProductionJob | undefined): PreviewContent | null {
  if (!job) return null
  const layout = pickLayout(job)
  const d = job.deliverable
  if (d) {
    const c = d.content
    return { layout, title: c.title, body: c.body, tags: c.tags ?? [], files: sortFiles(d.files), delivered: true }
  }
  const draft = stepResults(job, 'article_draft').at(-1)?.content
  if (!draft) return null
  const images = stepResults(job, 'image_set').at(-1)
  return { layout, title: draft.title, body: draft.body, tags: draft.tags ?? [], files: sortFiles(images?.files ?? []), delivered: false }
}

const sortFiles = (files: JobFile[]) => [...files].sort((a, b) => a.no - b.no)

/** 文件的完整地址（复制到外部编辑器、导出 Markdown 时要用完整地址）。 */
export function absUrl(f: JobFile, base = window.location.href): string {
  return new URL(apiUrl(f.url), base).href
}

// ---------- 正文按块解析：预览和导出共用一份 ----------

export type Block =
  | { type: 'h'; level: 2 | 3 | 4; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'img'; no: number; alt: string }

const IMAGE = /!\[([^\]]*)\]\(image:(\d+)\)/g
const LIST = /^\s*([-*·•]|\d+[.、)])\s+(.*)$/

/** Markdown 正文 → 块。只认成稿会用到的写法：标题、段落、列表、表格、引用、放图。 */
export function parseBlocks(body: string): Block[] {
  const out: Block[] = []
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      out.push({ type: 'h', level: Math.min(Math.max(h[1].length, 2), 4) as 2 | 3 | 4, text: h[2].trim() })
      continue
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      i--
      out.push({ type: 'table', rows })
      continue
    }
    if (line.trim().startsWith('>')) {
      const parts: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) parts.push(lines[i++].trim().replace(/^>\s?/, ''))
      i--
      out.push({ type: 'quote', text: parts.join('\n') })
      continue
    }
    if (LIST.test(line)) {
      const ordered = /^\s*\d/.test(line)
      const items: string[] = []
      while (i < lines.length && LIST.test(lines[i])) items.push(LIST.exec(lines[i++])![2])
      i--
      out.push({ type: ordered ? 'ol' : 'ul', items })
      continue
    }
    // 段落：其中的放图拆成单独的图，文字留下
    const imgs = [...line.matchAll(IMAGE)].map((m) => ({ type: 'img' as const, alt: m[1], no: Number(m[2]) }))
    const text = line.replace(IMAGE, '').trim()
    if (text) out.push({ type: 'p', text })
    out.push(...imgs)
  }
  return out
}

/** 正文里引用了哪几张图（序号）。 */
export function referencedImages(body: string): number[] {
  return [...body.matchAll(IMAGE)].map((m) => Number(m[2]))
}

/** 文章版：头图（第 1 张）。 */
export const headImage = (files: JobFile[]) => files.find((f) => f.no === 1)

/** 文章版：正文没引用到的配图（早期的成品、或 AI 没标位置），放到文末。 */
export function trailingImages(c: PreviewContent): JobFile[] {
  const used = new Set(referencedImages(c.body))
  return c.files.filter((f) => f.no !== 1 && !used.has(f.no))
}

// ---------- 拿去用 ----------

export const topicsText = (tags: string[]) => tags.map((t) => `#${t.replace(/^[#＃]+/, '')}`).join(' ')

/** 小红书：标题 + 正文 + 话题，纯文本，粘进小红书正文即可。 */
export function noteText(c: Pick<PreviewContent, 'title' | 'body' | 'tags'>): string {
  return [c.title, markdownToPlain(c.body.replace(IMAGE, '')), topicsText(c.tags)].filter(Boolean).join('\n\n')
}

/** 文章：Markdown 全文，图换成完整地址，头图放在标题下。 */
export function articleMarkdown(c: PreviewContent, url: (f: JobFile) => string): string {
  const byNo = new Map(c.files.map((f) => [f.no, f]))
  const head = headImage(c.files)
  const body = c.body.replace(IMAGE, (_, alt: string, no: string) => {
    const f = byNo.get(Number(no))
    return f ? `![${alt}](${url(f)})` : ''
  })
  const tail = trailingImages(c).map((f) => `![${f.caption ?? ''}](${url(f)})`)
  return [`# ${c.title}`, head ? `![${head.caption ?? ''}](${url(head)})` : '', body.trim(), ...tail, topicsText(c.tags)]
    .filter(Boolean).join('\n\n')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inlineHtml = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')

/** 文章：带格式的 HTML（复制全文时用，粘进公众号等编辑器带格式和图）。 */
export function articleHtml(c: PreviewContent, url: (f: JobFile) => string): string {
  const byNo = new Map(c.files.map((f) => [f.no, f]))
  const fig = (f: JobFile, alt?: string) =>
    `<p style="text-align:center"><img src="${esc(url(f))}" alt="${esc(alt ?? f.caption ?? '')}" style="max-width:100%"/></p>`
  const parts: string[] = [`<h1>${inlineHtml(c.title)}</h1>`]
  const head = headImage(c.files)
  if (head) parts.push(fig(head))
  for (const b of parseBlocks(c.body)) {
    switch (b.type) {
      case 'h': parts.push(`<h${b.level}>${inlineHtml(b.text)}</h${b.level}>`); break
      case 'p': parts.push(`<p>${inlineHtml(b.text)}</p>`); break
      case 'quote': parts.push(`<blockquote>${inlineHtml(b.text).replace(/\n/g, '<br/>')}</blockquote>`); break
      case 'ul': case 'ol': parts.push(`<${b.type}>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</${b.type}>`); break
      case 'table': parts.push(`<table border="1" cellpadding="6" style="border-collapse:collapse">${b.rows
        .map((r, ri) => `<tr>${r.map((x) => (ri === 0 ? `<th>${inlineHtml(x)}</th>` : `<td>${inlineHtml(x)}</td>`)).join('')}</tr>`).join('')}</table>`); break
      case 'img': { const f = byNo.get(b.no); if (f) parts.push(fig(f, b.alt)); break }
    }
  }
  trailingImages(c).forEach((f) => parts.push(fig(f)))
  if (c.tags.length) parts.push(`<p>${esc(topicsText(c.tags))}</p>`)
  return parts.join('\n')
}

/** 字数（不算空白和 Markdown 符号）。 */
export const wordCount = (body: string) => markdownToPlain(body.replace(IMAGE, '')).replace(/\s/g, '').length
