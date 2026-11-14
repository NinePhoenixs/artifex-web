import type { Role } from '@/api/types'

/** 角色能做的事，与后端 identity/domain.Permission 一一对应（产品文档 3.7）。 */
export interface Permissions {
  /** 新建、修改、删除应用、配方、Agent、技能、工具 */
  edit: boolean
  /** 接入模型、填写或更换密钥 */
  manageAI: boolean
  /** 邀请、移出成员，改角色 */
  manageMembers: boolean
  /** 改空间名 */
  manageSpace: boolean
  /** 转让所有权 */
  transfer: boolean
}

const RANK: Record<Role, number> = { owner: 1, admin: 2, editor: 3, member: 4 }

export function permissionsOf(role: Role | undefined): Permissions {
  const r = role ? RANK[role] : 99
  return {
    edit: r <= RANK.editor,
    manageAI: r <= RANK.admin,
    manageMembers: r <= RANK.admin,
    manageSpace: r <= RANK.admin,
    transfer: r <= RANK.owner,
  }
}

export const ROLE_LABEL: Record<Role, string> = { owner: '所有者', admin: '管理员', editor: '编辑者', member: '成员' }

/** 角色说明：邀请弹窗、加入页里用 */
export const ROLE_HINT: Record<Role, string> = {
  owner: '能管理空间里的一切，包括转让所有权',
  admin: '能接入模型、管理成员，配置应用和配方',
  editor: '能配置应用、配方、Agent 和技能，不能管成员和密钥',
  member: '能查看并用配方生产，不能修改',
}
