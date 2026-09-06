import type { GenerationSpec } from '@/api/types'

/**
 * 字段可见性有**两类判断，不能混**（见 docs/设计方案.md §7.2）。
 *
 * 混淆会出两种 bug：
 * - 用"后端返不返回"判断 custom 字段 → 用户选了「自定义结构」却看不到填段落的地方
 * - 用"值是不是空"判断类型裁剪 → 用户把字数填成 0 时输入框自己消失
 */

/**
 * 第一类 · 按应用类型裁剪：**看响应里有没有这个 key**。
 * 后端不返回 = 这个应用类型没有这个概念 = 不渲染。
 *
 * 注意用 `in` 而不是判断真值：`targetWordCount: 0` 和
 * `customTone: null` 都是"存在"。
 */
export function hasTypeField(
  spec: GenerationSpec | undefined,
  key: keyof GenerationSpec,
): boolean {
  if (!spec) return false
  return key in spec
}

/**
 * 第二类 · 按当前取值联动：**看用户此刻选的是不是「自定义」**。
 * 不能看响应——用户在页面上刚改成 custom 时，响应里可没有配套字段。
 */
export function needsCustom(value: string | null | undefined): boolean {
  return value === 'custom'
}

/** 后端字段路径 → 属于哪一段，用于 422 时跳到第一个出错的段。 */
export type SectionKey = 'basic' | 'material' | 'generation' | 'review'

export function sectionOfField(field: string): SectionKey {
  if (field.startsWith('materialSpec')) return 'material'
  if (field.startsWith('generationSpec')) return 'generation'
  if (field.startsWith('reviewPolicy')) return 'review'
  return 'basic'
}

/** 正文字数预设。后端存单个整数，原型是区间——选区间存中值。 */
export const WORD_COUNT_PRESETS = [
  { label: '600 ～ 1000 字', value: 800 },
  { label: '1000 ～ 1400 字', value: 1200 },
  { label: '1800 ～ 2200 字', value: 2000 },
  { label: '2700 ～ 3300 字', value: 3000 },
]

export function isPresetWordCount(n: number | undefined): boolean {
  return WORD_COUNT_PRESETS.some((p) => p.value === n)
}
