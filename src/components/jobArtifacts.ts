import { apiUrl } from '@/api/client'
import type { ArticleDraft, FileRole, ImageSet, JobFile, JobStepRecord, ProductionJob, StepResult } from '@/api/types'

/** 从生产任务里取东西。任务没跑完、没有这样东西时一律给空值，调用处不用判空。 */

/** 某种格式的全部步骤结果，按先后。 */
export function stepResults<F extends StepResult['format']>(job: ProductionJob | undefined, format: F) {
  return (job?.steps ?? []).flatMap((s) => s.results).filter((r): r is Extract<StepResult, { format: F }> => r.format === format)
}

/** 文案：交付了取交付物，没交付取最新一稿。 */
export function jobArticle(job: ProductionJob | undefined): Pick<ArticleDraft, 'title' | 'body' | 'tags'> {
  const c = job?.deliverable?.content ?? stepResults(job, 'article_draft').at(-1)?.content
  return { title: c?.title ?? '', body: c?.body ?? '', tags: c?.tags ?? [] }
}

/** 图集里的一张：画好的带文件，没画出来的带原因。 */
export interface GalleryImage {
  no: number
  role: FileRole
  caption: string
  file?: JobFile
  error?: string
}

/** 图集：取配图那一步的图片组（含没画出来的），封面在前；没有图片组（早期的任务）取交付物里的图。 */
export function jobImages(job: ProductionJob): GalleryImage[] {
  const set = stepResults(job, 'image_set').at(-1)
  if (!set) {
    return [...(job.deliverable?.files ?? [])]
      .sort((a, b) => a.no - b.no)
      .map((f) => ({ no: f.no, role: f.role, caption: f.caption ?? '', file: f }))
  }
  const fileOf = new Map(set.files.map((f) => [f.no, f]))
  return [...(set.content as ImageSet).images]
    .sort((a, b) => a.no - b.no)
    .map((im) => ({ no: im.no, role: im.role, caption: im.caption, file: fileOf.get(im.no), error: im.error }))
}

/** 最后一次失败的步骤（前面的可能是自动修改前没通过的检查）。 */
export function lastFailedStep(job: ProductionJob | undefined): JobStepRecord | undefined {
  return [...(job?.steps ?? [])].reverse().find((s) => s.status === 'failed')
}

/** 图片地址；download = true 时让浏览器直接下载而不是打开。 */
export const imageUrl = (f: JobFile, download = false) => apiUrl(f.url + (download ? '?download=true' : ''))

/** 标题为空时的占位。 */
export const UNTITLED = '（无标题）'
