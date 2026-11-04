/**
 * 字段可见性按当前取值联动：**看用户此刻选的是不是「自定义」**。
 * 不能看响应——用户在页面上刚改成 custom 时，响应里可没有配套字段。
 */
export function needsCustom(value: string | null | undefined): boolean {
  return value === 'custom'
}

/** 后端字段路径 → 属于哪一段，用于 422 时跳到第一个出错的段。 */
export type SectionKey = 'basic' | 'retrieval' | 'generation' | 'review'

export function sectionOfField(field: string): SectionKey {
  const stage = /^aiSetting\.(?:prompts|grants)\.(retrieval|generation|review)/.exec(field)
  if (stage) return stage[1] as SectionKey
  // 各步自己的设置跟着那一步；档位 / 模型 / 上限对整份配方生效，放在基本信息
  if (field.startsWith('materialSpec')) return 'retrieval'
  if (field.startsWith('reviewPolicy')) return 'review'
  return 'basic'
}

/**
 * 后端字段路径 → 表单项路径。授权清单是一个整体控件，
 * `aiSetting.grants.generation[1]` 这类下标错误标到整个阶段的清单上。
 */
export function formFieldOf(field: string): string {
  return field.startsWith('aiSetting.grants.') ? field.replace(/\[\d+\]$/, '') : field
}
