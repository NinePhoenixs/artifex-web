import { describe, expect, it } from 'vitest'
import { deviceName } from './userAgent'

describe('deviceName', () => {
  it('认出常见浏览器和系统', () => {
    expect(deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36')).toBe('Chrome · macOS')
    expect(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36 Edg/130')).toBe('Edge · Windows')
    expect(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari · iOS')
  })
  it('认不出就说未知设备', () => {
    expect(deviceName('')).toBe('未知设备')
    expect(deviceName('curl/8.0')).toBe('未知设备')
  })
})
