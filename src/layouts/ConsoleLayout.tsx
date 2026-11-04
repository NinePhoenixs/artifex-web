import type { ReactNode } from 'react'
import {
  ApiOutlined, AppstoreOutlined, AuditOutlined, BookOutlined, ClockCircleOutlined,
  CreditCardOutlined, HomeOutlined, SettingOutlined, ToolOutlined,
} from '@ant-design/icons'
import { Breadcrumb, Layout, Menu, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getApp } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import BrandMark from '@/components/BrandMark'
import OfflineBanner from '@/components/OfflineBanner'
import { brand } from '@/theme'

const { Sider, Content } = Layout

interface NavItem {
  key: string // 路由；敬请期待的项用占位 key
  label: string
  icon: ReactNode
  soon?: boolean
}

/**
 * 左侧菜单。还没做的模块灰掉并标「敬请期待」，不注册路由、点不进去。
 */
const GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { key: '/', label: '工作台', icon: <HomeOutlined /> },
      { key: 'soon:review', label: '待复核', icon: <AuditOutlined />, soon: true },
    ],
  },
  {
    title: '内容生产',
    items: [
      { key: '/apps', label: '应用', icon: <AppstoreOutlined /> },
      { key: '/jobs', label: '生产记录', icon: <ClockCircleOutlined /> },
      { key: 'soon:templates', label: '模板库', icon: <BookOutlined />, soon: true },
      { key: '/capabilities', label: '能力中心', icon: <ToolOutlined /> },
    ],
  },
  {
    title: '接入与管理',
    items: [
      { key: 'soon:developers', label: '开发者', icon: <ApiOutlined />, soon: true },
      { key: 'soon:usage', label: '用量与账单', icon: <CreditCardOutlined />, soon: true },
      { key: 'soon:settings', label: '团队与设置', icon: <SettingOutlined />, soon: true },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

function soonLabel(text: string) {
  return (
    <span style={{ display: 'flex', alignItems: 'center' }}>
      {text}
      <Tag variant="filled" style={{ marginInlineStart: 'auto', marginInlineEnd: 0, fontSize: 11, lineHeight: '18px' }}>
        敬请期待
      </Tag>
    </span>
  )
}

const MENU: MenuProps['items'] = GROUPS.map((g, i) => {
  const children = g.items.map((n) => ({
    key: n.key,
    icon: n.icon,
    label: n.soon ? soonLabel(n.label) : n.label,
    disabled: n.soon,
  }))
  return g.title ? { type: 'group' as const, key: `g${i}`, label: g.title, children } : { type: 'group' as const, key: `g${i}`, children }
})

/** 当前路由属于哪个菜单项：最长前缀匹配，工作台只认根路径。 */
function selectedKey(path: string) {
  if (path === '/') return '/'
  return ALL.filter((n) => !n.soon && n.key !== '/' && path.startsWith(n.key))
    .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? '/'
}

/**
 * 控制台骨架：左侧菜单 + 顶部面包屑。
 * 不放通知铃铛和用户头像：还没有用户体系，不放点不开的控件。
 */
export default function ConsoleLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const sel = selectedKey(pathname)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={232}
        theme="light"
        style={{ borderRight: `1px solid ${brand.line}`, position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 14px', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <BrandMark size={26} />
          <div>
            <Typography.Text strong style={{ fontSize: 16, letterSpacing: 1, display: 'block', lineHeight: 1.2 }}>
              稿谱
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>AI 内容生产</Typography.Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[sel]}
          items={MENU}
          style={{ border: 'none', padding: '0 8px' }}
          onClick={({ key }) => {
            if (!key.startsWith('soon:')) navigate(key)
          }}
        />
      </Sider>
      <Layout>
        <div
          style={{
            height: 56, display: 'flex', alignItems: 'center', padding: '0 24px',
            borderBottom: `1px solid ${brand.line}`, background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 10,
          }}
        >
          <Crumbs path={pathname} />
        </div>
        <OfflineBanner />
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

/** 面包屑：工作台 / 一级菜单 / 应用名 / 当前页。 */
function Crumbs({ path }: { path: string }) {
  const seg = path.split('/').filter(Boolean)
  const appId = seg[0] === 'apps' ? seg[1] : undefined
  const { data: app } = useQuery({
    queryKey: qk.app(appId ?? ''),
    queryFn: () => getApp(appId!),
    enabled: Boolean(appId),
  })
  const items: { title: ReactNode }[] = [{ title: seg.length ? <Link to="/">工作台</Link> : '工作台' }]
  const top = ALL.find((n) => n.key === `/${seg[0]}`)
  if (top) items.push({ title: seg.length > 1 ? <Link to={top.key}>{top.label}</Link> : top.label })
  if (seg[0] === 'capabilities' && seg[1]) items.push({ title: seg[1] === 'agents' ? 'Agent' : '模型' })
  if (appId) {
    const tab = seg[2] === 'jobs' ? '生产记录' : '配方'
    items.push({ title: seg.length > 3 || seg[2] ? <Link to={`/apps/${appId}/recipes`}>{app?.name ?? '应用'}</Link> : app?.name ?? '应用' })
    items.push({ title: seg[3] ? <Link to={`/apps/${appId}/recipes`}>{tab}</Link> : tab })
    if (seg[3]) items.push({ title: seg[3] === 'compare' ? '对比试产' : '编辑配方' })
  }
  return <Breadcrumb items={items} />
}
