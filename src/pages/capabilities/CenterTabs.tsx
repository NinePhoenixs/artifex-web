import { Segmented } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { value: '/capabilities', label: '能力' },
  { value: '/capabilities/agents', label: 'Agent' },
  { value: '/capabilities/models', label: '模型' },
]

/** 能力中心三页的切换：能力（技能 / 工具）、Agent（大脑 + 角色 + 能力）、模型（厂商 + 模型）。 */
export default function CenterTabs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return <Segmented value={pathname} onChange={(v) => navigate(String(v))} options={TABS} style={{ marginBottom: 16 }} />
}
