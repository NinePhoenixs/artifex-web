import { CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Card, Modal, Skeleton, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createBlankRecipe, createRecipe, listSystemRecipes } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { useApiError } from '@/hooks/useApiError'

interface Props {
  appId: string
  open: boolean
  onClose: () => void
}

/**
 * 创建配方：选一个系统配方复制，或从空白开始（三步提示词都自己写）。
 *
 * 服务端已按应用类型过滤，图文应用查出来只有图文模板。
 */
export default function PickSystemRecipeModal({ appId, open, onClose }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const handleError = useApiError()

  const { data, isLoading } = useQuery({
    queryKey: qk.systemRecipes(appId),
    queryFn: () => listSystemRecipes(appId),
    enabled: open && Boolean(appId),
  })

  // variables 为 null = 从空白建
  const mutation = useMutation({
    mutationFn: (systemRecipeId: string | null) =>
      systemRecipeId ? createRecipe(appId, systemRecipeId) : createBlankRecipe(appId),
    onSuccess: (recipe) => {
      message.success(`已创建「${recipe.name}」`)
      qc.invalidateQueries({ queryKey: qk.recipes(appId) })
      onClose()
      navigate(`/apps/${appId}/recipes/${recipe.recipeId}`)
    },
    onError: (err) => handleError(err),
  })

  const items = data?.items ?? []

  return (
    <Modal
      open={open}
      title="创建配方"
      footer={<Button onClick={onClose}>取消</Button>}
      onCancel={onClose}
      width={860}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
        从模板复制一份再改，改动不影响模板；也可以从空白开始。
      </Typography.Paragraph>

      {isLoading ? (
        <Skeleton active />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {items.map((sr) => (
            <Card
              key={sr.systemRecipeId}
              styles={{ body: { padding: 18 } }}
              style={{ opacity: sr.available ? 1 : 0.6 }}
            >
              <Tag variant="filled" color="blue" style={{ marginBottom: 8 }}>
                系统配方
              </Tag>
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 6 }}>
                {sr.name}
              </Typography.Title>
              <Typography.Paragraph
                type="secondary"
                style={{ fontSize: 13, minHeight: 40 }}
                ellipsis={{ rows: 2 }}
              >
                {sr.description}
              </Typography.Paragraph>

              <div style={{ marginBottom: 14 }}>
                {sr.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      fontSize: 12.5,
                      color: '#475569',
                      display: 'flex',
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <CheckOutlined style={{ color: '#16a34a' }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {sr.available ? (
                <Button
                  type="primary"
                  block
                  loading={
                    mutation.isPending && mutation.variables === sr.systemRecipeId
                  }
                  onClick={() => mutation.mutate(sr.systemRecipeId)}
                >
                  使用此配方
                </Button>
              ) : (
                <Tag variant="filled">敬请期待</Tag>
              )}
            </Card>
          ))}
          <Card
            hoverable
            styles={{ body: { padding: 18, height: '100%', display: 'flex', flexDirection: 'column' } }}
            style={{ borderStyle: 'dashed' }}
          >
            <Tag variant="filled" style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
              自定义
            </Tag>
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 6 }}>
              空白配方
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13, minHeight: 40 }}>
              三步都自己写，写好「写」这一步就能启用。
            </Typography.Paragraph>
            <Button
              block
              icon={<PlusOutlined />}
              style={{ marginTop: 'auto' }}
              loading={mutation.isPending && mutation.variables === null}
              onClick={() => mutation.mutate(null)}
            >
              从空白开始
            </Button>
          </Card>
        </div>
      )}
    </Modal>
  )
}
