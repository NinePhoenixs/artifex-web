/**
 * 输入长度与数量上限，与后端校验一致。后端改了这里跟着改，
 * 前端先拦一道只是为了早提示，最终以后端为准。
 */

/** 每一步最多带几个能力（Agent 自带 + 配方额外，合计） */
export const MAX_PER_STAGE = 8

/** 提示词、Agent 角色说明 */
export const PROMPT_MAX_LEN = 20000

/** 应用、配方的名称 */
export const LONG_NAME_MAX_LEN = 128
/** Agent、能力、模型、模型厂商的名称 */
export const NAME_MAX_LEN = 64
/** 各处的一句话说明 */
export const DESCRIPTION_MAX_LEN = 255

/** 配方每次生产画几张图 */
export const IMAGE_COUNT_MIN = 1
export const IMAGE_COUNT_MAX = 9
export const IMAGE_COUNT_DEFAULT = 3
