import { brand } from '@/theme'

/** 稿谱标志：三条谱线（墨谱蓝）+ 一个音符（音符金），48 网格。 */
export default function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <g fill={brand.ink}>
        <rect x="6" y="18" width="36" height="4" />
        <rect x="6" y="28" width="36" height="4" />
        <rect x="6" y="38" width="24" height="4" />
      </g>
      <circle cx="36" cy="12" r="6" fill={brand.gold} />
    </svg>
  )
}
