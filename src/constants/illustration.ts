import type { ImageRatio, Layout } from '@/api/types'

/** 宽:高。3:4 适合小红书类竖屏信息流，16:9 适合文章头图；第一项是新配方的默认值。 */
export const IMAGE_RATIOS: { value: ImageRatio; label: string }[] = [
  { value: '3:4', label: '3:4' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
]

/** 每种版式默认的图片比例：笔记竖图，文章横图。 */
export const LAYOUT_RATIO: Record<Layout, ImageRatio> = { note: '3:4', article: '16:9' }
