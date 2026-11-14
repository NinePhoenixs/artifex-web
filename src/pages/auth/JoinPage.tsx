import { useState } from 'react'
import { Button, Result, Space, Spin, Typography } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { acceptInvite, getInvite, getMe } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { ROLE_HINT, ROLE_LABEL } from '@/session/permissions'
import AuthLayout from './AuthLayout'

/** 打开团队邀请链接：已登录确认加入；没登录先登录或注册（不要邀请码）。 */
export default function JoinPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const invite = useQuery({ queryKey: ['invite', token], queryFn: () => getInvite(token), retry: false })
  const me = useQuery({ queryKey: qk.me(), queryFn: getMe, retry: false })
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  if (invite.isPending || me.isPending) {
    return <AuthLayout title="加入团队"><Spin /></AuthLayout>
  }
  if (invite.error) {
    const msg = invite.error instanceof ApiError ? invite.error.message : '这个邀请链接已失效，请联系邀请你的人重新发一个'
    return (
      <AuthLayout title="链接已失效">
        <Result status="warning" title={msg} extra={<Link to="/login">去登录</Link>} style={{ padding: 0 }} />
      </AuthLayout>
    )
  }

  const info = invite.data
  const loggedIn = Boolean(me.data)
  const join = async () => {
    setJoining(true)
    try {
      const next = await acceptInvite(token)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      qc.setQueryData(qk.me(), next)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加入失败，请重试')
    } finally {
      setJoining(false)
    }
  }

  return (
    <AuthLayout
      title={`${info.inviterName || '同事'} 邀请你加入「${info.spaceName}」`}
      subtitle={`加入后你的角色是${ROLE_LABEL[info.role]}，${ROLE_HINT[info.role]}。`}
    >
      {error && <Typography.Paragraph type="danger">{error}</Typography.Paragraph>}
      {loggedIn ? (
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Typography.Text type="secondary">当前登录：{me.data!.user.email}</Typography.Text>
          <Button type="primary" size="large" block loading={joining} onClick={join}>
            {info.alreadyMember ? '你已在这个空间里，进入' : '加入并进入'}
          </Button>
        </Space>
      ) : (
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Button type="primary" size="large" block onClick={() => navigate(`/login?next=${encodeURIComponent(`/join/${token}`)}`)}>
            用邮箱登录并加入
          </Button>
          <Typography.Text type="secondary">没有稿谱账号也没关系，用邮箱收个验证码就能加入。</Typography.Text>
        </Space>
      )}
    </AuthLayout>
  )
}
