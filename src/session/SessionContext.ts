import { createContext, useContext } from 'react'
import type { Me, Space } from '@/api/types'
import type { Permissions } from './permissions'

export interface Session {
  me: Me
  /** 当前空间 */
  space: Space
  can: Permissions
  isPlatformAdmin: boolean
  /** 切到别的空间：清掉旧空间的缓存，回工作台 */
  switchSpace: (spaceId: string) => Promise<void>
  /** 我是谁、空间列表变了（新建空间、改名、转让）后刷新 */
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const SessionContext = createContext<Session | null>(null)

/** 只能在登录后的页面里用。 */
export function useSession(): Session {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession 只能在登录后的页面里用')
  return s
}
