import { KeyOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getAuthOptions } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/session/SessionContext'
import { brand } from '@/theme'

/** 右上角头像和称呼：账号设置、邀请码（平台管理员，只在没开放注册时）、退出登录。 */
export default function UserMenu() {
  const { me, isPlatformAdmin, logout } = useSession()
  const navigate = useNavigate()
  const { data: options } = useQuery({ queryKey: qk.authOptions(), queryFn: getAuthOptions })
  // 开放注册时邀请码用不上，不放入口
  const showCodes = isPlatformAdmin && options?.registration === 'invite_only'
  const name = me.user.displayName || me.user.email
  const items = [
    { key: 'account', icon: <UserOutlined />, label: '账号设置' },
    ...(showCodes ? [{ key: 'codes', icon: <KeyOutlined />, label: '邀请码' }] : []),
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
          if (key === 'codes') navigate('/admin/invite-codes')
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
