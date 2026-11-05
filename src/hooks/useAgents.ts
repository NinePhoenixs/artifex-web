import { useQuery } from '@tanstack/react-query'
import { listAgents } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'

/** 全部 Agent（含停用的），各处共用一份缓存；增改后失效 qk.agents()。 */
export function useAgents() {
  return useQuery({ queryKey: qk.agents(), queryFn: () => listAgents() })
}
