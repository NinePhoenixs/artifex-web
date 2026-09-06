import {
  AppstoreOutlined,
  ExperimentOutlined,
  HomeOutlined,
  RedoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Layout, Menu, Skeleton, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getApp } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'

const { Sider, Content } = Layout

/** 置灰项标「敬请期待」——后端本期没有对应数据，做出来只能填假的。 */
const COMING_SOON = { disabled: true, extra: '敬请期待' }

export default function AppLayout() {
  const { appId = '' } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: app, isLoading } = useQuery({
    queryKey: qk.app(appId),
    queryFn: () => getApp(appId),
    enabled: Boolean(appId),
  })

  const selected = location.pathname.includes('/recipes') ? 'recipes' : 'overview'

  return (
    <Layout>
      <Sider
        width={216}
        theme="light"
        style={{ borderRight: '1px solid #e6eaf0', padding: '16px 12px' }}
      >
        <div style={{ display: 'flex', gap: 10, padding: '4px 8px 16px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#eff4ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <AppstoreOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            {isLoading ? (
              <Skeleton.Input active size="small" style={{ width: 120 }} />
            ) : (
              <>
                <Typography.Text strong ellipsis style={{ display: 'block' }}>
                  {app?.name ?? '—'}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {app?.appTypeName ?? ''}
                </Typography.Text>
              </>
            )}
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selected]}
          style={{ border: 'none' }}
          onClick={({ key }) => {
            if (key === 'recipes') navigate(`/apps/${appId}/recipes`)
          }}
          items={[
            {
              key: 'overview',
              icon: <HomeOutlined />,
              label: labelWithHint('应用概览', true),
              ...COMING_SOON,
            },
            { key: 'recipes', icon: <ExperimentOutlined />, label: '应用配方' },
            {
              key: 'automation',
              icon: <RedoOutlined />,
              label: labelWithHint('自动化', true),
              ...COMING_SOON,
            },
            {
              key: 'tasks',
              icon: <UnorderedListOutlined />,
              label: labelWithHint('生产任务', true),
              ...COMING_SOON,
            },
          ]}
        />
      </Sider>

      <Content style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}

function labelWithHint(text: string, comingSoon: boolean) {
  if (!comingSoon) return text
  return (
    <span>
      {text}
      <Tag
        variant="filled"
        style={{ marginInlineStart: 8, fontSize: 11, lineHeight: '16px' }}
      >
        敬请期待
      </Tag>
    </span>
  )
}
