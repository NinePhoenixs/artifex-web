import { useEffect, useState, type ReactNode } from 'react'
import { Button } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from './parts'

const LINKS: [string, string][] = [['#how', '工作原理'], ['#why', '为什么放心'], ['#api', '接入']]

/** 官网外壳：吸顶导航（滚动后半透明磨砂）+ 页脚。 */
export default function SiteLayout({ open, children }: { open: boolean; children: ReactNode }) {
  const [stuck, setStuck] = useState(false)
  const nav = useNavigate()
  useEffect(() => {
    const on = () => setStuck(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div className="ws">
      <header className={'ws-nav' + (stuck ? ' stuck' : '')}>
        <div className="ws-wrap">
          <Link to="/"><Logo /></Link>
          <nav className="ws-links">
            {LINKS.map(([to, t]) => <a key={to} href={to}>{t}</a>)}
          </nav>
          <div className="row">
            <Button type="text" onClick={() => nav('/login')}>登录</Button>
            <Button type="primary" onClick={() => nav('/register')}>{open ? '免费注册' : '用邀请码注册'}</Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="ws-foot">
        <div className="ws-wrap">
          <div className="cols" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
            <div>
              <Logo />
              <p style={{ marginTop: 14, maxWidth: 260, lineHeight: 1.8 }}>把内容生产，变成一套靠得住的流程。</p>
            </div>
            <div>
              <h5>产品</h5>
              <a href="#how">工作原理</a>
              <a href="#why">为什么放心</a>
              <a href="#api">接入</a>
            </div>
            <div>
              <h5>账号</h5>
              <Link to="/login">登录</Link>
              <Link to="/register">注册</Link>
              <Link to="/forgot-password">忘记密码</Link>
            </div>
          </div>
          <div className="copy"><span>© {new Date().getFullYear()} 稿谱</span></div>
        </div>
      </footer>
    </div>
  )
}
