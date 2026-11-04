import { useState } from 'react'
import { CheckCircleFilled, CloseCircleFilled, PlusOutlined } from '@ant-design/icons'
import {
  Alert, App, AutoComplete, Button, Card, Collapse, Form, Input, InputNumber, Modal, Popconfirm, Skeleton, Space, Switch, Table, Tag, Typography,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createModel, createProvider, listProviders, listRemoteModels, testModel, updateModel, updateProvider } from '@/api/endpoints'
import { ApiError } from '@/api/client'
import { qk } from '@/api/queryKeys'
import type { AiModel, AiProvider, ModelTestResult, ProviderInput } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import CenterTabs from '@/pages/capabilities/CenterTabs'

/**
 * 模型：厂商（接口地址、API Key、同时调用上限）下面挂模型（单价、思考模式、超时）。
 * API Key 在厂商设置里填，加密存库，页面上只显示尾号；也可以由服务器上的同名配置提供。
 */
export default function ModelListPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.providers(), queryFn: listProviders })
  const [editingProvider, setEditingProvider] = useState<AiProvider | 'new' | null>(null)
  const [editingModel, setEditingModel] = useState<{ provider: AiProvider; model?: AiModel } | null>(null)

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <CenterTabs />
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>模型</Typography.Title>
          <Typography.Text type="secondary">Agent 用哪个模型来想和写。可以接入智谱、DeepSeek、通义等兼容 OpenAI 接口的厂商。</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setEditingProvider('new')}>
          新增厂商
        </Button>
      </div>
      {isError && (
        <Alert type="error" showIcon title="加载失败" description={(error as Error)?.message} style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => refetch()}>重新加载</Button>} />
      )}
      {isLoading ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {(data?.items ?? []).map((p) => (
            <ProviderCard key={p.providerId} provider={p} onEdit={() => setEditingProvider(p)}
              onAddModel={() => setEditingModel({ provider: p })} onEditModel={(m) => setEditingModel({ provider: p, model: m })} />
          ))}
        </Space>
      )}
      <ProviderModal value={editingProvider} onClose={() => setEditingProvider(null)} />
      <ModelModal value={editingModel} onClose={() => setEditingModel(null)} />
    </div>
  )
}

function ProviderCard({ provider: p, onEdit, onAddModel, onEditModel }: {
  provider: AiProvider
  onEdit: () => void
  onAddModel: () => void
  onEditModel: (m: AiModel) => void
}) {
  const { message } = App.useApp()
  const onError = useApiError()
  const client = useQueryClient()
  const [tests, setTests] = useState<Record<string, ModelTestResult | 'running'>>({})
  const test = async (m: AiModel) => {
    setTests((t) => ({ ...t, [m.modelId]: 'running' }))
    try {
      const r = await testModel(m.modelId)
      setTests((t) => ({ ...t, [m.modelId]: r }))
    } catch (e) {
      setTests((t) => ({ ...t, [m.modelId]: { ok: false, costMs: 0, reply: '', error: (e as Error).message } }))
    }
  }
  const toggle = useMutation({
    mutationFn: (m: AiModel) => updateModel(m.modelId, { status: m.status === 'active' ? 'disabled' : 'active' }),
    onSuccess: (m) => {
      client.invalidateQueries({ queryKey: qk.providers() })
      message.success(m.status === 'active' ? '已启用' : '已停用')
    },
    onError: (e) => onError(e),
  })

  const columns: TableColumnsType<AiModel> = [
    {
      title: '模型',
      key: 'name',
      render: (_, m) => (
        <div>
          <Typography.Text strong>{m.label}</Typography.Text>
          <Typography.Text type="secondary" code style={{ marginLeft: 8, fontSize: 12 }}>{m.name}</Typography.Text>
        </div>
      ),
    },
    {
      title: '单价（元 / 千 token）',
      key: 'price',
      width: 170,
      render: (_, m) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {m.inputPricePer1k === '0' && m.outputPricePer1k === '0' ? '免费' : `输入 ${m.inputPricePer1k} · 输出 ${m.outputPricePer1k}`}
        </span>
      ),
    },
    { title: '思考模式', dataIndex: 'disableThinking', width: 90, render: (off: boolean) => (off ? '关' : '开') },
    { title: 'Agent 在用', dataIndex: 'usedByAgents', width: 110, align: 'right' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: AiModel['status']) => (s === 'active' ? <Tag color="success">可用</Tag> : <Tag>已停用</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 300,
      align: 'right',
      render: (_, m) => {
        const r = tests[m.modelId]
        return (
          <Space size={4}>
            {r && r !== 'running' && (
              r.ok ? (
                <Typography.Text type="success" style={{ fontSize: 12 }}><CheckCircleFilled /> 通了 · {(r.costMs / 1000).toFixed(1)} 秒</Typography.Text>
              ) : (
                <Typography.Text type="danger" style={{ fontSize: 12 }} title={r.error} ellipsis={{ tooltip: r.error }}>
                  <CloseCircleFilled /> {r.error.slice(0, 24)}
                </Typography.Text>
              )
            )}
            <Button size="small" type="link" loading={r === 'running'} onClick={() => test(m)}>测试连接</Button>
            <Button size="small" type="link" onClick={() => onEditModel(m)}>编辑</Button>
            {m.status === 'active' ? (
              <Popconfirm title={`停用「${m.label}」？`} description="有 Agent 在用时不能停用。" okText="停用" cancelText="取消"
                onConfirm={() => toggle.mutate(m)}>
                <Button size="small" type="link">停用</Button>
              </Popconfirm>
            ) : (
              <Button size="small" type="link" onClick={() => toggle.mutate(m)}>启用</Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Card
      title={
        <Space>
          {p.name}
          {p.status === 'disabled' && <Tag>已停用</Tag>}
          <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>{p.baseUrl}</Typography.Text>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" onClick={onEdit}>厂商设置</Button>
          <Button size="small" icon={<PlusOutlined />} onClick={onAddModel}>加模型</Button>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '10px 16px', fontSize: 12.5, color: 'rgba(0,0,0,.65)', borderBottom: '1px solid #F0F0F0' }}>
        API Key{' '}
        {p.secretSource === 'saved' ? (
          <Typography.Text type="success" style={{ fontSize: 12 }}>已保存 {p.secretHint}</Typography.Text>
        ) : p.secretSource === 'server' ? (
          <Typography.Text type="success" style={{ fontSize: 12 }}>由服务器配置提供</Typography.Text>
        ) : (
          <>
            <Typography.Text type="warning" style={{ fontSize: 12 }}>还没填，填好之前调用会失败</Typography.Text>
            <Button size="small" type="link" style={{ fontSize: 12, height: 'auto', padding: '0 4px' }} onClick={onEdit}>去填写</Button>
          </>
        )}
        <span style={{ marginLeft: 16 }}>同时调用上限 {p.maxConcurrency || '不限'}</span>
      </div>
      <Table rowKey="modelId" columns={columns} dataSource={p.models} pagination={false}
        locale={{ emptyText: '还没有模型，点右上角「加模型」' }} />
    </Card>
  )
}

function ProviderModal({ value, onClose }: { value: AiProvider | 'new' | null; onClose: () => void }) {
  const isNew = value === 'new'
  const saved = !isNew && value?.secretSource === 'saved'
  const [form] = Form.useForm()
  const client = useQueryClient()
  const { message } = App.useApp()
  const onError = useApiError()
  const save = useMutation({
    mutationFn: (v: ProviderInput) => (isNew ? createProvider(v) : updateProvider((value as AiProvider).providerId, v)),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.providers() })
      message.success('已保存')
      onClose()
    },
    onError: (e) => {
      if (e instanceof ApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      onError(e)
    },
  })
  const clearKey = useMutation({
    mutationFn: () => updateProvider((value as AiProvider).providerId, { apiKey: '' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.providers() })
      message.success('已清除 API Key')
      onClose()
    },
    onError: (e) => onError(e),
  })
  // 没填 API Key 就不传：编辑时表示不改，新建时表示先不配
  const submit = (v: ProviderInput) => {
    const body: ProviderInput = { ...v, apiKey: v.apiKey?.trim() || undefined }
    if (isNew && !v.secretRef?.trim()) delete body.secretRef
    save.mutate(body)
  }
  return (
    <Modal open={value !== null} title={isNew ? '新增厂商' : '厂商设置'} okText="保存" cancelText="取消" onCancel={onClose}
      onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden
      afterOpenChange={(o) => o && form.setFieldsValue(isNew
        ? { name: '', baseUrl: '', apiKey: '', secretRef: '', maxConcurrency: 0 }
        : { ...(value as AiProvider), apiKey: '' })}>
      <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item name="name" label="厂商名" rules={[{ required: true, message: '请填写厂商名' }]}>
          <Input placeholder="如：DeepSeek" maxLength={64} />
        </Form.Item>
        <Form.Item name="baseUrl" label="接口地址" rules={[{ required: true, message: '请填写接口地址' }]}
          extra="厂商文档里 OpenAI 兼容接口的地址，一般以 /v1 或 /v3 结尾">
          <Input placeholder="如：https://api.deepseek.com/v1" />
        </Form.Item>
        <Form.Item name="apiKey" label="API Key"
          extra={saved
            ? <>已保存 {(value as AiProvider).secretHint}，不换就留空。<Button type="link" size="small" danger
                style={{ padding: 0, height: 'auto' }} loading={clearKey.isPending} onClick={() => clearKey.mutate()}>清除</Button></>
            : '加密保存，保存后页面上只显示尾号'}>
          <Input.Password placeholder={saved ? '输入新的 API Key 替换' : '粘贴厂商控制台里的 API Key'} autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="maxConcurrency" label="同时调用上限" extra="0 表示不限。免费模型通常只允许一两个，超了会调用失败">
          <InputNumber min={0} max={50} style={{ width: 160 }} />
        </Form.Item>
        <Collapse ghost size="small" style={{ margin: '0 -16px' }} items={[{
          key: 'ref',
          label: <Typography.Text type="secondary" style={{ fontSize: 13 }}>高级：密钥名</Typography.Text>,
          children: (
            <Form.Item name="secretRef" style={{ marginBottom: 0 }}
              extra="页面上填的 API Key 存在这个名字下；服务器上配了同名的环境变量时，没在页面填也能用。不填会自动生成">
              <Input placeholder="如：DEEPSEEK_API_KEY" />
            </Form.Item>
          ),
        }]} />
      </Form>
    </Modal>
  )
}

function ModelModal({ value, onClose }: { value: { provider: AiProvider; model?: AiModel } | null; onClose: () => void }) {
  const isNew = !value?.model
  const [form] = Form.useForm()
  const client = useQueryClient()
  const { message } = App.useApp()
  const onError = useApiError()
  const providerId = value?.provider.providerId ?? ''
  // 填了 API Key 才去厂商那里拉可用模型；拉不到就手填
  const remote = useQuery({
    queryKey: qk.remoteModels(providerId),
    queryFn: () => listRemoteModels(providerId),
    enabled: value !== null && value.provider.secretConfigured,
    staleTime: 5 * 60_000,
  })
  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      isNew ? createModel({ ...v, providerId }) : updateModel(value!.model!.modelId, v),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.providers() })
      client.invalidateQueries({ queryKey: qk.agents() })
      message.success('已保存')
      onClose()
    },
    onError: (e) => {
      if (e instanceof ApiError && e.field) form.setFields([{ name: e.field, errors: [e.message] }])
      onError(e)
    },
  })
  const initial = value?.model ?? {
    name: '', label: '', inputPricePer1k: '0', outputPricePer1k: '0', maxOutputTokens: 4000, disableThinking: false, requestTimeoutSec: 90,
  }
  const names = remote.data?.items ?? []
  const nameHint = !value?.provider.secretConfigured
    ? '厂商还没填 API Key；填好后可以直接从列表里选'
    : remote.isLoading ? '正在从厂商拉取可用模型…'
      : names.length ? `从列表里选（共 ${names.length} 个），也可以照厂商文档手填`
        : (remote.data?.error || '照厂商文档里的模型名填写')
  return (
    <Modal open={value !== null} title={isNew ? `给「${value?.provider.name}」加模型` : '编辑模型'} okText="保存" cancelText="取消"
      onCancel={onClose} onOk={() => form.submit()} confirmLoading={save.isPending} destroyOnHidden width={560}
      afterOpenChange={(o) => o && form.setFieldsValue(initial)}>
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)} requiredMark={false}>
        <Form.Item name="name" label="模型" rules={[{ required: true, message: '请选择或填写模型' }]} extra={nameHint}>
          <AutoComplete
            options={names.map((n) => ({ value: n }))}
            filterOption={(input, o) => String(o?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            onSelect={(n: string) => { if (!form.getFieldValue('label')) form.setFieldValue('label', n) }}
            placeholder={names.length ? '点开选一个，或输入搜索' : '如：deepseek-chat'}
          />
        </Form.Item>
        <Form.Item name="label" label="显示名" extra="Agent 页选大脑时看到的名字，不填就用模型名">
          <Input placeholder="如：DeepSeek V3" maxLength={64} />
        </Form.Item>
        <Collapse ghost size="small" style={{ margin: '0 -16px' }} items={[{
          key: 'more',
          label: <Typography.Text type="secondary" style={{ fontSize: 13 }}>高级：单价、上限、思考模式（一般不用改）</Typography.Text>,
          forceRender: true,
          children: (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="inputPricePer1k" label="输入单价（元 / 千 token）">
                  <Input placeholder="免费或包月填 0" />
                </Form.Item>
                <Form.Item name="outputPricePer1k" label="输出单价（元 / 千 token）">
                  <Input placeholder="免费或包月填 0" />
                </Form.Item>
              </div>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                单价照厂商价格页填，用来算每篇花了多少、控制单次花费上限；填 0 就按免费算。
              </Typography.Paragraph>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="maxOutputTokens" label="单次输出上限（token）">
                  <InputNumber min={256} max={32000} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="requestTimeoutSec" label="单次调用超时（秒）">
                  <InputNumber min={10} max={600} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <Form.Item name="disableThinking" label="关闭思考模式" valuePropName="checked" style={{ marginBottom: 0 }}
                extra="有的模型会先思考再回答，生成明显偏慢时打开试试。厂商不支持时，测试连接会报错，关回去即可">
                <Switch />
              </Form.Item>
            </>
          ),
        }]} />
      </Form>
    </Modal>
  )
}
