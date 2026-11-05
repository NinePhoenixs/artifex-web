import { describe, expect, it } from 'vitest'
import { markdownToPlain } from './MarkdownView'

describe('markdownToPlain', () => {
  it('去掉格式符号，保留文字和分段', () => {
    const md = '## 影像\n\n**1. 影像配置**：4800 万像素\n\n- 冰川蓝\n- 勃艮第红\n\n用 `A20 Pro` 芯片'
    expect(markdownToPlain(md)).toBe('影像\n\n1. 影像配置：4800 万像素\n\n· 冰川蓝\n· 勃艮第红\n\n用 A20 Pro 芯片')
  })
})
