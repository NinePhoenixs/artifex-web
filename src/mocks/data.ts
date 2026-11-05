import type { App, Recipe, SystemRecipe } from '@/api/types'
import { FALLBACK_ENUMS } from '@/constants/enums'

/**
 * 后端没启动时用的演示数据。**结构严格照实调结果**——
 * 应用列表是扁平的、系统配方不返回 appType、图文配方没有 durationSec 等，
 * 见 docs/设计方案.md §5.2。mock 结构走样的话，联调时反而会掩盖真问题。
 */

/** 与兜底字典同一份，避免两处维护走样。 */
export const MOCK_ENUMS = FALLBACK_ENUMS

export const MOCK_SYSTEM_RECIPES: SystemRecipe[] = [
  {
    systemRecipeId: 'system_recipe_deep_article',
    name: '深度科普长文',
    description: '把一个复杂主题讲透，建立专业形象。资料要求严格，篇幅长',
    features: ['找资料、写、检查三步各有一段提示词，可直接改', '可在提示词里 @ 点名技能和工具', '检查不通过时 AI 自动返修'],
    available: true,
  },
  {
    systemRecipeId: 'system_recipe_quick_note',
    name: '快速种草短文',
    description: '追热点、日更场景。篇幅短、语气亲切，出稿快',
    features: ['找资料、写、检查三步各有一段提示词，可直接改', '可在提示词里 @ 点名技能和工具', '检查不通过时 AI 自动返修'],
    available: true,
  },
  {
    systemRecipeId: 'system_recipe_hot_take',
    name: '热点观点评论',
    description: '对行业事件给出立场与依据。只用近期资料，语气客观中立',
    features: ['找资料、写、检查三步各有一段提示词，可直接改', '可在提示词里 @ 点名技能和工具', '检查不通过时 AI 自动返修'],
    available: true,
  },
]

const T = '2026-08-29T10:00:00+08:00'

export function seedApps(): App[] {
  return [
    {
      appId: 'mock-app-1',
      appType: 'article',
      appTypeName: '图文类',
      name: '行业洞察内容中心',
      description: '面向企业市场团队，持续生产行业趋势、观点解读和专题内容。',
      selectedRecipeId: 'mock-recipe-1-1',
      iconUrl: null,
      createdAt: T,
      updatedAt: T,
    },
    {
      appId: 'mock-app-2',
      appType: 'article',
      appTypeName: '图文类',
      name: '品牌市场内容工坊',
      description: '用于品牌活动、产品传播和客户案例内容生产。',
      selectedRecipeId: 'mock-recipe-2-1',
      iconUrl: null,
      createdAt: T,
      updatedAt: T,
    },
  ]
}

const MOCK_GENERATION_PROMPT = `围绕「{{主题}}」写一篇图文。

目标与读者
写给想系统了解这个主题的读者，读完能自己复述。

写作要求
语气专业严谨，正文约 2000 字，按「问题—分析—方案」展开。

不要做的事
· 不编造数据和案例，资料里没有的就不写`

function recipeFrom(
  appId: string,
  recipeId: string,
  src: SystemRecipe,
  overrides: Partial<Recipe> = {},
): Recipe {
  return {
    recipeId,
    appId,
    appType: 'article',
    appTypeName: '图文类',
    systemRecipeId: src.systemRecipeId,
    status: 'ready',
    name: src.name,
    description: src.description,
    materialSpec: {
      sourceMode: 'automatic',
      allowedSources: [],
      excludedSources: [],
      freshness: 'last_90_days',
      customFreshness: null,
      maxSearchRounds: 3,
    },
    reviewPolicy: { autoRevisionCount: 1 },
    illustration: { enabled: false, imageCount: 3, imageRatio: '3:4' },
    aiSetting: {
      agents: { retrieval: '', generation: '', review: '', illustration: '' },
      grants: { retrieval: ['web_search'], generation: ['xhs_writing'], review: [] },
      prompts: { retrieval: '', generation: MOCK_GENERATION_PROMPT, review: '', illustration: '' },
      actions: { retrieval: {}, generation: {}, review: {} },
    },
    createdAt: T,
    updatedAt: T,
    ...overrides,
  }
}

export function seedRecipes(): Recipe[] {
  const out: Recipe[] = []
  for (const [i, appId] of ['mock-app-1', 'mock-app-2'].entries()) {
    MOCK_SYSTEM_RECIPES.forEach((sr, j) => {
      out.push(recipeFrom(appId, `mock-recipe-${i + 1}-${j + 1}`, sr))
    })
  }
  // 一份缺必填项的草稿，用来演示「保存并启用」的 422 批量标红
  out.push(
    recipeFrom('mock-app-1', 'mock-recipe-1-4', MOCK_SYSTEM_RECIPES[1], {
      name: '待补全的测试配方',
      description: '「写」还没写提示词，点「保存并启用」会标红',
      status: 'draft',
      aiSetting: {
        agents: { retrieval: '', generation: '', review: '', illustration: '' },
        grants: { retrieval: [], generation: [], review: [] },
        prompts: { retrieval: '', generation: '', review: '', illustration: '' },
        actions: { retrieval: {}, generation: {}, review: {} },
      },
    }),
  )
  return out
}
