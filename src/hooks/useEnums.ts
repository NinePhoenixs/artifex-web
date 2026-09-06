import { useQuery } from '@tanstack/react-query'
import { getEnums } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { EnumGroup } from '@/api/types'
import { FALLBACK_ENUMS } from '@/constants/enums'

/**
 * 所有下拉框的选项和中文文案都从这拿。
 *
 * 后端 GET /v1/meta/enums 是唯一事实源——前端不再维护"哪个枚举有哪些值"的
 * 对照表，后端新增枚举值前端自动跟上。
 *
 * 兜底顺序：后端 → FALLBACK_ENUMS（首屏未返回 / 后端没启动）。
 * 遇到字典里没有的值，label() 回退显示原值，不显示空白。
 */
export function useEnums() {
  const { data } = useQuery({
    queryKey: qk.enums(),
    queryFn: getEnums,
    staleTime: Infinity, // 枚举字典一个会话内不会变
  })

  const dict = data ?? FALLBACK_ENUMS

  return {
    dict,
    /** 给 antd Select 用的 options。 */
    options: (group: EnumGroup) =>
      dict[group].map((o) => ({ value: o.value, label: o.label })),
    /** 值 → 中文名。不认识的值回退显示原值。 */
    label: (group: EnumGroup, value: string | null | undefined, fallback = '—') => {
      if (!value) return fallback
      return dict[group].find((o) => o.value === value)?.label ?? value
    },
  }
}
