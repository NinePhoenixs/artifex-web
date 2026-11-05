import { useState } from 'react'
import { DownloadOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Descriptions, Drawer, Form, Skeleton, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { getCapability, refreshToolActions, skillExportUrl, updateCapability } from '@/api/endpoints'
import type { Capability } from '@/api/types'
import MarkdownView from '@/components/MarkdownView'
import { qk } from '@/api/queryKeys'
import { KIND_LABEL, ORIGIN_LABEL, STATUS_META, stageLabel } from '@/constants/capability'
import { useApiError } from '@/hooks/useApiError'
import { useEnums } from '@/hooks/useEnums'
import { ActionList, toFormName } from './CapabilityFormModal'
import McpConnectFields from './McpConnectFields'
import { AUTH_LABEL, fromToolSpec, msToSec, toToolPatch, type McpFormValues } from './mcpForm'
import SkillPackage from './SkillPackage'

/**
 * 能力详情：技能看正文与版本，工具看接法与发现到的动作（可重新发现）。
 */
export default function CapabilityDrawer({ capabilityId, onClose }: { capabilityId: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const handleError = useApiError()
  const { label } = useEnums()
  const refresh = useMutation({
    mutationFn: refreshToolActions,
    onSuccess: (r) => {
      message.success(`已重新发现，共 ${r.tool?.actions?.length ?? 0} 个动作`)
      qc.setQueryData(qk.capability(r.capabilityId), r)
      qc.invalidateQueries({ queryKey: ['capabilities'] })
    },
    onError: (e) => handleError(e),
  })
  const [editing, setEditing] = useState(false)
  const { data: c, isLoading } = useQuery({
    queryKey: qk.capability(capabilityId ?? ''),
    queryFn: () => getCapability(capabilityId!),
    enabled: Boolean(capabilityId),
  })

  return (
    <Drawer open={Boolean(capabilityId)} onClose={() => { setEditing(false); onClose() }} size={560} title={c?.name ?? '能力详情'} destroyOnHidden>
      {isLoading || !c ? (
        <Skeleton active />
      ) : (
        <>
          <Typography.Paragraph type="secondary">{c.summary}</Typography.Paragraph>
          <Descriptions column={2} size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="种类">{KIND_LABEL[c.kind]}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_META[c.status].color}>{STATUS_META[c.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="适用">
              {c.appTypes.length ? c.appTypes.map((t) => label('appType', t)).join('、') : '通用'}
            </Descriptions.Item>
            <Descriptions.Item label="推荐阶段">{stageLabel(c.recommendStage)}</Descriptions.Item>
            <Descriptions.Item label="来源">{ORIGIN_LABEL[c.origin]}</Descriptions.Item>
            <Descriptions.Item label="编号">
              <Typography.Text copyable style={{ fontSize: 12 }}>
                {c.capabilityId}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          {c.skill && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>技能正文 · 第 {c.skill.version} 版</Typography.Title>
                <Button size="small" icon={<DownloadOutlined />} href={skillExportUrl(c.capabilityId)} style={{ marginLeft: 'auto' }}>
                  下载技能包
                </Button>
              </div>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                {c.skill.files.length > 0 ? '导出为标准技能包（SKILL.md + 附带文件的 zip）' : '导出为标准 SKILL.md'}，Claude、Codex、扣子等支持 Agent Skills 的工具都能直接用。
              </Typography.Paragraph>
              <SkillPackage files={c.skill.files ?? []} scan={c.skill.scan} />
              <div style={{ background: '#F6F4EF', padding: '14px 18px', borderRadius: 8 }}>
                <MarkdownView text={c.skill.body} />
              </div>
            </>
          )}

          {c.tool && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>接法</Typography.Title>
                {c.tool.provider === 'mcp' && c.origin === 'enterprise' && !editing && (
                  <Button size="small" icon={<EditOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)}>
                    修改接法
                  </Button>
                )}
              </div>
              {editing ? (
                <ToolEditor capability={c} onDone={() => setEditing(false)} />
              ) : (
                <Descriptions column={1} size="small" bordered>
                  {c.tool.provider === 'builtin' ? (
                    <Descriptions.Item label="内置标识">{c.tool.builtinKey}</Descriptions.Item>
                  ) : (
                    <>
                      <Descriptions.Item label="服务地址">
                        <Typography.Text style={{ wordBreak: 'break-all' }}>{c.tool.mcpUrl}</Typography.Text>
                        {c.tool.mcpTransport && (
                          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            连接方式自动识别为 {c.tool.mcpTransport}
                          </Typography.Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="鉴权方式">
                        {AUTH_LABEL[c.tool.authType ?? 'none']}
                        {c.tool.authParam && (c.tool.authType === 'header' || c.tool.authType === 'query') && (
                          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                            {c.tool.authType === 'header' ? '请求头' : '参数'} {c.tool.authParam}
                          </Typography.Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="密钥">
                        {(c.tool.authType ?? 'none') === 'none'
                          ? '不需要'
                          : c.tool.secretConfigured
                            ? `已保存 ${c.tool.secretHint ?? ''}`
                            : <Typography.Text type="danger">还没填，连不上</Typography.Text>}
                      </Descriptions.Item>
                    </>
                  )}
                  <Descriptions.Item label="超时">{msToSec(c.tool.timeoutMs)} 秒</Descriptions.Item>
                </Descriptions>
              )}
              {c.tool.provider === 'mcp' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 8px' }}>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      提供的动作 · {c.tool.actions?.length ?? 0}
                    </Typography.Title>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={refresh.isPending}
                      style={{ marginLeft: 'auto' }}
                      onClick={() => refresh.mutate(c.capabilityId)}
                    >
                      重新发现
                    </Button>
                  </div>
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                    AI 看到的就是这些说明。配方里可以只开放其中几个。
                  </Typography.Paragraph>
                  <ActionList actions={c.tool.actions ?? []} />
                </>
              )}
            </>
          )}
        </>
      )}
    </Drawer>
  )
}

/** 修改 MCP 工具的接法。保存时服务端会重新连一次、刷新动作；连不上不生效，错误标在对应输入框上。 */
function ToolEditor({ capability: c, onDone }: { capability: Capability; onDone: () => void }) {
  const [form] = Form.useForm<McpFormValues>()
  const [cleared, setCleared] = useState(false)
  const { message } = App.useApp()
  const qc = useQueryClient()
  const handleError = useApiError()
  const save = useMutation({
    mutationFn: (v: McpFormValues) => updateCapability(c.capabilityId, { tool: toToolPatch(v, cleared) }),
    onSuccess: (r) => {
      message.success(`已保存，重新连上了，共 ${r.tool?.actions?.length ?? 0} 个动作`)
      qc.setQueryData(qk.capability(r.capabilityId), r)
      qc.invalidateQueries({ queryKey: ['capabilities'] })
      onDone()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.field) {
        form.setFields([{ name: toFormName(err.field)[0] as keyof McpFormValues, errors: [err.message] }])
        return
      }
      handleError(err)
    },
  })
  return (
    <Form form={form} layout="vertical" initialValues={fromToolSpec(c.tool!)} onFinish={(v) => save.mutate(v)} requiredMark={false}>
      <McpConnectFields
        saved={c.tool?.secretConfigured ? c.tool.secretHint || '密钥' : undefined}
        cleared={cleared}
        onClearKey={() => setCleared(true)}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onDone}>取消</Button>
        <Button type="primary" htmlType="submit" loading={save.isPending}>保存并重新连接</Button>
      </div>
    </Form>
  )
}
