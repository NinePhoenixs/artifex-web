import { brand } from '@/theme'

/** 官网和登录页的标志：圆角方块 + 右上角音符金圆点。dark 用在墨谱蓝底上（白方块）。 */
export default function LogoDot({ size = 26, dark = false }: { size?: number; dark?: boolean }) {
  const dot = Math.round(size * 0.27)
  const gap = Math.round(size * 0.15)
  return (
    <span style={{
      width: size, height: size, borderRadius: size * 0.27, background: dark ? '#fff' : brand.ink,
      position: 'relative', display: 'inline-block', flex: 'none',
    }}>
      <span style={{ position: 'absolute', right: gap, top: gap, width: dot, height: dot, borderRadius: '50%', background: brand.gold }} />
    </span>
  )
}
