import { CheckOutlined } from '@ant-design/icons'
import { App, Button, Card, Modal, Skeleton, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createRecipe, listSystemRecipes } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { useApiError } from '@/hooks/useApiError'

interface Props {
  appId: string
  open: boolean
  onClose: () => void
}

/**
 * 从模板新建配方。**两份原型都没画完整这一屏**，但它是必须的——
 * 后端规定配方只能从模板复制，不支持从空白创建。
 *
 * 服务端已按应用类型过滤，图文应用查出来只有图文模板；
 * 原型里那些「视频内容 敬请期待」的卡片根本不会出现。
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

  const mutation = useMutation({
    mutationFn: (systemRecipeId: string) => createRecipe(appId, systemRecipeId),
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
      title="选择系统配方"
      footer={<Button onClick={onClose}>取消</Button>}
      onCancel={onClose}
      width={860}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
        系统配方是平台预制的做法。选一个复制成你自己的配方，复制后彻底独立——
        改它不影响模板，模板更新也不会回灌。
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
              <Tag bordered={false} color="blue" style={{ marginBottom: 8 }}>
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
                <Tag bordered={false}>敬请期待</Tag>
              )}
            </Card>
          ))}
        </div>
      )}
    </Modal>
  )
}
