import { CheckOutlined } from '@ant-design/icons'
import { Modal, Skeleton, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getPlanCatalog } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { brand } from '@/theme'

/** 续费 / 升级：三档套餐对比 + 联系方式。付款在线下，联系我们后由平台开通。 */
export default function UpgradeModal({ open, current, onClose }: { open: boolean; current?: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: qk.plans(), queryFn: getPlanCatalog, enabled: open })
  return (
    <Modal title="套餐" open={open} onCancel={onClose} footer={null} width={720} destroyOnHidden>
      {isLoading || !data ? <Skeleton active /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.plans.length}, 1fr)`, gap: 12, margin: '8px 0 20px' }}>
            {data.plans.map((p) => {
              const on = p.code === current
              return (
                <div key={p.code} style={{
                  border: `1px solid ${on ? brand.ink : brand.line}`, borderRadius: 12, padding: 16,
                  background: on ? brand.inkSoft : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Typography.Text strong style={{ fontSize: 16 }}>{p.name}</Typography.Text>
                    {on && <Typography.Text type="secondary" style={{ marginInlineStart: 'auto', fontSize: 12 }}>当前</Typography.Text>}
                  </div>
                  <div style={{ margin: '12px 0 8px', fontSize: 26, fontWeight: 700 }} className="num">
                    {p.code === 'free' ? data.trialPieces : p.monthlyPieces}
                    <span style={{ fontSize: 13, fontWeight: 400, color: brand.textMuted, marginInlineStart: 4 }}>
                      {p.code === 'free' ? '篇试用' : '篇 / 月'}
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6, color: brand.textMuted, fontSize: 13 }}>
                    <li><CheckOutlined style={{ color: brand.ink, marginInlineEnd: 6 }} />{p.memberLimit ? `最多 ${p.memberLimit} 人` : '成员不限'}</li>
                    <li><CheckOutlined style={{ color: brand.ink, marginInlineEnd: 6 }} />接自己的模型不限篇数</li>
                    <li><CheckOutlined style={{ color: brand.ink, marginInlineEnd: 6 }} />失败的生产不算篇数</li>
                  </ul>
                </div>
              )
            })}
          </div>
          <div style={{ background: brand.paper, borderRadius: 10, padding: '14px 16px' }}>
            <Typography.Text strong>开通或续费</Typography.Text>
            <Typography.Paragraph style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }} type={data.contact ? undefined : 'secondary'}>
              {data.contact || '请联系稿谱平台管理员开通。'}
            </Typography.Paragraph>
          </div>
        </>
      )}
    </Modal>
  )
}
