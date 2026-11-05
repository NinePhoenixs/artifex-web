import type { ImageRatio, Layout, Recipe, UpdateRecipeRequest } from '@/api/types'
import { IMAGE_RATIOS, LAYOUT_RATIO } from '@/constants/illustration'
import { IMAGE_COUNT_DEFAULT } from '@/constants/limits'

/** 配方详情 ↔ 编辑页表单的转换。 */

/** 配方详情 → 表单初值。老配方没有配图设置时给默认值（关着）。 */
export function toFormValues(r: Recipe) {
  return {
    name: r.name,
    description: r.description,
    materialSpec: r.materialSpec,
    reviewPolicy: r.reviewPolicy,
    illustration: r.illustration ?? { enabled: false, imageCount: IMAGE_COUNT_DEFAULT, imageRatio: IMAGE_RATIOS[0].value },
    layout: r.layout ?? 'note',
    aiSetting: r.aiSetting,
  }
}

/** 全量提交：状态、类型、系统管理字段不在其中。 */
export function toPayload(
  values: Record<string, unknown>,
  recipe: Recipe | undefined,
): UpdateRecipeRequest {
  return {
    name: String(values.name ?? ''),
    description: String(values.description ?? ''),
    materialSpec: values.materialSpec as UpdateRecipeRequest['materialSpec'],
    reviewPolicy: values.reviewPolicy as UpdateRecipeRequest['reviewPolicy'],
    illustration: values.illustration as UpdateRecipeRequest['illustration'],
    layout: (values.layout as Layout | undefined) ?? recipe?.layout,
    aiSetting: toAiSetting(values.aiSetting, recipe),
  }
}

/** 换版式时：图片比例还是旧版式的默认值，就跟着换成新版式的默认值；用户自己改过的不动。 */
export function ratioAfterLayoutChange(prev: Layout, next: Layout, ratio: ImageRatio | undefined): ImageRatio | undefined {
  if (prev === next) return ratio
  return !ratio || ratio === LAYOUT_RATIO[prev] ? LAYOUT_RATIO[next] : ratio
}

/** AI 装配原样提交；各步的清单缺省补成空数组，没选 Agent 是空串（= 平台自带）。配图不带能力。 */
export function toAiSetting(v: unknown, recipe: Recipe | undefined): UpdateRecipeRequest['aiSetting'] {
  const a = (v ?? recipe?.aiSetting) as Recipe['aiSetting'] | undefined
  if (!a) return undefined
  return {
    agents: {
      retrieval: a.agents?.retrieval ?? '',
      generation: a.agents?.generation ?? '',
      review: a.agents?.review ?? '',
      illustration: a.agents?.illustration ?? '',
    },
    grants: {
      retrieval: a.grants?.retrieval ?? [],
      generation: a.grants?.generation ?? [],
      review: a.grants?.review ?? [],
    },
    prompts: {
      retrieval: a.prompts?.retrieval ?? '',
      generation: a.prompts?.generation ?? '',
      review: a.prompts?.review ?? '',
      illustration: a.prompts?.illustration ?? '',
    },
    actions: {
      retrieval: a.actions?.retrieval ?? {},
      generation: a.actions?.generation ?? {},
      review: a.actions?.review ?? {},
    },
  }
}
