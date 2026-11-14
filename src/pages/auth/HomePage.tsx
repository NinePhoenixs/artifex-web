import { Button } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthOptions } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import LogoDot from './LogoDot'

const STEPS = [
  { name: '找资料', sub: '联网检索' },
  { name: '写稿', sub: '按配方写' },
  { name: '配图', sub: '按版式出图' },
  { name: '检查', sub: '按审稿标准' },
]

const FEATURES = [
  { id: 'team', title: '团队一起用', sub: '建团队空间，邀请同事，各管各的配方' },
  { id: 'models', title: '接你自己的模型和工具', sub: '填上密钥就能用，密钥加密保存' },
  { id: 'api', title: '能被你的系统调用', sub: '用接口密钥，从自己的后台发起生产' },
]

/** 官网首页（简版）：没登录时打开稿谱先看到它。讲三件事：做什么、一次生产怎么跑、三个卖点。 */
export default function HomePage() {
  const navigate = useNavigate()
  const { data: options } = useQuery({ queryKey: qk.authOptions(), queryFn: getAuthOptions })
  const open = options?.registration === 'open'

  return (
    <div className="site">
      <header className="site-nav">
        <Link to="/" className="site-logo"><LogoDot size={24} />稿谱</Link>
        <nav className="site-links">
          <a href="#product">产品</a>
          <a href="#features">适合谁</a>
          <a href="#api">接入</a>
        </nav>
        <div className="site-acts">
          <Button onClick={() => navigate('/login')}>登录</Button>
          <Button type="primary" onClick={() => navigate('/register')}>注册</Button>
        </div>
      </header>

      <section className="site-hero" id="product">
        <div>
          <h1>配一次，<br />每天稳定产出能直接发的内容</h1>
          <p>把选题、资料、写法、审稿标准配成一份配方。之后每次生产，几个 AI 角色分工完成：找资料、写稿、配图、检查，全程可追踪。</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button type="primary" size="large" onClick={() => navigate('/register')}>{open ? '免费注册' : '用邀请码注册'}</Button>
            <Button size="large" onClick={() => navigate('/login')}>登录</Button>
          </div>
        </div>
        <div className="site-shot">
          <div className="site-flow">
            {STEPS.map((s, i) => (
              <div key={s.name} style={{ display: 'contents' }}>
                {i > 0 && <span className="site-arrow">›</span>}
                <div className="site-step"><b>{s.name}</b><small>{s.sub}</small></div>
              </div>
            ))}
          </div>
          <div className="site-out">
            <b>港理工 27fall 新开 AI 硕士｜先看这 3 点</b>
            <span>学制 1 年，申请 2 月 25 日截止，语言要求雅思 6.5……</span>
          </div>
        </div>
      </section>

      <section className="site-feat" id="features">
        {FEATURES.map((f) => (
          <div key={f.id} id={f.id}><b>{f.title}</b><span>{f.sub}</span></div>
        ))}
      </section>

      <footer className="site-foot">© {new Date().getFullYear()} 稿谱</footer>
    </div>
  )
}
