import { useEffect, useMemo, useRef, useState } from 'react'
import type { AiRun, ProductionJob } from '@/api/types'
import { secondsText } from '@/components/usage'
import { CREW, crewMarkup } from './characters'
import { CREW_OF, type CrewSlot, crewProgress, crewSlots, revisionCount } from './derive'
import './crew.css'

/**
 * 生产进度：每一步一个角色。干活时做自己的事，做完把稿子抛给下一位，检查没过把稿子退回去，
 * 全部做完一起欢呼，然后收成一条窄带给成品让位。
 *
 * 状态由任务的步骤算出来（见 derive.ts）；这里只负责两次轮询之间状态变了时，把变化「演」出来：
 * 换状态先从当前动作缓回中立姿势再进入新状态，不硬切。
 */
export default function CrewProgress({ job, runs, size = 'md', onShowProcess }: {
  job: ProductionJob
  runs: AiRun[]
  /** sm：试产卡片里的小号，只有角色、名字和一行说明 */
  size?: 'md' | 'sm'
  onShowProcess?: () => void
}) {
  const slots = useMemo(() => crewSlots(job, runs), [job, runs])
  const ended = job.status === 'success' || job.status === 'skipped'
  const [display, setDisplay] = useState(() => slots.map((s) => classOf(s)))
  const [bubbles, setBubbles] = useState<Record<number, { text: string; on: boolean }>>({})
  const [collapse, setCollapse] = useState<'no' | 'going' | 'done'>(ended ? 'done' : 'no')

  const laneRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<SVGSVGElement>(null)
  const svgRefs = useRef<(SVGSVGElement | null)[]>([])
  const prev = useRef<{ slots: CrewSlot[]; status: string } | null>(null)
  const latest = useRef(slots)
  const timers = useRef<number[]>([])
  latest.current = slots

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    const before = prev.current
    prev.current = { slots, status: job.status }
    const quiet = size === 'sm' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // 第一次、步数变了（开了配图）、或不演动画：直接摆到位
    if (!before || before.slots.length !== slots.length || quiet) {
      setDisplay(slots.map((s) => classOf(s, job.status === 'success')))
      if (ended) setCollapse('done')
      return
    }

    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
    const ease = (i: number, cls: string) => {
      const el = svgRefs.current[i]
      if (!el) { setDisplay((d) => d.map((c, j) => (j === i ? cls : c))); return }
      const parts = el.querySelectorAll<SVGElement>('.body, .eyes, .prop')
      parts.forEach((p) => {
        const cur = getComputedStyle(p).transform
        p.style.animation = 'none'
        p.style.transform = cur === 'none' ? '' : cur
      })
      el.getBoundingClientRect()
      parts.forEach((p) => { p.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)'; p.style.transform = '' })
      at(280, () => {
        parts.forEach((p) => { p.style.animation = ''; p.style.transform = ''; p.style.transition = '' })
        setDisplay((d) => d.map((c, j) => (j === i ? cls : c)))
      })
    }
    const gesture = (i: number, cls: string, ms: number) => at(290, () => {
      const el = svgRefs.current[i]
      el?.classList.add(cls)
      at(ms, () => el?.classList.remove(cls))
    })
    const bubble = (i: number, text: string, ms = 1300) => {
      setBubbles((b) => ({ ...b, [i]: { text, on: true } }))
      at(ms, () => setBubbles((b) => ({ ...b, [i]: { text, on: false } })))
    }
    const pass = (from: number, to: number) => {
      const lane = laneRef.current, token = tokenRef.current
      if (!lane || !token?.animate) return
      const w = lane.clientWidth / slots.length, dir = to > from ? 1 : -1
      const x0 = (from + 0.5) * w + dir * 34, x1 = (to + 0.5) * w - dir * 34, y0 = 98, mx = (x0 + x1) / 2
      token.animate([
        { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(.7)`, opacity: 0 },
        { transform: `translate(${x0 + dir * 8}px, ${y0 - 14}px) rotate(${dir * 30}deg) scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${mx}px, 16px) rotate(${dir * 200}deg) scale(1.1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${x1}px, ${y0 - 6}px) rotate(${dir * 360}deg) scale(1)`, opacity: 1, offset: 0.88 },
        { transform: `translate(${x1}px, ${y0}px) rotate(${dir * 360}deg) scale(.6)`, opacity: 0 },
      ], { duration: 950, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' })
    }
    const settle = (i: number) => ease(i, classOf(latest.current[i]))

    const handled = new Set<number>()
    const rev = slots.findIndex((s) => s.step === 'review')
    const gen = slots.findIndex((s) => s.step === 'generation')
    let busyUntil = 0

    // 返修：校审摇头把稿子退回去，执笔挠头接着改
    if (rev >= 0 && before.slots[rev].state === 'work' && slots[rev].state === 'ready') {
      ease(rev, 'work reject')
      bubble(rev, '这句不行，改一下')
      ease(gen, 'ready')
      at(500, () => pass(rev, gen))
      at(1100, () => { bubble(gen, '啊？我改'); gesture(gen, 'scratch', 900) })
      at(1700, () => { settle(gen); settle(rev) })
      handled.add(rev).add(gen)
      busyUntil = 1700
    }

    slots.forEach((s, i) => {
      if (handled.has(i)) return
      const p = before.slots[i]
      if (s.state === 'work' && p.state !== 'work' && i > 0 && !handled.has(i - 1) && slots[i - 1].state === 'done') {
        // 交接：做完的转身抛稿子，下一位醒来接住，再开工
        const from = i - 1
        ease(from, 'done quiet')
        bubble(from, '交给你啦')
        gesture(from, 'toss', 650)
        ease(i, 'ready')
        at(250, () => pass(from, i))
        at(900, () => { bubble(i, '收到！'); gesture(i, 'catch', 600) })
        at(1400, () => settle(i))
        handled.add(from).add(i)
        busyUntil = Math.max(busyUntil, 1400)
      } else if (s.state !== p.state || classOf(s) !== display[i]) {
        ease(i, classOf(s))
        handled.add(i)
      }
    })

    // 收尾：小递送达，大家从右到左依次欢呼，再收成窄带
    if (job.status === 'success' && before.status !== 'success') {
      const t0 = busyUntil + 300
      at(t0, () => {
        bubble(slots.length - 1, '送达！', 1600)
        slots.forEach((_, i) => at((slots.length - 1 - i) * 140, () => ease(i, 'done')))
      })
      at(t0 + 2600, () => setCollapse('going'))
      at(t0 + 3200, () => setCollapse('done'))
    } else if (job.status === 'skipped') {
      setCollapse('done')
    }
    // display 只作比对，不触发这段：避免自己改自己
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, job.status, size])

  const n = slots.length
  const fill = crewProgress(slots)
  const center = (i: number) => `${((i + 0.5) / n) * 100}%`
  const rev = slots.findIndex((s) => s.step === 'review')
  const gen = slots.findIndex((s) => s.step === 'generation')
  const revisions = revisionCount(job)
  const looping = rev >= 0 && (slots[rev].state === 'ready' || (slots[gen].state === 'work' && slots[gen].attempt > 1))
  const working = slots.find((s) => s.state === 'work' || s.state === 'fail')
  const total = job.steps.reduce((sum, s) => sum + s.costMs, 0)

  return (
    <div className={`crew ${size}`}>
      {collapse !== 'done' && (
        <div
          ref={laneRef}
          className={`crew-lane${collapse === 'going' ? ' collapsing' : ''}`}
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          <div className="crew-track" style={{ left: center(0), right: center(0) }}>
            <div className="fill" style={{ width: `${fill * 100}%` }} />
          </div>
          {gen >= 0 && rev >= 0 && (
            <svg
              className={`crew-loop${looping ? ' on' : ''}`}
              style={{ left: center(gen), width: `${100 / n}%` }}
              viewBox="0 0 200 30"
              preserveAspectRatio="none"
            >
              <path d="M196 28 Q100 -16 4 28" fill="none" stroke="#C2412D" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              <path d="M4 28l8-2M4 28l3-7" stroke="#C2412D" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {gen >= 0 && rev >= 0 && looping && (
            <div className="crew-loop on" style={{ left: center(gen), width: `${100 / n}%` }}>
              <span>返修第 {Math.max(1, revisions)} 次</span>
            </div>
          )}
          <svg ref={tokenRef} className="crew-token" viewBox="0 0 24 28" aria-hidden>
            <path d="M4 2h11l5 5v17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill="#fff" stroke="#2C4E92" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M15 2v5h5" fill="none" stroke="#2C4E92" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M6 13h10M6 17h10M6 21h6" stroke="#D4A63A" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {slots.map((s, i) => {
            const c = CREW[CREW_OF[s.step]]
            const cls = display[i] ?? classOf(s)
            const dot = cls.split(' ')[0] === 'ready' ? 'wait' : cls.split(' ')[0]
            return (
              <div key={s.step} className={`crew-slot ${dot}`}>
                <div className="stagebox">
                  {bubbles[i] && <div className={`crew-bubble ${bubbles[i].on ? 'on' : 'out'}`}>{bubbles[i].text}</div>}
                  <svg
                    ref={(el) => { svgRefs.current[i] = el }}
                    className={`crew-ch ${c.id} ${cls}`}
                    viewBox="-24 0 168 120"
                    aria-label={`${c.name}：${s.caption}`}
                    style={{ ['--d' as string]: `-${c.delay}s` }}
                    dangerouslySetInnerHTML={{ __html: crewMarkup(c) }}
                  />
                </div>
                <div className="dot" />
                <div className="name">{c.name}</div>
                <div className="say">{s.caption}</div>
              </div>
            )
          })}
        </div>
      )}
      {size === 'sm' && collapse !== 'done' && <div className="crew-now">{working ? `${CREW[CREW_OF[working.step]].name}：${working.caption}` : ''}</div>}
      <div className={`crew-strip${collapse === 'done' ? ' on' : ''}`}>
        <div className="mini">
          {slots.map((s) => {
            const c = CREW[CREW_OF[s.step]]
            return <svg key={s.step} className={`crew-ch ${c.id}`} viewBox="-24 0 168 120" aria-hidden dangerouslySetInnerHTML={{ __html: crewMarkup(c) }} />
          })}
        </div>
        <div className="txt">
          {job.status === 'skipped' ? (
            <><b className="bad">已跳过</b>没有主题，这次没生产</>
          ) : (
            <><b>已交付</b>{n} 步全部完成，{revisions ? `检查返修 ${revisions} 次` : '没有返修'} · 用时 {secondsText(total)}</>
          )}
        </div>
        {onShowProcess && <button type="button" onClick={onShowProcess}>看生产过程 ›</button>}
      </div>
    </div>
  )
}

/** 状态 → 角色身上的样式。中间步骤做完只轻轻点头，欢呼留给最后。 */
function classOf(s: CrewSlot, finished = false): string {
  if (s.state === 'done') return finished ? 'done' : 'done quiet'
  return s.state
}
