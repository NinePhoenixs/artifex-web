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
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import JoinPage from './pages/auth/JoinPage'
import TeamSettingsPage from './pages/settings/TeamSettingsPage'
import AccountSettingsPage from './pages/settings/AccountSettingsPage'
import AdminAccountsPage from '@/pages/admin/AdminAccountsPage'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage'
import AdminPlansPage from '@/pages/admin/AdminPlansPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import AdminSpacesPage from '@/pages/admin/AdminSpacesPage'
import AuditLogsPage from '@/pages/admin/AuditLogsPage'
import BillingPage from '@/pages/billing/BillingPage'
import InviteCodesPage from './pages/settings/InviteCodesPage'
import RequireSession from './session/RequireSession'

/**
 * 待复核、模板库、开发者，以及应用里的概览 / 什么时候产 / 交到哪 / 设置：
 * 还没做，菜单里灰掉标「敬请期待」，不注册路由。
 * 登录、注册、找回密码、打开邀请链接不要登录；其余都包在 RequireSession 里。
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/join/:token', element: <JoinPage /> },
  {
    element: <RequireSession><ConsoleLayout /></RequireSession>,
    children: [
      { path: '/settings', element: <TeamSettingsPage /> },
      { path: '/account', element: <AccountSettingsPage /> },
      { path: '/billing', element: <BillingPage /> },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'spaces', element: <AdminSpacesPage /> },
          { path: 'accounts', element: <AdminAccountsPage /> },
          { path: 'plans', element: <AdminPlansPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'invite-codes', element: <InviteCodesPage /> },
          { path: 'audit-logs', element: <AuditLogsPage /> },
        ],
      },
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
