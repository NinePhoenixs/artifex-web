import type { Space } from '@/api/types'
import { brand } from '@/theme'

/** 空间头像：取名字第一个字。个人空间灰，团队空间墨谱蓝。 */
export default function SpaceAvatar({ space, size = 32 }: { space: Pick<Space, 'name' | 'kind'>; size?: number }) {
  const ch = Array.from(space.name.trim())[0] ?? '·'
  return (
    <span
      style={{
        width: size, height: size, borderRadius: 8, flex: 'none', display: 'inline-grid', placeItems: 'center',
        background: space.kind === 'team' ? brand.ink : '#8A8F98', color: '#fff', fontWeight: 600, fontSize: size * 0.45,
      }}
    >
      {ch.toUpperCase()}
    </span>
  )
}
