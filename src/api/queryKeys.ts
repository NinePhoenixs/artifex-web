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
  /** 能力列表按筛选条件分缓存；登记 / 修改后整组失效 */
  capabilities: (q: object = {}) => ['capabilities', q] as const,
  capability: (id: string) => ['capability', id] as const,
  providers: () => ['ai-providers'] as const,
  remoteModels: (providerId: string) => ['ai-providers', providerId, 'remote-models'] as const,
  agents: () => ['agents'] as const,
  agent: (id: string) => ['agent', id] as const,
  skillTemplates: () => ['skill-templates'] as const,
  aiRuns: (bizId: string) => ['ai-runs', bizId] as const,
  job: (jobId: string) => ['job', jobId] as const,
  jobs: (q: object = {}) => ['jobs', q] as const,
}
