import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo, REDUCE } from '@/pages/site/parts'

/**
 * 登录、注册、找回密码、加入邀请共用的左右分栏（照稿谱早期产品原型）：
 * 左边标志 + 表单；右边墨谱蓝深色面板，上面一句话，中间一张循环点亮的生产任务卡。窄屏只留左边。
 */
export default function AuthLayout({ title, subtitle, panel, children }: {
  title: ReactNode
  subtitle?: ReactNode
  /** 右侧面板顶部的话；不传用默认的产品一句话 */
  panel?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="ws ws-auth v2">
      <div className="ws-auth-l">
        <Link to="/" className="ws-auth-logo"><Logo /></Link>
        <div className="ws-auth-main">
          <div className="ws-auth-form">
            <h1>{title}</h1>
            {subtitle && <div style={{ marginTop: 8, marginBottom: 28, color: 'var(--semi-color-text-2)', lineHeight: 1.7 }}>{subtitle}</div>}
            {children}
          </div>
        </div>
        <div className="ws-auth-legal" />
      </div>
      <div className="ws-auth-r ws-dark">
        <div className="ws-auth-top">
          {panel ?? (
            <>
              <h2>把内容生产，交给一套靠得住的流程</h2>
              <p className="dim">说清楚要什么内容，它自己找资料、写、检查、配图。每一篇都查得到来路。</p>
            </>
          )}
        </div>
        <div className="ws-auth-mid"><JobDemo /></div>
        <p className="dim" style={{ margin: 0, fontSize: 14, lineHeight: 1.75, maxWidth: 440 }}>
          每一步做了什么、用了哪个模型、花了多少，都留着记录。哪一步出了问题，就单独重来。
        </p>
      </div>
    </div>
  )
}

// 产品小样：一张精简的「生产任务」卡，六站逐个点亮、循环播放（示意）
const STATIONS = ['接到任务', '找资料', '写', '检查', '配图', '交付']
const DONE = STATIONS.length

function JobDemo() {
  const [cur, setCur] = useState(REDUCE ? DONE : 1)
  useEffect(() => {
    if (REDUCE) return
    const t = setTimeout(() => setCur((c) => (c >= DONE ? 0 : c + 1)), cur >= DONE ? 2800 : cur === 1 ? 1400 : 950)
    return () => clearTimeout(t)
  }, [cur])
  const done = cur >= DONE
  const status = done ? '已交付 · 检查通过' : cur === 0 ? STATIONS[0] : `正在${STATIONS[cur]}`
  return (
    <div className="ws-job-demo" role="img" aria-label={`生产任务示例：港理工 27fall 新开 AI 硕士，${status}`}>
      <div className="hd"><span>试产一篇</span><span>港校专业资讯 · 小红书笔记</span></div>
      <div className="tt">港理工 27fall 新开 AI 硕士｜先看这 3 点</div>
      <div className="st6">
        {STATIONS.map((s, i) => (
          <div key={s} className={done || i < cur ? 'on' : i === cur ? 'now' : ''}>
            <i />
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className="ft">
        <span className={'stt' + (done ? ' ok' : '')}><b />{status}</span>
        <span className="dim">{done ? '3 张配图 · 可一键复制' : '在配方页发起'}</span>
      </div>
    </div>
  )
}
