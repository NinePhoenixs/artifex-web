import { Collapse, Form, Input, InputNumber, Segmented, Typography } from 'antd'
import type { McpAuthType } from '@/api/types'
import { AUTH_OPTIONS, authParamMeta } from './mcpForm'

/**
 * 接 MCP 服务要填的几项：地址、鉴权方式、密钥、（高级）超时。传输方式由服务端自动识别，不让人选。
 * saved：修改已登记的工具时，密钥已保存的尾号；登记新工具时不传。
 */
export default function McpConnectFields({ saved, onClearKey, cleared }: { saved?: string; onClearKey?: () => void; cleared?: boolean }) {
  const form = Form.useFormInstance()
  const authType = (Form.useWatch('authType', form) ?? 'none') as McpAuthType
  const param = authParamMeta(authType)
  const hasSaved = Boolean(saved) && !cleared
  return (
    <>
      <Form.Item
        name="mcpUrl"
        label="服务地址"
        rules={[{ required: true, whitespace: true, message: '请填写服务地址' }, { type: 'url', message: '地址格式不对' }]}
      >
        <Input placeholder="https://…/mcp" />
      </Form.Item>
      <Form.Item name="authType" label="鉴权方式" extra="照服务商文档选；不确定时多半是 Bearer Token">
        <Segmented options={AUTH_OPTIONS} />
      </Form.Item>
      {authType !== 'none' && (
        <div style={{ display: 'grid', gridTemplateColumns: param ? '180px 1fr' : '1fr', gap: 16 }}>
          {param && (
            <Form.Item
              name="authParam"
              label={param.label}
              rules={[{ required: true, whitespace: true, message: `请填写${param.label}` }, { max: 64 }]}
            >
              <Input placeholder={param.placeholder} />
            </Form.Item>
          )}
          <Form.Item
            name="apiKey"
            label="密钥"
            extra={
              hasSaved ? (
                <>
                  已保存 {saved}，不改就留空
                  {onClearKey && (
                    <Typography.Link onClick={onClearKey} style={{ marginLeft: 8, fontSize: 'inherit' }}>
                      清除
                    </Typography.Link>
                  )}
                </>
              ) : (
                '密钥加密保存在平台里，填好马上生效'
              )
            }
            rules={hasSaved ? [] : [{ required: true, whitespace: true, message: '请粘贴密钥' }]}
          >
            <Input.Password placeholder={hasSaved ? '留空 = 沿用已保存的密钥' : '粘贴服务商给的密钥'} autoComplete="new-password" />
          </Form.Item>
        </div>
      )}
      <Collapse
        ghost
        size="small"
        style={{ margin: '-8px 0 8px -16px' }}
        items={[{
          key: 'adv',
          label: <Typography.Text type="secondary" style={{ fontSize: 13 }}>高级</Typography.Text>,
          forceRender: true,
          children: (
            <Form.Item name="timeoutSec" label="单次调用超时（秒）" style={{ marginBottom: 0 }} extra="调用这个服务的一个动作最多等多久">
              <InputNumber min={1} max={600} style={{ width: 160 }} />
            </Form.Item>
          ),
        }]}
      />
    </>
  )
}
