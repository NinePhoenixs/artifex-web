/** 进度角色：每一步一个小稿纸团子。形象先跟着步骤走，以后换成每个 Agent 自己的形象。 */

export type CrewId = 'caifeng' | 'zhibi' | 'jiaoshen' | 'huashi' | 'xiaodi'

export interface CrewMember {
  id: CrewId
  name: string
  tint: string
  accent: string
  /** 等待时打瞌睡的节奏错开（秒） */
  delay: number
}

export const CREW: Record<CrewId, CrewMember> = {
  caifeng: { id: 'caifeng', name: '采风', tint: '#E6F3EC', accent: '#3F8F67', delay: 0 },
  zhibi: { id: 'zhibi', name: '执笔', tint: '#EAF0FA', accent: '#2C4E92', delay: 1.6 },
  jiaoshen: { id: 'jiaoshen', name: '校审', tint: '#FBEDEA', accent: '#C2412D', delay: 3.1 },
  huashi: { id: 'huashi', name: '画师', tint: '#F1ECFA', accent: '#7A5BC7', delay: 0.8 },
  xiaodi: { id: 'xiaodi', name: '小递', tint: '#FBF3DF', accent: '#B8862A', delay: 2.4 },
}

const INK = '#2C4E92', GOLD = '#D4A63A'

const MOUTH: Record<CrewId, string> = {
  caifeng: `<path d="M55 68q5 7 10 0z" fill="#C24A4A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  zhibi: `<path d="M56.5 68.5q3.5 3 7 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  jiaoshen: `<path d="M56 69.5h8" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  huashi: `<path d="M54 67q6 8 12 0z" fill="#C24A4A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M58 70.5q2 1.6 4 0" fill="#F2878A"/>`,
  xiaodi: `<path d="M55 67.5q5 5 10 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
}
function eyes(c: CrewMember) {
  const e = (x: number) => `<ellipse cx="${x}" cy="59" rx="4.8" ry="5.8" fill="${INK}"/><circle cx="${x + 1.6}" cy="56.8" r="1.7" fill="#fff"/><circle cx="${x - 1.4}" cy="61.4" r=".8" fill="#fff"/>`
  if (c.id === 'huashi') // 眨一只眼
    return `<g class="eyes">${e(49)}<path d="M67 59.5q4-4 8 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>`
  return `<g class="eyes">${e(49)}${e(71)}</g>`
}
function face(c: CrewMember) {
  const glasses = c.id === 'zhibi'
    ? `<circle cx="49" cy="59" r="8.2" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="2"/><circle cx="71" cy="59" r="8.2" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="2"/><path d="M57.2 58.5q3.8-2 7.6 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` : ''
  const brows = c.id === 'jiaoshen'
    ? `<path d="M43 48.5l10 2.5M77 48.5l-10 2.5" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : ''
  const moods = `
    <g class="eyes-closed"><path d="M44 60q5 3.5 10 0M66 60q5 3.5 10 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>
    <g class="eyes-happy"><path d="M44 61q5-7 10 0M66 61q5-7 10 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/></g>
    <g class="eyes-sad"><path d="M45 55.5l7 3.5-7 3.5M75 55.5l-7 3.5 7 3.5" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="tear" d="M44 65q-2.5 4 0 5.5q2.5-1.5 0-5.5z" fill="#8EC5E8"/></g>`
  return `${eyes(c)}${moods}${glasses}${brows}
    <ellipse cx="40.5" cy="68" rx="5" ry="3" fill="#F49C96" opacity=".55"/><ellipse cx="79.5" cy="68" rx="5" ry="3" fill="#F49C96" opacity=".55"/>
    <g class="mouth-ok">${MOUTH[c.id]}</g>
    <path class="mouth-sad" d="M55.5 71.5q4.5-4 9 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`
}

function gear(c: CrewMember): { hat: string; extra: string; prop: string } {
  switch (c.id) {
    case 'caifeng': return { // 渔夫帽 + 小背包带 + 放大镜
      hat: `<path d="M38 36q22-20 44 0" fill="${c.accent}"/><path d="M33 37q27 6 54 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M44 32q16-12 32 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`,
      extra: `<path d="M37 46q-3 22 2 40" fill="none" stroke="${c.accent}" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>`,
      prop: `<g class="prop"><path d="M90 80l6-8" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><circle cx="101" cy="65" r="9" fill="#fff" fill-opacity=".7" stroke="${INK}" stroke-width="2.4"/><path d="M97 61q2.5-2.5 6-1.5" stroke="${c.accent}" stroke-width="1.8" stroke-linecap="round"/></g>` }
    case 'zhibi': return { // 一撮呆毛 + 钢笔
      hat: `<path d="M58 31q-2-9 6-11q-3 5 1 10" fill="${c.tint}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
      extra: '',
      prop: `<g class="prop"><path d="M88 88l15-22" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/><path d="M88 88l-2.5 5.5 5.5-2.5z" fill="${GOLD}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M100 70l3-4" stroke="${GOLD}" stroke-width="5.5" stroke-linecap="round"/></g>` }
    case 'jiaoshen': return { // 耳后别红笔 + 夹板
      hat: `<path d="M84 44l9-14" stroke="${c.accent}" stroke-width="4.5" stroke-linecap="round"/><path d="M93 30l2-3" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
      extra: '',
      prop: `<g class="prop"><rect x="13" y="64" width="22" height="28" rx="3.5" fill="#fff" stroke="${INK}" stroke-width="2.2"/><rect x="19" y="61" width="10" height="5" rx="1.5" fill="${GOLD}"/><path d="M18 74l2.5 2.5 4.5-5M18 83l2.5 2.5 4.5-5" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>` }
    case 'huashi': return { // 歪戴贝雷帽 + 画笔
      hat: `<path d="M36 36q4-14 24-14q20 0 22 12q-22 6-46 2z" fill="${c.accent}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="62" cy="21" r="3" fill="${c.accent}" stroke="${INK}" stroke-width="1.6"/>`,
      extra: `<circle cx="42" cy="84" r="2.6" fill="#F0A35E" opacity=".8"/><circle cx="48" cy="90" r="1.8" fill="#6BB8D6" opacity=".8"/>`,
      prop: `<g class="prop"><path d="M90 88l14-24" stroke="#B8936A" stroke-width="4.5" stroke-linecap="round"/><path d="M104 64q5-8 1-13q-6 3-5 11z" fill="${c.accent}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>` }
    case 'xiaodi': return { // 邮差帽 + 包裹
      hat: `<path d="M38 37q22-22 44 0z" fill="${c.accent}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M34 37.5q26 5 52 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M57 27l3-5 3 5-5.5-2.5h5z" fill="${GOLD}"/>`,
      extra: '',
      prop: `<g class="prop"><rect x="87" y="74" width="23" height="19" rx="3" fill="#E9D3A6" stroke="${INK}" stroke-width="2.2"/><path d="M98.5 74v19M87 82h23" stroke="${c.accent}" stroke-width="2"/></g>` }
  }
}

// 干活时的场景：每个角色真的在做自己的事
function scene(c: CrewMember): string {
  const R = '#C2412D'
  switch (c.id) {
    case 'zhibi': return `<g class="scene">
      <g transform="rotate(-5 116 88)"><rect x="100" y="68" width="34" height="38" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/>
        <path class="ln l1" d="M106 78h22"/><path class="ln l2" d="M106 86h22"/><path class="ln l3" d="M106 94h16"/></g>
      <g class="pen"><path d="M0 0l13-19" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M0 0l-1.5 4.5 4.5-2z" fill="${GOLD}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M10.5-15.5l2.5-3.5" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/></g>
    </g>`
    case 'jiaoshen': return `<g class="scene">
      <rect x="100" y="64" width="34" height="42" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <path d="M105 74h16M105 84h16M105 94h16" stroke="#CFC9BD" stroke-width="2.4" stroke-linecap="round"/>
      <path class="ck c1" d="M124 73l2.5 2.5 4.5-5" /><path class="ck c2" d="M124 83l2.5 2.5 4.5-5"/><path class="ck c3" d="M124 93l2.5 2.5 4.5-5"/>
      <g class="rpen"><path d="M0 0l12-16" stroke="${R}" stroke-width="4.5" stroke-linecap="round"/><path d="M0 0l-1.2 4 4-1.8z" fill="${INK}"/></g>
    </g>`
    case 'caifeng': return `<g class="scene">
      <g class="stack"><rect class="sc s1" x="-14" y="94" width="18" height="10" rx="2"/><rect class="sc s2" x="-13" y="86" width="18" height="10" rx="2"/><rect class="sc s3" x="-14" y="78" width="18" height="10" rx="2"/></g>
      <g class="flycard"><rect x="-6" y="-4" width="14" height="10" rx="2" fill="#fff" stroke="${c.accent}" stroke-width="1.8"/><path d="M-3 0h8M-3 3h5" stroke="${c.accent}" stroke-width="1.2" stroke-linecap="round"/></g>
      <path class="found" d="M118 96l2-5 2 5-5-2.5h6z" fill="${GOLD}"/>
    </g>`
    case 'huashi': return `<g class="scene">
      <path d="M104 106l8-18M136 106l-8-18M120 106V88" stroke="#B8936A" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="100" y="52" width="40" height="38" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <rect class="pt p1" x="102" y="54" width="36" height="22" fill="#BFDDF0"/>
      <path class="pt p2" d="M102 88l12-16 9 9 6-6 9 13z" fill="#9CCFA8"/>
      <circle class="pt p3" cx="129" cy="62" r="5" fill="${GOLD}"/>
      <g class="brushw"><path d="M0 0l12-18" stroke="#B8936A" stroke-width="4" stroke-linecap="round"/><path d="M0 0q-4 5-1 8q4-3 1-8z" fill="${c.accent}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/></g>
    </g>`
    case 'xiaodi': return `<g class="scene">
      <g class="parcel"><rect x="100" y="82" width="30" height="22" rx="3" fill="#E9D3A6" stroke="${INK}" stroke-width="2.2"/>
        <path class="tape" d="M100 88h30"/><circle class="mark" cx="122" cy="96" r="5" fill="none" stroke="${R}" stroke-width="1.8"/></g>
      <g class="stamper"><rect x="-6" y="-2" width="12" height="5" rx="1.5" fill="${R}"/><rect x="-2.5" y="-12" width="5" height="10" rx="2" fill="#B8936A"/><circle cy="-14" r="4" fill="#B8936A"/></g>
    </g>`
  }
  return ''
}

/** 角色的 SVG 内容（不含外层 svg）。全是写死的图形，不含任何外部内容。 */
export function crewMarkup(c: CrewMember): string {
  const g = gear(c)
  return `<ellipse cx="60" cy="109" rx="26" ry="3.6" fill="#000" opacity=".07"/>
    <g class="body">
      <ellipse cx="49" cy="104" rx="6" ry="3.6" fill="${INK}"/><ellipse cx="71" cy="104" rx="6" ry="3.6" fill="${INK}"/>
      <path d="M48 34h24l18 18v30q0 21-21 21H51q-21 0-21-21V52q0-18 18-18z" fill="${c.tint}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M72 34v10q0 8 8 8h10" fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M45 91h12M45 96h7" stroke="${c.accent}" stroke-width="1.8" stroke-linecap="round" opacity=".3"/>
      ${g.extra}
      ${face(c)}
      <g class="arm l"><ellipse cx="28" cy="80" rx="5" ry="6.5" fill="${c.tint}" stroke="${INK}" stroke-width="2.4" transform="rotate(20 28 80)"/></g>
      <g class="arm r"><ellipse cx="92" cy="80" rx="5" ry="6.5" fill="${c.tint}" stroke="${INK}" stroke-width="2.4" transform="rotate(-20 92 80)"/></g>
      ${g.hat}
      <path class="sweat" d="M86 50q-3.5 6 0 8q3.5-2 0-8z" fill="#8EC5E8"/>
    </g>
    ${g.prop}
    ${scene(c)}
    <g class="zz"><text class="z1" x="86" y="36" font-size="10" font-weight="700" fill="${INK}">z</text><text class="z2" x="94" y="26" font-size="13" font-weight="700" fill="${INK}">z</text></g>
    <g class="confetti"><rect class="cf f1" x="58" y="40" width="5" height="3" rx="1" fill="${GOLD}"/><rect class="cf f2" x="58" y="40" width="5" height="3" rx="1" fill="#6BB8D6"/>
      <circle class="cf f3" cx="60" cy="40" r="2" fill="#F0A35E"/><rect class="cf f4" x="58" y="40" width="4" height="4" rx="1" fill="#9CCFA8"/>
      <circle class="cf f5" cx="60" cy="40" r="2" fill="${c.accent}"/><rect class="cf f6" x="58" y="40" width="5" height="3" rx="1" fill="#F49C96"/></g>
    <g class="cloud"><path d="M44 22q0-8 8-8q3-6 10-4q8-2 10 6q7 0 7 6z" fill="#B9BFC9" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
      <path class="rain r1" d="M52 26l-2 5"/><path class="rain r2" d="M60 26l-2 5"/><path class="rain r3" d="M68 26l-2 5"/></g>
    <g class="badge"><circle cx="98" cy="30" r="9.5" fill="#2E7D4F" stroke="#fff" stroke-width="2"/><path d="M94 30l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`
}
