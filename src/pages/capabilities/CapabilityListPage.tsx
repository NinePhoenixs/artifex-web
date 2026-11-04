import { useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Popconfirm, Segmented, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listCapabilities, updateCapability } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { CapAppType, Capability, CapabilityKind, ListCapabilitiesQuery } from '@/api/types'
import {
  CAP_APP_TYPES,
  KIND_LABEL,
  ORIGIN_LABEL,
  STATUS_META,
  appTypeLabel,
  stageLabel,
} from '@/constants/capability'
import { useApiError } from '@/hooks/useApiError'
import CapabilityDrawer from './CapabilityDrawer'
import CapabilityFormModal from './CapabilityFormModal'
import CenterTabs from './CenterTabs'

const ALL = 'all'

/**
 * 能力中心：AI 能用的技能和工具统一叫能力，一张表管理。
 * 按应用类型筛选时只列本类型和通用的，后端顺带给出因不适用而隐藏的数量。
 */
export default function CapabilityListPage() {
  const { message } = App.useApp()
  const onError = useApiError()
  const client = useQueryClient()
  const [appType, setAppType] = useState<CapAppType | typeof ALL>(ALL)
  const [kind, setKind] = useState<CapabilityKind | typeof ALL>(ALL)
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const query: ListCapabilitiesQuery = {
    appType: appType === ALL ? undefined : appType,
    kind: kind === ALL ? undefined : kind,
  }
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.capabilities(query),
    queryFn: () => listCapabilities(query),
  })

  const toggle = useMutation({
    mutationFn: (c: Capability) =>
      updateCapability(c.capabilityId, {
        status: c.status === 'disabled' ? 'active' : 'disabled',
      }),
    onSuccess: (c) => {
      message.success(c.status === 'disabled' ? `已停用「${c.name}」` : `已启用「${c.name}」`)
      client.invalidateQueries({ queryKey: ['capabilities'] })
      client.invalidateQueries({ queryKey: qk.capability(c.capabilityId) })
    },
    onError: (e) => onError(e, { onNotFound: () => refetch() }),
  })

  const columns: TableColumnsType<Capability> = [
    {
      title: '能力',
      key: 'name',
      render: (_, c) => (
        <div>
          <Typography.Text strong>{c.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {c.summary}
          </Typography.Text>
        </div>
      ),
    },
    { title: '种类', dataIndex: 'kind', width: 80, render: (k: CapabilityKind) => KIND_LABEL[k] },
    {
      title: '适用',
      dataIndex: 'appTypes',
      width: 140,
      render: (types: CapAppType[]) =>
        types.length === 0 ? (
          <Tag>通用</Tag>
        ) : (
          types.map((t) => (
            <Tag key={t} color="processing">
              {appTypeLabel(t)}
            </Tag>
          ))
        ),
    },
    { title: '推荐阶段', dataIndex: 'recommendStage', width: 96, render: stageLabel },
    { title: '来源', dataIndex: 'origin', width: 96, render: (o: Capability['origin']) => ORIGIN_LABEL[o] },
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: (s: Capability['status']) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag>,
    },
    {
      title: '',
      key: 'action',
      width: 80,
      align: 'right',
      render: (_, c) =>
        c.status === 'disabled' ? (
          <Button type="link" size="small" onClick={(e) => (e.stopPropagation(), toggle.mutate(c))}>
            启用
          </Button>
        ) : (
          <Popconfirm
            title={`确定停用「${c.name}」吗？`}
            description="停用后，用到它的配方在生产时会跳过它。"
            okText="停用"
            cancelText="取消"
            onConfirm={() => toggle.mutate(c)}
            onPopupClick={(e) => e.stopPropagation()}
          >
            <Button type="link" size="small" onClick={(e) => e.stopPropagation()}>
              停用
            </Button>
          </Popconfirm>
        ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <CenterTabs />
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            能力中心
          </Typography.Title>
          <Typography.Text type="secondary">技能教 AI 怎么写，工具让 AI 能查资料、调数据。配方的每一步从这里挑。</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setFormOpen(true)}>
          登记能力
        </Button>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          title="加载失败"
          description={(error as Error)?.message ?? '请稍后重试'}
          action={
            <Button size="small" onClick={() => refetch()}>
              重新加载
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16, flexWrap: 'wrap' }}>
          <Segmented
            value={appType}
            onChange={(v) => setAppType(v as CapAppType | typeof ALL)}
            options={[{ value: ALL, label: '全部' }, ...CAP_APP_TYPES]}
          />
          <Segmented
            value={kind}
            onChange={(v) => setKind(v as CapabilityKind | typeof ALL)}
            options={[
              { value: ALL, label: '全部种类' },
              { value: 'skill', label: '技能' },
              { value: 'tool', label: '工具' },
            ]}
          />
          {appType !== ALL && Boolean(data?.hiddenCount) && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              另有 {data?.hiddenCount} 个能力不适用于{appTypeLabel(appType)}，没有列出
            </Typography.Text>
          )}
        </div>
        <Table
          rowKey="capabilityId"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          pagination={false}
          onRow={(c) => ({ onClick: () => setViewing(c.capabilityId), style: { cursor: 'pointer' } })}
          locale={{ emptyText: '没有符合条件的能力' }}
        />
      </Card>

      <CapabilityFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <CapabilityDrawer capabilityId={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
