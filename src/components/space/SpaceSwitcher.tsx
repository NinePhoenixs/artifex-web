import { useState } from 'react'
import { CheckOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Dropdown, Form, Input, Modal, Typography } from 'antd'
import type { Space } from '@/api/types'
import { createSpace } from '@/api/endpoints'
import { useSession } from '@/session/SessionContext'
import { ROLE_LABEL } from '@/session/permissions'
import { brand } from '@/theme'
import SpaceAvatar from './SpaceAvatar'

function subtitle(s: Space, full = false) {
  if (s.kind === 'personal') return '个人 · 只有你'
  return full ? `团队 · ${s.memberCount} 人 · ${ROLE_LABEL[s.role]}` : `团队 · ${ROLE_LABEL[s.role]}`
}

/** 左上角：当前空间名、类型和角色；点开切换或新建团队空间。 */
export default function SpaceSwitcher() {
  const { me, space, switchSpace } = useSession()
  const { message } = App.useApp()
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<{ name: string }>()

  const go = async (id: string) => {
    if (id === space.spaceId) return
    try {
      await switchSpace(id)
    } catch {
      message.error('切换失败，请重试')
    }
  }

  const create = async () => {
    const { name } = await form.validateFields()
    setSaving(true)
    try {
      const sp = await createSpace(name)
      setCreating(false)
      form.resetFields()
      await switchSpace(sp.spaceId)
    } catch (e) {
      form.setFields([{ name: 'name', errors: [e instanceof Error ? e.message : '创建失败'] }])
    } finally {
      setSaving(false)
    }
  }

  const items = [
    { key: 'title', type: 'group' as const, label: '切换空间', children: me.spaces.map((s) => ({
      key: s.spaceId,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', minWidth: 240 }}>
          <SpaceAvatar space={s} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{subtitle(s, true)}</Typography.Text>
          </div>
          {s.spaceId === space.spaceId && <CheckOutlined style={{ color: brand.ink }} />}
        </div>
      ),
    })) },
    { type: 'divider' as const },
    { key: 'new', icon: <PlusOutlined />, label: <span style={{ color: brand.ink }}>新建团队空间</span> },
  ]

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{ items, selectedKeys: [space.spaceId], onClick: ({ key }) => (key === 'new' ? setCreating(true) : go(key)) }}
      >
        <button
          type="button"
          style={{
            all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            margin: '16px 12px 12px', padding: '8px 10px', width: 'calc(100% - 24px)',
            border: `1px solid ${brand.line}`, borderRadius: 10,
          }}
        >
          <SpaceAvatar space={space} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{space.name}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{subtitle(space)}</Typography.Text>
          </div>
          <DownOutlined style={{ fontSize: 11, color: brand.textMuted }} />
        </button>
      </Dropdown>
      <Modal
        title="新建团队空间"
        open={creating}
        okText="创建并进入"
        confirmLoading={saving}
        onOk={create}
        onCancel={() => setCreating(false)}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          团队空间里的应用、配方、模型和生产记录，只有空间成员能看到。你会成为这个空间的所有者。
        </Typography.Paragraph>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="name"
            label="空间名称"
            extra="一般用团队或项目名，之后可以改"
            rules={[{ required: true, whitespace: true, message: '请填写空间名称' }, { max: 30, message: '最多 30 个字' }]}
          >
            <Input autoFocus maxLength={30} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
