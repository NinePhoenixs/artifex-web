import { AppstoreOutlined } from '@ant-design/icons'
import { Skeleton, Tabs, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getApp } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { brand } from '@/theme'

/**
 * 应用详情：页头 + 标签。
 * 后端还没有的标签灰掉并标「敬请期待」，不注册路由。
 */
const TABS: { key: string; label: string; soon?: boolean }[] = [
  { key: 'overview', label: '概览', soon: true },
  { key: 'recipes', label: '配方' },
  { key: 'jobs', label: '生产记录' },
  { key: 'triggers', label: '什么时候产', soon: true },
  { key: 'delivery', label: '交到哪', soon: true },
  { key: 'settings', label: '设置', soon: true },
]

export default function AppLayout() {
  const { appId = '' } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: app, isLoading } = useQuery({
    queryKey: qk.app(appId),
    queryFn: () => getApp(appId),
    enabled: Boolean(appId),
  })
  const current = pathname.includes('/jobs') ? 'jobs' : 'recipes'
  // 编辑配方是一整页工作区，不再显示应用页头与标签
  const editing = /\/recipes\/[^/]+/.test(pathname)

  if (editing) {
    return (
      <div style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        <Outlet />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px 24px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, background: brand.inkSoft, color: brand.ink,
            display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0,
          }}
        >
          <AppstoreOutlined />
        </div>
        {isLoading ? (
          <Skeleton.Input active size="small" style={{ width: 160 }} />
        ) : (
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>{app?.name ?? '—'}</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {app?.appTypeName}
              {app?.description ? ` · ${app.description}` : ''}
            </Typography.Text>
          </div>
        )}
      </div>
      <Tabs
        activeKey={current}
        onChange={(k) => navigate(`/apps/${appId}/${k}`)}
        items={TABS.map((t) => ({
          key: t.key,
          disabled: t.soon,
          label: t.soon ? (
            <span>
              {t.label}
              <Tag variant="filled" style={{ marginInlineStart: 6, fontSize: 11, lineHeight: '16px' }}>敬请期待</Tag>
            </span>
          ) : t.label,
        }))}
      />
      <Outlet />
    </div>
  )
}
