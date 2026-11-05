import { useState } from 'react'
import { BookOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Agent } from '@/api/types'
import { USAGE_LABEL } from '@/constants/stage'
import { useAgents } from '@/hooks/useAgents'
import CenterTabs from '@/pages/capabilities/CenterTabs'
import AgentDrawer from './AgentDrawer'

/**
 * Agent = 一个大脑（模型）+ 角色说明 + 可选的能力。配方的每一步选一个 Agent 来做，
 * 平台自带采风、执笔、校审、画师等；想让某一步换模型或换身份，才在这里新建。
 */
export default function AgentListPage() {
  const { data, isLoading, isError, error, refetch } = useAgents()
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  const columns: TableColumnsType<Agent> = [
    {
      title: 'Agent',
      key: 'name',
      render: (_, a) => (
        <div>
          <Typography.Text strong>{a.name}</Typography.Text>
          {a.origin === 'platform' && <Tag style={{ marginLeft: 8 }}>平台自带</Tag>}
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{a.description}</Typography.Text>
        </div>
      ),
    },
    { title: '大脑', dataIndex: 'modelLabel', width: 190 },
    {
      title: '自带能力',
      key: 'caps',
      render: (_, a) =>
        a.capabilities.length === 0 ? (
          <Typography.Text type="secondary">无</Typography.Text>
        ) : (
          a.capabilities.map((c) => (
            <Tag key={c.capabilityId} icon={c.kind === 'tool' ? <ToolOutlined /> : <BookOutlined />}>{c.name ?? c.capabilityId}</Tag>
          ))
        ),
    },
    {
      title: '常用在',
      key: 'stage',
      width: 100,
      render: (_, a) => (a.recommendStage ? USAGE_LABEL[a.recommendStage] : '不限'),
    },
    {
      title: '配方在用',
      dataIndex: 'usedByRecipes',
      width: 96,
      align: 'right',
      render: (n: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: Agent['status']) => (s === 'active' ? <Tag color="success">可用</Tag> : <Tag>已停用</Tag>),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <CenterTabs />
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Agent</Typography.Title>
          <Typography.Text type="secondary">
            配方里每一步由一个 Agent 来做，比如采风找资料、执笔写稿。一般用平台自带的就够了，要换模型或固定带某些能力时再新建。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setEditing('new')}>
          新建 Agent
        </Button>
      </div>
      {isError && (
        <Alert type="error" showIcon title="加载失败" description={(error as Error)?.message} style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => refetch()}>重新加载</Button>} />
      )}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="agentId"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          pagination={false}
          onRow={(a) => ({ onClick: () => setEditing(a.agentId), style: { cursor: 'pointer' } })}
        />
      </Card>
      <AgentDrawer agentId={editing} onClose={() => setEditing(null)} onCreated={(id) => setEditing(id)} />
    </div>
  )
}
