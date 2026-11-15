import { Navigate, useSearchParams } from 'react-router-dom'

/** 注册和登录是同一个入口：旧的注册地址（含团队邀请链接的 ?invite=）转到登录页。 */
export default function RegisterPage() {
  const [params] = useSearchParams()
  const invite = params.get('invite')
  return <Navigate to={invite ? `/login?next=${encodeURIComponent(`/join/${invite}`)}` : '/login'} replace />
}
