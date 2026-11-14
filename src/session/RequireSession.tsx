import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { App, Spin } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, setCurrentSpace, setSpaceGoneHandler, setUnauthorizedHandler } from '@/api/client'
import { getMe, logout as logoutApi, updateMe } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import HomePage from '@/pages/auth/HomePage'
import { SessionContext, type Session } from './SessionContext'
import { permissionsOf } from './permissions'

/** 登录页地址：带上现在的位置，登录后回来。 */
export function loginPath(next: string) {
  return next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'
}

/**
 * 登录后的页面都包在它里面：取我是谁，定当前空间，没登录就去登录页。
 * 当前空间在子组件发请求之前就设好，业务接口自动带上 X-Space-Id。
 */
export default function RequireSession({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const { data: me, error, isPending } = useQuery({ queryKey: qk.me(), queryFn: getMe, retry: false, staleTime: 60_000 })

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // 本来就没登录：交给下面的渲染（首页看官网，别的页去登录）；登录过期才在这里跳
      if (!qc.getQueryData(qk.me())) return
      qc.clear()
      navigate(loginPath(window.location.pathname + window.location.search), { replace: true })
    })
    // 被移出了当前空间：重新取我在哪些空间（后端会把最后用的空间退回个人空间），清掉旧空间的缓存
    let handled = false
    setSpaceGoneHandler(() => {
      if (handled) return
      handled = true
      message.warning('你已不在这个空间，已回到个人空间')
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      void qc.invalidateQueries({ queryKey: qk.me() }).finally(() => { handled = false })
      navigate('/', { replace: true })
    })
    return () => {
      setUnauthorizedHandler(null)
      setSpaceGoneHandler(null)
    }
  }, [navigate, qc, message])

  const space = me?.spaces.find((s) => s.spaceId === me.lastSpaceId) ?? me?.spaces[0]
  // 渲染子组件前同步设好：子组件第一次请求就要带上空间
  setCurrentSpace(space?.spaceId ?? '')

  const switchSpace = useCallback(async (spaceId: string) => {
    const next = await updateMe({ lastSpaceId: spaceId })
    setCurrentSpace(spaceId)
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    qc.setQueryData(qk.me(), next)
    navigate('/')
  }, [navigate, qc])

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: qk.me() })
  }, [qc])

  const logout = useCallback(async () => {
    await logoutApi().catch(() => undefined)
    qc.clear()
    navigate('/login', { replace: true })
  }, [navigate, qc])

  const session = useMemo<Session | null>(() => {
    if (!me || !space) return null
    return { me, space, can: permissionsOf(space.role), isPlatformAdmin: me.user.isPlatformAdmin, switchSpace, refresh, logout }
  }, [me, space, switchSpace, refresh, logout])

  if (isPending) {
    return <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}><Spin /></div>
  }
  if (error instanceof ApiError && error.status === 401) {
    // 没登录打开首页：看官网；打开别的页面：去登录，登录后回来
    if (pathname === '/') return <HomePage />
    return <Navigate to={loginPath(pathname + search)} replace />
  }
  if (!session) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'rgba(0,0,0,.45)' }}>
        {error ? '暂时连不上服务，请稍后刷新' : '没有可用的空间，请联系平台管理员'}
      </div>
    )
  }
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
