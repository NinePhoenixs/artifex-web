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
    features: ['可调整资料获取方式和来源范围', '可调整受众、结构、篇幅和表达风格', '自动完成资料与成品质量评审'],
    available: true,
  },
  {
    systemRecipeId: 'system_recipe_quick_note',
    name: '快速种草短文',
    description: '追热点、日更场景。篇幅短、语气亲切，出稿快',
    features: ['可调整资料获取方式和来源范围', '可调整受众、结构、篇幅和表达风格', '自动完成资料与成品质量评审'],
    available: true,
  },
  {
    systemRecipeId: 'system_recipe_hot_take',
    name: '热点观点评论',
    description: '对行业事件给出立场与依据。只用近期资料，语气客观中立',
    features: ['可调整资料获取方式和来源范围', '可调整受众、结构、篇幅和表达风格', '自动完成资料与成品质量评审'],
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
    // 图文类：没有 durationSec / shotCount / slideCount / hostCount
    generationSpec: {
      targetAudience: '希望系统了解该主题的专业读者',
      creationGoal: '把一个复杂主题讲透，让读者读完能自己复述',
      tone: 'professional',
      customTone: null,
      titlePreference: null,
      narrativePerspective: null,
      mustInclude: [],
      forbiddenContent: [],
      targetWordCount: 2000,
      contentStructure: 'problem_analysis_solution',
      visualStyle: 'infographic',
    },
    reviewPolicy: { autoRevisionCount: 1 },
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
      description: '缺目标受众和创作目标，点「保存并启用」会一次标红两项',
      status: 'draft',
      generationSpec: {
        targetAudience: '',
        creationGoal: '',
        tone: 'friendly',
        customTone: null,
        titlePreference: null,
        narrativePerspective: null,
        mustInclude: [],
        forbiddenContent: [],
        targetWordCount: 800,
        contentStructure: 'list',
        visualStyle: 'fresh',
      },
    }),
  )
  return out
}
