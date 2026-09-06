/**
 * 缓存键集中定义。写操作后要失效哪些，见 docs/设计方案.md §5.3。
 *
 * 最容易漏的一条：**转就绪后必须失效 app(appId)**——后端在应用尚未选中
 * 配方时，会把第一份转就绪的配方自动选中。不刷应用详情，"使用中"标记就是错的。
 */
export const qk = {
  enums: () => ['meta', 'enums'] as const,
  apps: () => ['apps'] as const,
  app: (appId: string) => ['app', appId] as const,
  systemRecipes: (appId: string) => ['systemRecipes', appId] as const,
  recipes: (appId: string) => ['recipes', appId] as const,
  recipe: (appId: string, recipeId: string) => ['recipe', appId, recipeId] as const,
}
