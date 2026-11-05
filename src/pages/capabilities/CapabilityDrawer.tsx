import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Descriptions, Drawer, Skeleton, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCapability, refreshToolActions, skillExportUrl } from '@/api/endpoints'
import MarkdownView from '@/components/MarkdownView'
import { qk } from '@/api/queryKeys'
import { KIND_LABEL, ORIGIN_LABEL, STATUS_META, stageLabel } from '@/constants/capability'
import { useApiError } from '@/hooks/useApiError'
import { useEnums } from '@/hooks/useEnums'
import { ActionList } from './CapabilityFormModal'
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
  const { data: c, isLoading } = useQuery({
    queryKey: qk.capability(capabilityId ?? ''),
    queryFn: () => getCapability(capabilityId!),
    enabled: Boolean(capabilityId),
  })

  return (
    <Drawer open={Boolean(capabilityId)} onClose={onClose} size={560} title={c?.name ?? '能力详情'} destroyOnHidden>
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
              <Typography.Title level={5}>接法</Typography.Title>
              <Descriptions column={1} size="small" bordered>
                {c.tool.provider === 'builtin' ? (
                  <Descriptions.Item label="内置标识">{c.tool.builtinKey}</Descriptions.Item>
                ) : (
                  <>
                    <Descriptions.Item label="接入地址">{c.tool.mcpUrl}</Descriptions.Item>
                    <Descriptions.Item label="传输方式">{c.tool.mcpTransport}</Descriptions.Item>
                    <Descriptions.Item label="密钥名">{c.tool.secretRef || '不需要'}</Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="超时">{c.tool.timeoutMs} 毫秒</Descriptions.Item>
              </Descriptions>
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
