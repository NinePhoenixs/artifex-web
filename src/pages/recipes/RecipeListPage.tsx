import { useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Space, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { getApp, listRecipes, selectRecipe } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { RecipeListItem } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { formatTime } from '@/pages/apps/AppListPage'
import PickSystemRecipeModal from './PickSystemRecipeModal'

/**
 * 应用配方列表。表格形态（取产品经理那份原型）。
 *
 * 与原型的差异（见 docs/设计方案.md §6.1）：
 * - 状态不是「启用/停用」，而是**草稿 / 就绪 / 使用中**
 * - 没有【停用】按钮——后端没有这个动作
 * - 没有「来源」列——列表接口不返回 systemRecipeId
 */
export default function RecipeListPage() {
  const { appId = '' } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const handleError = useApiError()
  const [pickOpen, setPickOpen] = useState(false)

  const { data: app } = useQuery({
    queryKey: qk.app(appId),
    queryFn: () => getApp(appId),
    enabled: Boolean(appId),
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.recipes(appId),
    queryFn: () => listRecipes(appId),
    enabled: Boolean(appId),
  })

  const select = useMutation({
    mutationFn: (recipeId: string) => selectRecipe(appId, recipeId),
    onSuccess: (recipe) => {
      message.success(`已切换到「${recipe.name}」`)
      qc.invalidateQueries({ queryKey: qk.app(appId) })
      qc.invalidateQueries({ queryKey: qk.recipes(appId) })
    },
    onError: (err) => handleError(err),
  })

  const selectedId = app?.selectedRecipeId ?? ''

  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            应用配方
          </Typography.Title>
          <Typography.Text type="secondary">
            配方 = 一种内容做法。选一个用，也可以改，或从模板再建一个。
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginLeft: 'auto' }}
          onClick={() => setPickOpen(true)}
        >
          创建配方
        </Button>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="加载失败"
          description={(error as Error)?.message ?? '请稍后重试'}
          action={<Button size="small" onClick={() => refetch()}>重新加载</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<RecipeListItem>
        rowKey="recipeId"
        loading={isLoading}
        dataSource={data?.items ?? []}
        pagination={false}
        columns={[
          {
            title: '配方名称',
            dataIndex: 'name',
            render: (name: string, row) => (
              <div>
                <Typography.Text strong>{name}</Typography.Text>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
                  {row.description || '暂无说明'}
                </div>
              </div>
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 140,
            render: (_: unknown, row) => <StatusTag row={row} selectedId={selectedId} />,
          },
          {
            title: '最近更新',
            dataIndex: 'updatedAt',
            width: 170,
            render: (t: string) => (
              <span style={{ color: '#64748b' }}>{formatTime(t)}</span>
            ),
          },
          {
            title: '操作',
            width: 170,
            align: 'right',
            render: (_: unknown, row) => (
              <Space size={4}>
                {row.status === 'ready' && row.recipeId !== selectedId && (
                  <Button
                    type="link"
                    size="small"
                    loading={select.isPending && select.variables === row.recipeId}
                    onClick={() => select.mutate(row.recipeId)}
                  >
                    使用它
                  </Button>
                )}
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate(`/apps/${appId}/recipes/${row.recipeId}`)}
                >
                  编辑
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginTop: 14 }}>
        配方没有「停用」——用不用由应用当前选中哪一份表达。MVP 暂不提供删除。
      </Typography.Paragraph>

      <PickSystemRecipeModal
        appId={appId}
        open={pickOpen}
        onClose={() => setPickOpen(false)}
      />
    </div>
  )
}

/**
 * 三态：使用中 / 就绪 / 草稿。
 * 「使用中」不是配方自己的状态，而是拿 app.selectedRecipeId 比出来的。
 */
function StatusTag({ row, selectedId }: { row: RecipeListItem; selectedId: string }) {
  if (row.recipeId === selectedId) {
    return <Tag color="success" variant="filled">● 使用中</Tag>
  }
  if (row.status === 'ready') {
    return <Tag color="blue" variant="filled">就绪</Tag>
  }
  return <Tag variant="filled">草稿</Tag>
}
