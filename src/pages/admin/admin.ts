/** 套餐的中文名与颜色（后台列表用；名字以接口返回为准，这里只是兜底） */
export const PLAN_LABEL: Record<string, string> = { free: '免费版', pro: '专业版', team: '团队版', internal: '内部版' }
export const PLAN_COLOR: Record<string, string | undefined> = { free: undefined, pro: 'blue', team: 'purple', internal: 'gold' }

/** 操作记录里的动作 */
export const ACTION_LABEL: Record<string, string> = {
  'plan.activate': '开通套餐',
  'quota.bonus': '赠送篇数',
  'account.disable': '停用账号',
  'account.enable': '启用账号',
  'plan.update': '修改套餐',
  'setting.update': '修改设置',
}

/** 元，保留两位 */
export const yuan = (n: number) => `¥${n.toFixed(2)}`

/** 原因：后台每个写操作都要填 */
export const reasonRule = [{ required: true, whitespace: true, message: '请填写原因' }, { max: 200, message: '最多 200 字' }]
