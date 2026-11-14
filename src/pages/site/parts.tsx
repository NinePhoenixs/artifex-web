import { useEffect, useRef, useState, type DependencyList } from 'react'
import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import './site.css'

export const REDUCE = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 稿谱标志：超椭圆底板 |x|^5+|y|^5=1 + 三条谱线 + 一个靠在线上的音符（64 网格）；≤20px 换简化版
const PLATE64 = 'M64 32L63.95 44.06L63.8 47.89L63.56 50.64L63.21 52.83L62.77 54.67L62.21 56.25L61.55 57.62L60.76 58.81L59.86 59.86L58.81 60.76L57.62 61.55L56.25 62.21L54.67 62.77L52.83 63.21L50.64 63.56L47.89 63.8L44.06 63.95L32 64L19.94 63.95L16.11 63.8L13.36 63.56L11.17 63.21L9.33 62.77L7.75 62.21L6.38 61.55L5.19 60.76L4.14 59.86L3.24 58.81L2.45 57.62L1.79 56.25L1.23 54.67L.79 52.83L.44 50.64L.2 47.89L.05 44.06L0 32L.05 19.94L.2 16.11L.44 13.36L.79 11.17L1.23 9.33L1.79 7.75L2.45 6.38L3.24 5.19L4.14 4.14L5.19 3.24L6.38 2.45L7.75 1.79L9.33 1.23L11.17 .79L13.36 .44L16.11 .2L19.94 .05L32 0L44.06 .05L47.89 .2L50.64 .44L52.83 .79L54.67 1.23L56.25 1.79L57.62 2.45L58.81 3.24L59.86 4.14L60.76 5.19L61.55 6.38L62.21 7.75L62.77 9.33L63.21 11.17L63.56 13.36L63.8 16.11L63.95 19.94Z'

export function GaopuMark({ size = 24 }: { size?: number }) {
  const small = size <= 20
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d={PLATE64} className="gp-plate" />
      {small ? (
        <>
          <path d="M12 32H52V40H12ZM12 48H36V56H12Z" className="gp-line" />
          <circle cx="44" cy="20" r="8" className="gp-note" />
        </>
      ) : (
        <g transform="translate(32 32) scale(.9) translate(-24 -24)">
          <path d="M6 18H42V22H6ZM6 28H42V32H6ZM6 38H30V42H6Z" className="gp-line" />
          <circle cx="36" cy="12" r="6" className="gp-note" />
        </g>
      )}
    </svg>
  )
}

export function Logo({ size = 24 }: { size?: number }) {
  return <span className="ws-logo"><GaopuMark size={size} />稿谱</span>
}

/** 进场：root 下所有 [data-reveal] 进入视口时加 .in */
export function useReveal<T extends HTMLElement>(deps: DependencyList = []) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = root.querySelectorAll('[data-reveal]:not(.in)')
    if (REDUCE) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in')
        io.unobserve(e.target)
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}

/** 进入视口一次就触发 */
export function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        setSeen(true)
        io.disconnect()
      }
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, threshold])
  return [ref, seen] as const
}

/** 数字计数 */
export function Count({ to, dec = 0, prefix = '', suffix = '', dur = 1400 }: { to: number; dec?: number; prefix?: string; suffix?: string; dur?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5)
  const [v, setV] = useState(REDUCE ? to : 0)
  useEffect(() => {
    if (!seen || REDUCE) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      setV(k === 1 ? to : to * (1 - Math.pow(2, -10 * k)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, dur])
  return <span ref={ref} className="num">{prefix}{v.toFixed(dec)}{suffix}</span>
}

/** 底部深色行动区 */
export function CtaBand({ open }: { open: boolean }) {
  const nav = useNavigate()
  return (
    <section className="ws-cta ws-dark" data-reveal>
      <h2>先试产一篇看看</h2>
      <p className="dim">{open ? '注册后建好第一份配方，当场就能试产。' : '现在凭邀请码注册。被同事邀请的，直接点邀请链接即可。'}</p>
      <div className="row">
        <Button type="primary" size="large" onClick={() => nav('/register')}>{open ? '免费注册' : '用邀请码注册'}</Button>
        <Button className="ws-ghost" size="large" onClick={() => nav('/login')}>登录</Button>
      </div>
    </section>
  )
}
