import type { ReactNode } from 'react'
import { Typography } from 'antd'
import { brand } from '@/theme'

/**
 * 极简 Markdown 预览：标题、列表、表格、加粗、行内代码、段落。
 * 技能正文和成稿正文只用到这些；不引第三方库，也不用 innerHTML，内容原样当文本渲染，没有注入风险。
 */
export default function MarkdownView({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = Math.min(h[1].length + 2, 5) as 3 | 4 | 5
      blocks.push(<Typography.Title key={i} level={level} style={{ marginTop: blocks.length ? 18 : 0 }}>{inline(h[2])}</Typography.Title>)
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
      blocks.push(
        <table key={i} style={{ borderCollapse: 'collapse', margin: '8px 0 12px', fontSize: 13, width: '100%' }}>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{ background: ri === 0 ? brand.paper : undefined }}>
                {r.map((c, ci) => (
                  <td key={ci} style={{ border: `1px solid ${brand.line}`, padding: '6px 10px', fontWeight: ri === 0 ? 600 : 400 }}>
                    {inline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }
    const listRe = /^\s*([-*·]|\d+\.)\s+(.*)$/
    if (listRe.test(line)) {
      const items: string[] = []
      const ordered = /^\s*\d+\./.test(line)
      while (i < lines.length && listRe.test(lines[i])) {
        items.push(listRe.exec(lines[i])![2])
        i++
      }
      i--
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={i} style={{ paddingLeft: 22, margin: '4px 0 10px' }}>
          {items.map((it, ii) => <li key={ii} style={{ marginBottom: 4 }}>{inline(it)}</li>)}
        </List>,
      )
      continue
    }
    blocks.push(<Typography.Paragraph key={i} style={{ marginBottom: 10 }}>{inline(line)}</Typography.Paragraph>)
  }
  return <div style={{ fontSize: 14, lineHeight: 1.75 }}>{blocks}</div>
}

/**
 * Markdown → 纯文本：去掉标题、加粗、列表、代码等符号，保留文字和分段。
 * 用于摘要预览，以后转成小红书等不支持格式的平台也走这里。
 */
export function markdownToPlain(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*·]\s+/, '· ').replace(/^\s*\|?\s*:?-{2,}.*$/, ''))
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 行内：**加粗**、`代码`。 */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <Typography.Text key={i} code>{part.slice(1, -1)}</Typography.Text>
    return <span key={i}>{part}</span>
  })
}
