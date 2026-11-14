import type { ReactNode } from 'react'
import { Typography } from 'antd'
import LogoDot from './LogoDot'
import { brand } from '@/theme'

/** 登录、注册、找回密码、加入邀请共用：左边品牌，右边表单。窄屏只留表单。 */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand" style={{ background: brand.ink }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoDot size={30} dark />
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>稿谱</span>
        </div>
        <div style={{ transform: 'translateY(-4%)' }}>
          <div style={{ color: '#fff', fontSize: 40, fontWeight: 800, lineHeight: 1.25 }}>
            配一次，
            <br />
            每天稳定产出
          </div>
          <div style={{ color: 'rgba(255,255,255,.72)', marginTop: 16, fontSize: 15 }}>AI 内容生产平台</div>
        </div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>© {new Date().getFullYear()} 稿谱</div>
      </aside>
      <main className="auth-main">
        <div style={{ width: '100%', maxWidth: 380 }}>
          <Typography.Title level={2} style={{ marginBottom: 6 }}>{title}</Typography.Title>
          {subtitle && <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>{subtitle}</Typography.Paragraph>}
          {children}
        </div>
      </main>
    </div>
  )
}
