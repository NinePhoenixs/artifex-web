import { Layout, Select, Space, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { listApps } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import OfflineBanner from '@/components/OfflineBanner'

const { Header } = Layout

/**
 * 顶栏。**不放通知铃铛和用户头像**——后端没有用户体系，
 * 放点不开的假控件在演示时会穿帮（见 docs/设计方案.md §3.1）。
 */
export default function RootLayout() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const { data } = useQuery({ queryKey: qk.apps(), queryFn: listApps })

  return (
    <Layout style={{ minHeight: '100%' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #e6eaf0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Space
          size={10}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/apps')}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#2563eb',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <Typography.Text strong style={{ fontSize: 15 }}>
            AI 内容生产平台
          </Typography.Text>
        </Space>

        {appId && (
          <Select
            variant="borderless"
            style={{ marginLeft: 'auto', minWidth: 180 }}
            value={appId}
            onChange={(next) => navigate(`/apps/${next}/recipes`)}
            options={(data?.items ?? []).map((a) => ({
              value: a.appId,
              label: a.name,
            }))}
          />
        )}
      </Header>
      <OfflineBanner />
      <Outlet />
    </Layout>
  )
}
