/** 浏览器 UA → 「Chrome · macOS」这样给人看的说法；认不出的给「未知设备」。 */
export function deviceName(ua: string): string {
  if (!ua) return '未知设备'
  const os = /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
      : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
        : /Windows/.test(ua) ? 'Windows'
          : /Linux/.test(ua) ? 'Linux' : ''
  const browser = /MicroMessenger/.test(ua) ? '微信'
    : /Edg\//.test(ua) ? 'Edge'
      : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\//.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) ? 'Safari' : ''
  const parts = [browser, os].filter(Boolean)
  return parts.length ? parts.join(' · ') : '未知设备'
}
