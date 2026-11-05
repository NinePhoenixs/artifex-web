import { useQuery } from '@tanstack/react-query'
import { getJob, listAiRuns } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { DONE } from '@/components/jobStatus'

/** 跟踪一个任务：没结束就轮询任务与 AI 运行记录。 */
export function useJobWatch(jobId: string | null) {
  const { data: job } = useQuery({
    queryKey: qk.job(jobId ?? ''),
    queryFn: () => getJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (q) => (q.state.data && DONE.includes(q.state.data.status) ? false : 2000),
  })
  const finished = Boolean(job && DONE.includes(job.status))
  const { data: runs } = useQuery({
    queryKey: qk.aiRuns(jobId ?? ''),
    queryFn: () => listAiRuns(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: finished ? false : 3000,
  })
  return { job, finished, runs: runs?.items ?? [] }
}
