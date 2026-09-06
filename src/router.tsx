import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import AppLayout from './layouts/AppLayout'
import AppListPage from './pages/apps/AppListPage'
import RecipeListPage from './pages/recipes/RecipeListPage'
import RecipeEditorPage from './pages/recipes/editor/RecipeEditorPage'

/**
 * 路由表见 docs/设计方案.md §3.2。
 * overview / automation / tasks 三条本期置灰不可达，故不注册路由。
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Navigate to="/apps" replace /> },
      { path: '/apps', element: <AppListPage /> },
      {
        path: '/apps/:appId',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="recipes" replace /> },
          { path: 'recipes', element: <RecipeListPage /> },
          { path: 'recipes/:recipeId', element: <RecipeEditorPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/apps" replace /> },
    ],
  },
])
