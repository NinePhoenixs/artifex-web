import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Input, Tag } from 'antd'
import {
  AppstoreOutlined, ArrowRightOutlined, AuditOutlined, BookOutlined, CheckCircleOutlined, CheckOutlined,
  ClockCircleOutlined, FileTextOutlined, HomeOutlined, PictureOutlined, ProfileOutlined, ToolOutlined, VideoCameraOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { getAuthOptions } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import SiteLayout from './SiteLayout'
import { Count, CtaBand, REDUCE, sleep, useInView, useReveal } from './parts'

/* ---------------- 演示数据：一篇港校专业资讯的小红书笔记 ---------------- */
const TRY = ['港校新开专业介绍', '新品上架种草笔记', '每周行业简报']
const heroTitleFor = (text: string) => {
  if (/周报|简报/.test(text)) return '第 46 周家居行业简报'
  if (/新品|种草|商品/.test(text)) return '一条毯子，从沙发盖到午睡'
  return '港理工 27fall 新开 AI 硕士｜先看这 3 点'
}
const AW_STEPS: [string, string][] = [
  ['接到任务', '试产一篇 · 港校专业资讯'], ['找资料', '联网 3 次 · 读网页 5 篇'], ['写 · 第 1 稿', '小红书笔记 · 486 字'],
  ['检查 · 第 1 轮', '有个日期没来源 → 退回'], ['写 · 第 2 稿', '带着修改意见'], ['检查 · 第 2 轮', '全部通过'],
  ['配图', '3 张 · 3:4'], ['交付', '成品页 · 一键复制'],
]
const DEMO_TEXT = '📌 港理工今年新开了人工智能硕士，学制 1 年。申请 2 月 25 日截止，雅思总分 6.5、单项 5.5。课程分机器学习和应用两条线，适合想快速转方向的同学。'
const WORDS = DEMO_TEXT.match(/.{1,3}/gu) ?? []
const DEMO_CHECKS = ['日期和分数都能在资料里找到', '没有绝对化用语', '分点短，不挤成一行', '符合小红书笔记版式']
const PIN: [string, string][] = [
  ['接到任务', '试产一篇 · 港校专业资讯'], ['找资料', '联网 3 次 · 读网页 5 篇 · 41 秒'], ['写', '第 1 稿 486 字 · 第 2 稿 502 字'],
  ['检查', '第 1 轮退回 · 第 2 轮全部通过'], ['配图', '3 张 · 3:4 · 单张失败不影响成稿'], ['交付', '成品页 · 一键复制 · 打包下载图片'],
]
const STORY: [string, string, string][] = [
  ['01 · 接到任务', '在控制台点一下，或者由你的系统发起', '在配方页点「试产一篇」，或者由你的业务系统调用接口。不管从哪进来，都变成同一种「生产任务」。'],
  ['02 · 找资料', '搜几轮、读哪些网页，AI 自己判断', '你在配方里说资料从哪来、要多严谨。它会拆关键词、联网搜索、读网页，够了就停，每条资料都记下出处。'],
  ['03 · 写', '照配方写', '配方像交代新同事一样，写清楚目标、读者、写法和不要做的事。版式规则自动带上，不用每次重复。'],
  ['04 · 检查', '逐条对照审稿标准', '资料里查不到的数字、绝对化用语、版式问题，一条条列出来。能改的带着修改意见自动返修。'],
  ['05 · 配图', '按版式出图', '检查通过后，按配方定的张数、比例和风格画图。单张没画出来，不影响成稿交付。'],
  ['06 · 交付', '成品页里直接拿走', '成稿一键复制，图片打包下载。每一步做了什么、用了哪个模型、花了多少，都留着记录。'],
]
const PD_TEXT = '写港校新开专业的介绍，发小红书，读者是准备申请的本科生。日期和分数不能编。'
const PD_Q: [string, string[]][] = [['资料从哪来？', ['联网搜索', '学校官网']], ['用哪个版式？', ['小红书笔记']], ['要配图吗？', ['3 张 · 3:4']]]
const PD_DOC: [string, ReactNode][] = [
  ['目标与读者', <>为 <span className="ws-ref">{'{{主题}}'}</span> 写一篇小红书笔记，读者是准备申请港校硕士的本科生。</>],
  ['资料怎么找、怎么用', <>截止日期、语言分数、学费只能来自 <span className="ws-ref">学校官网</span>，查不到的就不写。</>],
  ['写作要求', '口吻像学姐分享，标题不超过 20 字；先讲最关心的三件事：学制、截止日期、语言要求。'],
  ['输出结构', '标题（3 个备选）/ 正文 / 5～8 个话题标签 / 配图建议'],
  ['不要做的事', '不用“最”“第一”；不承诺录取；不写没有出处的数字。'],
]
const SRC: [string, string, string][] = [
  ['1', '港理工研究生院 · 课程页', '申请截止 2026 年 2 月 25 日'],
  ['2', '港理工 · 入学要求', '雅思总分 6.5，单项 5.5'],
  ['3', '某学长的分享帖', '唯一来源，已标注'],
]
const ORBIT = ['联网搜索', 'MCP 工具', '小红书写法', '去除 AI 味', '配图']
const FORMS: [ReactNode, string, boolean][] = [
  [<FileTextOutlined />, '小红书笔记', false], [<ProfileOutlined />, '公众号长文', false],
  [<VideoCameraOutlined />, '视频脚本', true], [<PictureOutlined />, '图文海报', true],
]

/* ---------------- 产品窗口：随滚动展开，循环演示一次生产 ---------------- */
function ProductWindow({ title, runKey }: { title: string; runKey: number }) {
  const winRef = useRef<HTMLDivElement>(null)
  const [steps, setSteps] = useState<string[]>(() => AW_STEPS.map(() => ''))
  const [st, setSt] = useState<[string, string]>(['blue', '正在找资料'])
  const [n, setN] = useState(0)
  const [caret, setCaret] = useState(false)
  const [chk, setChk] = useState(0)

  useEffect(() => {
    const w = winRef.current
    if (!w || REDUCE) return
    const on = () => {
      const r = w.getBoundingClientRect()
      const vh = window.innerHeight
      const k = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.9)))
      const e = 1 - Math.pow(1 - k, 3)
      w.style.transform = `rotateX(${(1 - e) * 16}deg) scale(${0.9 + e * 0.1}) translateY(${(1 - e) * 30}px)`
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const guard = () => {
      if (!alive) throw new Error('stop')
    }
    const mark = (i: number, v: string) => setSteps((s) => s.map((x, j) => (j === i ? v : x)))
    const go = async (i: number, cls = 'done', wait = 520) => {
      guard(); mark(i, 'now'); await sleep(wait); guard(); mark(i, cls)
    }
    const run = async (): Promise<void> => {
      setSteps(AW_STEPS.map(() => '')); setN(0); setCaret(false); setChk(0)
      setSt(['blue', '正在找资料'])
      await go(0); await go(1, 'done', 900)
      setSt(['blue', '正在写']); mark(2, 'now')
      if (REDUCE) setN(WORDS.length)
      else for (let i = 1; i <= WORDS.length; i++) { guard(); setN(i); await sleep(38) }
      guard(); setCaret(true); mark(2, 'done')
      setSt(['orange', '检查中']); await go(3, 'back', 700)
      await go(4, 'done', 500)
      mark(5, 'now')
      for (let i = 1; i <= DEMO_CHECKS.length; i++) { guard(); setChk(i); await sleep(360) }
      guard(); mark(5, 'done')
      setSt(['blue', '正在配图']); await go(6, 'done', 800)
      await go(7, 'done', 500)
      setSt(['green', '已交付'])
      await sleep(4200); guard()
      return run()
    }
    const t = setTimeout(() => run().catch(() => {}), runKey ? 150 : 900)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [runKey])

  const SB: [ReactNode, string, boolean?][] = [
    [<HomeOutlined />, '工作台'], [<AuditOutlined />, '待复核'], ['内容生产', ''], [<AppstoreOutlined />, '应用'],
    [<ClockCircleOutlined />, '生产记录', true], [<BookOutlined />, '模板库'], [<ToolOutlined />, '能力中心'],
  ]
  return (
    <div className="ws-shot">
      <div className="ws-win" ref={winRef}>
        <div className="chrome"><i /><i /><i /><span className="url">稿谱 / 生产记录 / {title}</span></div>
        <div className="ws-aw">
          <div className="ws-aw-sb">
            {SB.map(([icon, label, on]) => (label === ''
              ? <div key={String(icon)} className="gp">{icon}</div>
              : <div key={label} className={'it' + (on ? ' on' : '')}>{icon}{label}</div>))}
          </div>
          <div className="ws-aw-steps">
            <div className="cap">一次生产 · 港校专业资讯</div>
            {AW_STEPS.map((s, i) => (
              <div key={i} className={'ws-step ' + steps[i]}>
                <span className="nd">{steps[i] === 'done' ? <CheckOutlined style={{ fontSize: 9 }} /> : steps[i] === 'back' ? '↺' : null}</span>
                <div><b>{s[0]}</b><small>{s[1]}</small></div>
              </div>
            ))}
          </div>
          <div className="ws-aw-main">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="ttl">{title}</span>
              <Tag color={st[0]} variant="filled">{st[1]}</Tag>
            </div>
            <div className="ws-stream">
              {WORDS.slice(0, n).map((w, i) => <span key={i} className="w">{w}</span>)}
              {caret ? <span className="ws-caret" /> : null}
            </div>
            <div className="ws-chk">
              {DEMO_CHECKS.slice(0, chk).map((c) => <div key={c}><CheckCircleOutlined />{c}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 一条线，六个站：左边钉住，右边随滚动讲 ---------------- */
function Story() {
  const [act, setAct] = useState(0)
  const stepsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = stepsRef.current?.querySelectorAll<HTMLElement>('.st-b') ?? []
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) setAct(Number((e.target as HTMLElement).dataset.i))
    }), { rootMargin: '-45% 0px -45% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <section className="ws-sec" id="how">
      <div className="ws-wrap">
        <div className="ws-h" data-reveal>
          <div className="ws-kick">一条线，六个站</div>
          <h2>每一次生产，都沿着同一条线走完</h2>
          <p>不管是有人点一下，还是业务系统调用，进来之后都走同一条流程。每一站都留记录，哪一站出了问题就单独重来。</p>
        </div>
        <div className="ws-story">
          <div className="ws-pin">
            <div className="ws-pin-line">
              <svg preserveAspectRatio="none" viewBox="0 0 4 100">
                <line className="bg" x1="2" y1="0" x2="2" y2="100" />
                <line className="fg" x1="2" y1="0" x2="2" y2="100" pathLength={100} strokeDasharray="100" style={{ strokeDashoffset: 100 - act * 20 }} />
              </svg>
              {PIN.map((p, i) => (
                <div key={i} className={'ws-pin-st' + (i < act ? ' lit' : '') + (i === act ? ' now' : '')} style={{ top: `calc(${i} * (100% - 64px) / 5)` }}>
                  <div className="nd"><i /></div>
                  <div className="ws-pin-card"><b>{p[0]}</b><div>{p[1]}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="ws-story-steps" ref={stepsRef}>
            {STORY.map((s, i) => (
              <div key={i} className={'st-b' + (i === act ? ' on' : '')} data-i={i}>
                <div className="n">{s[0]}</div><h3>{s[1]}</h3><p>{s[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 说一句话，AI 起草配方 ---------------- */
function PromptDoc() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35)
  const [typed, setTyped] = useState(0)
  const [q, setQ] = useState(0)
  const [doc, setDoc] = useState(0)
  useEffect(() => {
    if (!seen) return
    let alive = true
    void (async () => {
      if (REDUCE) {
        setTyped(PD_TEXT.length); setQ(3); setDoc(PD_DOC.length)
        return
      }
      for (let i = 1; i <= PD_TEXT.length && alive; i++) { setTyped(i); await sleep(42) }
      for (let i = 1; i <= 3 && alive; i++) { await sleep(380); if (alive) setQ(i) }
      for (let i = 1; i <= PD_DOC.length && alive; i++) { await sleep(300); if (alive) setDoc(i) }
    })()
    return () => {
      alive = false
    }
  }, [seen])
  const done = doc >= PD_DOC.length
  return (
    <section className="ws-sec ws-band">
      <div className="ws-wrap">
        <div className="ws-h" data-reveal>
          <div className="ws-kick">不用从空白写起</div>
          <h2>说一句话，AI 帮你起草配方</h2>
          <p>在配方页点「AI 生成」，说清楚要写什么，它按目标、资料、写法、结构和禁忌起草一份。不满意就让它优化，或者自己改。</p>
        </div>
        <div className="ws-pd" ref={ref}>
          <div className="ws-pd-left">
            <div className="lab">你说</div>
            <div className="ws-pd-typed">{PD_TEXT.slice(0, typed)}{q < 3 ? <span className="ws-caret" /> : null}</div>
            <div className="ws-pd-q">
              {PD_Q.map(([t, tags], i) => (
                <div key={t} className={'q' + (i < q ? ' in' : '')}>
                  <div className="muted">{t}</div>
                  <div className="tags">{tags.map((x) => <Tag key={x} color="blue" variant="filled">{x}</Tag>)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ws-pd-doc">
            <div className="hd">
              <span className="row"><FileTextOutlined style={{ color: 'var(--gp-ink)' }} /><b>配方 · 港校专业资讯</b></span>
              <Tag color={done ? 'blue' : 'default'} variant="filled">{done ? 'AI 起草 · 待你确认' : '起草中…'}</Tag>
            </div>
            {PD_DOC.map(([h, p], i) => (
              <div key={h} className={'sec' + (i < doc ? ' in' : '')}><h5>{h}</h5><p>{p}</p></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 六宫格：为什么敢放手 ---------------- */
function Bento() {
  const [hl, setHl] = useState<string | null>(null)
  const onMove = (e: React.PointerEvent) => {
    const b = (e.target as HTMLElement).closest?.('.ws-bn') as HTMLElement | null
    if (!b) return
    const r = b.getBoundingClientRect()
    b.style.setProperty('--x', `${e.clientX - r.left}px`)
    b.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  const cite = (n: string) => (
    <sup style={{ cursor: 'pointer', color: 'var(--gp-ink)', fontWeight: 600, padding: '0 2px' }}
      onMouseEnter={() => setHl(n)} onMouseLeave={() => setHl(null)} onClick={() => setHl(n)}>[{n}]</sup>
  )
  return (
    <section className="ws-sec" id="why">
      <div className="ws-wrap">
        <div className="ws-h" data-reveal>
          <div className="ws-kick">为什么敢放手</div>
          <h2>AI 能干活，也要让人放心</h2>
        </div>
        <div className="ws-bento" onPointerMove={onMove}>
          <div className="ws-bn w4" data-reveal>
            <h3>每一篇都查得到来路</h3>
            <p>找资料时每条都记下出处，检查时逐条核对。资料里查不到的数字会被挑出来，带着意见返修。</p>
            <div className="ws-bn-src">
              <div>
                <p style={{ fontSize: 15, lineHeight: 1.9, margin: 0 }}>
                  申请 2 月 25 日截止{cite('1')}，雅思总分 6.5、单项 5.5{cite('2')}。
                  <span style={{ background: 'rgba(196,122,44,.14)', borderRadius: 3 }}>听学长说今年会扩招</span>{cite('3')}。
                </p>
                <div className="row" style={{ flexWrap: 'wrap', marginTop: 10 }}>
                  <Tag color="green" variant="filled">有来源 · 2 处</Tag>
                  <Tag color="orange" variant="filled">单一来源 · 1 处</Tag>
                </div>
              </div>
              <div>
                {SRC.map((s) => (
                  <div key={s[0]} className={'ws-srcc' + (hl === s[0] ? ' hl' : '')}>
                    <span className="n">{s[0]}</span>
                    <div><b>{s[1]}</b><div className="muted" style={{ marginTop: 3 }}>{s[2]}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ws-bn w2" data-reveal="2">
            <h3>花多少，看得见</h3>
            <p>每篇用了哪个模型、多少 token、花了多少钱，都记在生产记录里。</p>
            <div className="ws-bignum"><Count to={0.21} dec={2} prefix="¥" /></div>
            <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>示例：一篇小红书笔记</div>
            <svg className="ws-spark" viewBox="0 0 200 70" preserveAspectRatio="none">
              <path className="a" d="M0 50 L25 44 L50 48 L75 36 L100 40 L125 28 L150 32 L175 22 L200 26 L200 70 L0 70Z" />
              <path className="l" pathLength={400} d="M0 50 L25 44 L50 48 L75 36 L100 40 L125 28 L150 32 L175 22 L200 26" />
            </svg>
          </div>
          <div className="ws-bn w2" data-reveal>
            <h3>团队一起用</h3>
            <p>建团队空间，邀请同事。各空间的配方和成稿互相看不见。</p>
            <div className="viz" style={{ display: 'grid', gap: 8 }}>
              {[['管理员', '接模型、管成员和密钥'], ['编辑者', '配应用、配方和 Agent'], ['成员', '用配方生产、看成稿']].map(([r, d]) => (
                <div key={r} className="ws-rq"><Tag color="blue" variant="filled">{r}</Tag><span>{d}</span></div>
              ))}
            </div>
          </div>
          <div className="ws-bn w2" data-reveal="2">
            <h3>AI 不只有提示词</h3>
            <p>联网搜索、技能、MCP 工具、你们自己的系统，都能接进来。</p>
            <div className="viz ws-orbit">
              <div className="ring">
                {ORBIT.map((t, i) => {
                  const a = (i / ORBIT.length) * Math.PI * 2 - Math.PI / 2
                  return <span key={t} style={{ left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%` }}>{t}</span>
                })}
              </div>
              <div className="ctr">AI</div>
            </div>
          </div>
          <div className="ws-bn w2" data-reveal="3">
            <h3>接你自己的模型</h3>
            <p>智谱、DeepSeek、通义、火山方舟……兼容 OpenAI 接口的都能接。</p>
            <ul className="ws-rules">
              {['填上密钥就能用，密钥加密保存', '平台提供的模型可以直接试', '每次调用都记下用量'].map((r) => <li key={r}><CheckOutlined />{r}</li>)}
            </ul>
          </div>
          <div className="ws-bn w3" data-reveal id="api">
            <h3>三行代码，接进你的系统<span className="ws-soon">即将开放</span></h3>
            <p>业务系统发一个请求，产完来取成稿。运营在控制台改配方，你不用跟着改代码。</p>
            <pre className="viz" style={{ margin: '22px 0 0', padding: '14px 16px', borderRadius: 10, background: 'var(--semi-color-fill-0)', fontSize: 12.5, lineHeight: 1.7, overflow: 'auto' }}>
              {'curl -X POST https://<你的稿谱地址>/v1/production-jobs \\\n  -H "Authorization: Bearer <接口密钥>" \\\n  -d \'{"appId":"…","topic":"港理工 27fall 新开 AI 硕士"}\''}
            </pre>
          </div>
          <div className="ws-bn w3" data-reveal="2">
            <h3>同一个应用，产不同形态</h3>
            <p>换一份配方就换一种写法和版式，应用本身不用改。</p>
            <div className="viz ws-forms">
              {FORMS.map(([icon, t, soon]) => (
                <span key={t} style={soon ? { color: 'var(--semi-color-text-3)' } : undefined}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, display: 'inline-grid', placeItems: 'center', background: 'var(--semi-color-fill-0)' }}>{icon}</span>
                  {t}{soon ? '（规划中）' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** 官网首页：没登录时打开稿谱先看到它（照稿谱早期产品原型）。 */
export default function HomePage() {
  const root = useReveal<HTMLDivElement>()
  const { data: options } = useQuery({ queryKey: qk.authOptions(), queryFn: getAuthOptions })
  const open = options?.registration === 'open'
  const [ask, setAsk] = useState('写港校新开专业的介绍，发小红书')
  const [title, setTitle] = useState(heroTitleFor(''))
  const [runKey, setRunKey] = useState(0)
  const go = (text?: string) => {
    const t = (text ?? ask).trim()
    if (!t) return
    setTitle(heroTitleFor(t))
    setRunKey((k) => k + 1)
    document.querySelector('.ws-win')?.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' })
  }

  return (
    <SiteLayout open={open}>
      <div ref={root}>
        <section className="ws-hero">
          <div className="ws-wrap">
            <h1 data-reveal>把内容生产，交给一套靠得住的流程</h1>
            <p className="lede" data-reveal="2">说清楚要什么内容，它自己找资料、写、检查、配图。每一篇都查得到来路。</p>
            <div className="ws-ask" data-reveal="3">
              <Input size="large" value={ask} onChange={(e) => setAsk(e.target.value)} onPressEnter={() => go()}
                aria-label="描述你要持续产出的内容" placeholder="描述你要持续产出的内容" />
              <Button type="primary" size="large" onClick={() => go()} icon={<ArrowRightOutlined />} iconPlacement="end">演示一遍</Button>
            </div>
            <div className="ws-try" data-reveal="3">
              试试：{TRY.map((t) => <button key={t} type="button" onClick={() => { setAsk(t); go(t) }}>{t}</button>)}
            </div>
          </div>
          <ProductWindow title={title} runKey={runKey} />
          <div style={{ height: 96 }} />
        </section>

        <Story />
        <PromptDoc />
        <Bento />
        <CtaBand open={open} />
      </div>
    </SiteLayout>
  )
}
