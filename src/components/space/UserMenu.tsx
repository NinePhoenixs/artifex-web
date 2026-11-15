import { ControlOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/session/SessionContext'
import { brand } from '@/theme'

/** 右上角头像和称呼：账号设置、平台管理（只有平台管理员）、退出登录。 */
export default function UserMenu() {
  const { me, isPlatformAdmin, logout } = useSession()
  const navigate = useNavigate()
  const name = me.user.displayName || me.user.email
  const items = [
    { key: 'account', icon: <UserOutlined />, label: '账号设置' },
    ...(isPlatformAdmin ? [{ key: 'admin', icon: <ControlOutlined />, label: '平台管理' }] : []),
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ]
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === 'account') navigate('/account')
          if (key === 'admin') navigate('/admin')
          if (key === 'logout') void logout()
        },
      }}
    >
      <button type="button" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: '50%', background: brand.gold, color: '#fff',
            display: 'inline-grid', placeItems: 'center', fontWeight: 600,
          }}
        >
          {Array.from(name)[0]?.toUpperCase()}
        </span>
        <span>{name}</span>
      </button>
    </Dropdown>
  )
}
