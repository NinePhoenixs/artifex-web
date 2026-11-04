import { useState } from 'react'
import { CheckCircleFilled, CodeOutlined, ExclamationCircleFilled, FileTextOutlined, WarningFilled } from '@ant-design/icons'
import { Alert, Tag, Typography } from 'antd'
import type { ScanReport, SkillFile } from '@/api/types'
import { brand } from '@/theme'

/**
 * 技能包附带的文件 + 脚本扫描结果。登记弹窗与能力详情共用。
 * 点文件名展开看内容——上传的脚本到底写了什么，人要能一眼看到。
 */
export default function SkillPackage({ files, scan }: { files: SkillFile[]; scan?: ScanReport }) {
  const [open, setOpen] = useState<string | null>(null)
  if (files.length === 0) return null
  const scripts = files.filter((f) => f.script ?? f.path.startsWith('scripts/'))
  return (
    <div style={{ marginBottom: 20 }}>
      <Typography.Text strong>技能包文件 · {files.length}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
        {scripts.length > 0 ? `其中 ${scripts.length} 个脚本，AI 需要时在沙箱里运行（不联网、只读、限时）` : '参考文件，AI 读技能时一并可用'}
      </Typography.Text>
      <div style={{ border: `1px solid ${brand.line}`, borderRadius: 8, marginTop: 8, overflow: 'hidden' }}>
        {files.map((f, i) => {
          const isScript = f.script ?? f.path.startsWith('scripts/')
          const hits = scan?.findings.filter((x) => x.file === f.path) ?? []
          return (
            <div key={f.path} style={{ borderTop: i ? `1px solid ${brand.line}` : 'none' }}>
              <button
                type="button"
                onClick={() => setOpen(open === f.path ? null : f.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  background: 'transparent', border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left',
                }}
              >
                {isScript ? <CodeOutlined /> : <FileTextOutlined />}
                <Typography.Text code style={{ fontSize: 12 }}>{f.path}</Typography.Text>
                {isScript && <Tag variant="filled" style={{ marginInlineEnd: 0 }}>脚本</Tag>}
                {hits.some((h) => h.level === 'high') && <Tag color="error" style={{ marginInlineEnd: 0 }}>高危</Tag>}
                {!hits.some((h) => h.level === 'high') && hits.length > 0 && <Tag color="warning" style={{ marginInlineEnd: 0 }}>可疑</Tag>}
                <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                  {formatSize(f.size ?? new Blob([f.content]).size)}
                </Typography.Text>
              </button>
              {open === f.path && (
                <pre
                  style={{
                    margin: 0, padding: '10px 14px', background: brand.paper, fontSize: 12, lineHeight: 1.6,
                    maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}
                >
                  {f.content}
                </pre>
              )}
            </div>
          )
        })}
      </div>
      {scan && scan.scripts > 0 && <ScanResult scan={scan} />}
    </div>
  )
}

const LEVEL = {
  high: { icon: <ExclamationCircleFilled />, color: '#C2412D', label: '高危' },
  medium: { icon: <WarningFilled />, color: '#B7791F', label: '可疑' },
} as const

function ScanResult({ scan }: { scan: ScanReport }) {
  if (scan.findings.length === 0) {
    return (
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '8px 0 0' }}>
        <CheckCircleFilled style={{ color: '#2E7D4F', marginRight: 6 }} />
        安全扫描：{scan.scripts} 个脚本没发现联网、执行系统命令、删文件、读密钥、提权等写法
      </Typography.Paragraph>
    )
  }
  return (
    <Alert
      type={scan.blocked ? 'error' : 'warning'}
      showIcon
      style={{ marginTop: 10 }}
      title={scan.blocked ? '安全扫描发现高危写法，这个技能包不能登记' : `安全扫描发现 ${scan.findings.length} 处可疑写法，确认没问题再登记`}
      description={
        <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
          {scan.findings.map((f, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.6 }}>
              <span style={{ color: LEVEL[f.level].color, marginRight: 6 }}>{LEVEL[f.level].icon} {LEVEL[f.level].label}·{f.rule}</span>
              <Typography.Text code style={{ fontSize: 12 }}>{f.file}:{f.line}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{f.snippet}</Typography.Text>
            </div>
          ))}
        </div>
      }
    />
  )
}

function formatSize(n: number) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}
