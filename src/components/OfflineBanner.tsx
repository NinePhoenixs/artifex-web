import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { isOffline, subscribeOffline } from '@/api/client'

/**
 * 后端没启动时的横幅。
 *
 * **必须显眼**——看着真数据其实是假数据，比页面报错危险得多。
 * 后端一起来，下一次请求成功就会自动收起，不用刷新页面。
 */
export default function OfflineBanner() {
  const [off, setOff] = useState(isOffline)

  useEffect(() => subscribeOffline(setOff), [])

  if (!off) return null

  return (
    <Alert
      banner
      type="warning"
      showIcon
      message={
        <span>
          <strong>后端未启动，当前是演示数据。</strong>
          所有改动只存在浏览器内存里，刷新即还原。
          启动后端（<code>cd artifex-core &amp;&amp; make run</code>）后会自动切回真实数据。
        </span>
      }
    />
  )
}
