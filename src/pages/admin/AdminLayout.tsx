import { Tabs, Typography } from 'antd'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/session/SessionContext'

const TABS = [
  { key: '/admin', label: '概览' },
  { key: '/admin/spaces', label: '空间' },
  { key: '/admin/accounts', label: '用户' },
  { key: '/admin/plans', label: '套餐' },
  { key: '/admin/settings', label: '设置' },
  { key: '/admin/invite-codes', label: '邀请码' },
  { key: '/admin/audit-logs', label: '操作记录' },
]

/** 平台管理：只有平台管理员能进，普通账号当作页面不存在。看不到空间里的配方和成稿。 */
export default function AdminLayout() {
  const { isPlatformAdmin } = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (!isPlatformAdmin) return <Navigate to="/" replace />
  const active = TABS.filter((t) => pathname === t.key || pathname.startsWith(`${t.key}/`)).sort((a, b) => b.key.length - a.key.length)[0]?.key ?? '/admin'
  return (
    <div style={{ padding: '24px 24px 0', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>平台管理</Typography.Title>
      <Typography.Text type="secondary">注册用户、空间、套餐和用量。后台的每次修改都要填原因，记进操作记录。</Typography.Text>
      <Tabs activeKey={active} items={TABS} onChange={(k) => navigate(k)} style={{ marginTop: 8 }} />
      <Outlet />
    </div>
  )
}
