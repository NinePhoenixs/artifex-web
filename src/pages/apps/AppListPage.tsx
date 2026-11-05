import { useState } from 'react'
import { EditOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listApps } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { AppListItem } from '@/api/types'
import { useEnums } from '@/hooks/useEnums'
import { brand } from '@/theme'
import { formatDateTime } from '@/utils/time'
import AppFormModal from './AppFormModal'

/**
 * 应用列表，卡片式。
 * 不显示「最近任务」：后端 latestJob 目前恒为空，见 docs/设计方案.md §6.1。
 */
export default function AppListPage() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AppListItem | null>(null)
  const { label } = useEnums()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.apps(),
    queryFn: listApps,
  })

  const items = data?.items ?? []

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            应用
          </Typography.Title>
          <Typography.Text type="secondary">
            一个应用对应一类内容，比如某个品牌的小红书笔记。配方和生产记录按应用分开。
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          创建应用
        </Button>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="加载失败"
          description={(error as Error)?.message ?? '请稍后重试'}
          action={
            <Button size="small" onClick={() => refetch()}>
              重新加载
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      ) : items.length === 0 && !isError ? (
        <Card>
          <Empty description="还没有应用，先创建一个">
            <Button type="primary" onClick={() => setModalOpen(true)}>
              创建应用
            </Button>
          </Empty>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {items.map((app) => (
            <Card
              key={app.appId}
              hoverable
              onClick={() => navigate(`/apps/${app.appId}/recipes`)}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <Tag color="blue" variant="filled">
                  {app.appTypeName || label('appType', app.appType)}
                </Tag>
                <Space size={4} style={{ marginLeft: 'auto' }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(app)
                      setModalOpen(true)
                    }}
                  />
                  <RightOutlined style={{ color: '#cbd5e1' }} />
                </Space>
              </div>

              <Typography.Title level={5} style={{ marginBottom: 6 }} ellipsis>
                {app.name}
              </Typography.Title>
              <Typography.Paragraph
                type="secondary"
                ellipsis={{ rows: 2 }}
                style={{ minHeight: 44, marginBottom: 12, fontSize: 13 }}
              >
                {app.description || '暂无说明'}
              </Typography.Paragraph>

              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  color: brand.textMuted,
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 12,
                }}
              >
                <span>{app.recipeCount} 份配方</span>
                <span style={{ marginLeft: 'auto' }}>
                  更新于 {formatDateTime(app.updatedAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AppFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
