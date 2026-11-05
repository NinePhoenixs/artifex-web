import { describe, expect, it } from 'vitest'
import { fromToolSpec, msToSec, needsKey, secToMs, toToolInput, toToolPatch } from './mcpForm'

describe('MCP 接法表单', () => {
  it('超时按秒填、按毫秒传，没填用 15 秒', () => {
    expect(secToMs(30)).toBe(30000)
    expect(secToMs(undefined)).toBe(15000)
    expect(msToSec(2500)).toBe(2.5)
    expect(msToSec(0)).toBe(15)
  })

  it('不需要鉴权时不带参数名和密钥，也不带传输方式', () => {
    const r = toToolInput({ mcpUrl: ' https://a.com/mcp ', authType: 'none', authParam: 'x', apiKey: 'k' })
    expect(r).toEqual({ mcpUrl: 'https://a.com/mcp', authType: 'none', timeoutMs: 15000 })
  })

  it('Bearer 只带密钥；自定义请求头、地址参数还带参数名', () => {
    expect(toToolInput({ mcpUrl: 'u', authType: 'bearer', authParam: 'x', apiKey: ' k ' })).toEqual({
      mcpUrl: 'u', authType: 'bearer', apiKey: 'k', timeoutMs: 15000,
    })
    expect(toToolInput({ mcpUrl: 'u', authType: 'query', authParam: ' tavilyApiKey ', apiKey: 'k', timeoutSec: 20 })).toEqual({
      mcpUrl: 'u', authType: 'query', authParam: 'tavilyApiKey', apiKey: 'k', timeoutMs: 20000,
    })
  })

  it('修改：密钥留空不改，要清除时传空串', () => {
    expect(toToolPatch({ mcpUrl: 'u', authType: 'bearer' })).not.toHaveProperty('apiKey')
    expect(toToolPatch({ mcpUrl: 'u', authType: 'bearer' }, true).apiKey).toBe('')
  })

  it('回显不带密钥；从不需要改成要鉴权、又没存过密钥时必须填', () => {
    expect(fromToolSpec({ provider: 'mcp', mcpUrl: 'u', authType: 'header', authParam: 'X-API-Key', timeoutMs: 15000 })).toEqual({
      mcpUrl: 'u', authType: 'header', authParam: 'X-API-Key', timeoutSec: 15,
    })
    expect(needsKey({ authType: 'bearer' }, false)).toBe(true)
    expect(needsKey({ authType: 'bearer' }, true)).toBe(false)
    expect(needsKey({ authType: 'none' }, false)).toBe(false)
  })
})
