import type { EnumDict } from '@/api/types'

/**
 * 枚举的**唯一事实源是后端** `GET /v1/meta/enums`（7 组 37 项，带中文名）。
 * 页面一律通过 useEnums() 拿，不要 import 下面的字典去渲染下拉框。
 *
 * 这里保留两样东西：
 * 1. FALLBACK_ENUMS —— 首屏 meta 还没回来、或后端没启动时的兜底，避免下拉框空白
 * 2. 后端不提供的补充文案（选项说明、结构预览）
 */

export const FALLBACK_ENUMS: EnumDict = {
  appType: [
    { value: 'article', label: '图文类', available: true },
    { value: 'video', label: '视频类', available: false },
    { value: 'audio', label: '音频类', available: false },
    { value: 'slides', label: '演示类', available: false },
  ],
  recipeStatus: [
    { value: 'draft', label: '草稿' },
    { value: 'ready', label: '就绪' },
  ],
  sourceMode: [
    { value: 'automatic', label: '系统自动准备' },
    { value: 'user_first', label: '用户资料优先' },
    { value: 'user_only', label: '仅使用用户资料' },
  ],
  freshness: [
    { value: 'unlimited', label: '不限' },
    { value: 'last_7_days', label: '近 7 天' },
    { value: 'last_30_days', label: '近 30 天' },
    { value: 'last_90_days', label: '近 90 天' },
    { value: 'last_year', label: '近一年' },
    { value: 'custom', label: '自定义' },
  ],
  contentStructure: [
    { value: 'introduction_body_conclusion', label: '总分总' },
    { value: 'introduction_body', label: '总分' },
    { value: 'problem_analysis_solution', label: '问题—分析—方案' },
    { value: 'list', label: '清单式' },
    { value: 'steps', label: '步骤式' },
    { value: 'comparison', label: '对比式' },
    { value: 'custom', label: '自定义' },
  ],
  tone: [
    { value: 'clear', label: '清晰易懂' },
    { value: 'professional', label: '专业严谨' },
    { value: 'concise', label: '简洁直接' },
    { value: 'friendly', label: '亲切自然' },
    { value: 'lively', label: '生动有趣' },
    { value: 'neutral', label: '客观中立' },
    { value: 'custom', label: '自定义' },
  ],
  visualStyle: [
    { value: 'simple', label: '简洁清晰' },
    { value: 'business', label: '商务专业' },
    { value: 'fresh', label: '清新活泼' },
    { value: 'editorial', label: '杂志编辑' },
    { value: 'infographic', label: '数据图解' },
    { value: 'photographic', label: '写实摄影' },
    { value: 'illustration', label: '插画风格' },
    { value: 'custom', label: '自定义' },
  ],
}

// ---------- 后端不提供的补充文案 ----------

/** 应用类型卡片上的副标题。后端只给 label + available。 */
export const APP_TYPE_DESC: Record<string, string> = {
  article: '文章 · 图文笔记',
  video: '视频脚本 · 分镜',
  audio: '播客 · 口播稿',
  slides: '演示文稿',
}

/**
 * 资料获取方式的说明。
 * 注意语义：讲的是"用不用用户自己提供的资料"，**不是**"用哪个搜索引擎"。
 */
export const SOURCE_MODE_DESC: Record<string, string> = {
  automatic: '系统按主题检索资料，本次提供的资料一并使用',
  user_first: '优先用你提供的资料，不足时再检索补充',
  user_only: '只用你提供的资料，不联网检索',
}

/** 结构预览，纯展示。 */
export const CONTENT_STRUCTURE_PREVIEW: Record<string, string> = {
  introduction_body_conclusion: '开篇概述 → 分点展开 → 结尾总结',
  introduction_body: '开篇概述 → 分点展开',
  problem_analysis_solution: '提出问题 → 分析原因 → 给出方案',
  list: '要点一 → 要点二 → 要点三 …',
  steps: '第一步 → 第二步 → 第三步 …',
  comparison: '对象 A → 对象 B → 对比结论',
  custom: '按你设定的段落顺序',
}
