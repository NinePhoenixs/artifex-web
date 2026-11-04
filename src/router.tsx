import { createBrowserRouter, Navigate } from 'react-router-dom'
import ComparePage from '@/pages/compare/ComparePage'
import ConsoleLayout from './layouts/ConsoleLayout'
import AppLayout from './layouts/AppLayout'
import AppListPage from './pages/apps/AppListPage'
import RecipeListPage from './pages/recipes/RecipeListPage'
import RecipeEditorPage from './pages/recipes/editor/RecipeEditorPage'
import CapabilityListPage from './pages/capabilities/CapabilityListPage'
import AgentListPage from './pages/agents/AgentListPage'
import ModelListPage from './pages/agents/ModelListPage'
import JobListPage from './pages/jobs/JobListPage'
import WorkbenchPage from './pages/workbench/WorkbenchPage'

/**
 * 待复核、模板库、开发者、用量、设置，以及应用里的概览 / 什么时候产 / 交到哪 / 设置：
 * 还没做，菜单里灰掉标「敬请期待」，不注册路由。
 */
export const router = createBrowserRouter([
  {
    element: <ConsoleLayout />,
    children: [
      { path: '/', element: <WorkbenchPage /> },
      { path: '/apps', element: <AppListPage /> },
      { path: '/jobs', element: <JobListPage /> },
      { path: '/capabilities', element: <CapabilityListPage /> },
      { path: '/capabilities/agents', element: <AgentListPage /> },
      { path: '/capabilities/models', element: <ModelListPage /> },
      {
        path: '/apps/:appId',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="recipes" replace /> },
          { path: 'recipes', element: <RecipeListPage /> },
          { path: 'recipes/compare', element: <ComparePage /> },
          { path: 'recipes/:recipeId', element: <RecipeEditorPage /> },
          { path: 'jobs', element: <JobListPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
