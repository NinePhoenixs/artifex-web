import { Alert, Empty, Space, Tag, Typography } from 'antd'
import type { AiRun, AiRunStep } from '@/api/types'
import { STAGE_LABEL } from '@/constants/stage'
import { useAgents } from '@/hooks/useAgents'
import { brand } from '@/theme'
import { RUN_STATUS } from './jobStatus'
import { secondsText, sumUsage, usageText } from './usage'

/** AI 做了什么：每次阶段运行一块，下面列出每一步。 */
export default function RunTrace({ runs }: { runs: AiRun[] }) {
  const { data: agents } = useAgents()
  const agentName = (id: string) => agents?.items.find((a) => a.agentId === id)?.name ?? id
  return (
    <>
      <Typography.Title level={5}>AI 做了什么</Typography.Title>
      {runs.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: -4, fontVariantNumeric: 'tabular-nums' }}>
          合计 {usageText(sumUsage(runs))}
        </Typography.Paragraph>
      )}
      {runs.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI 还没开始，或这一步没用到 AI" />
      ) : (
        runs.map((r) => (
          <div key={r.runId} style={{ marginBottom: 16 }}>
            <Space size={8} wrap style={{ marginBottom: 8 }}>
              <Typography.Text strong>{STAGE_LABEL[r.stage]}</Typography.Text>
              {r.agentId && <Tag style={{ marginInlineEnd: 0 }}>由「{agentName(r.agentId)}」完成</Tag>}
              {r.stage === 'illustration'
                ? <Typography.Text type="secondary">第 {r.attempt} 张</Typography.Text>
                : r.attempt > 1 && <Typography.Text type="secondary">第 {r.attempt} 轮</Typography.Text>}
              <Tag color={RUN_STATUS[r.status].color}>{RUN_STATUS[r.status].label}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                {r.model} · {usageText(sumUsage([r]))}
              </Typography.Text>
            </Space>
            {r.skipped.length > 0 && (
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                没带上：{r.skipped.map(skipText).join('、')}
              </Typography.Paragraph>
            )}
            {r.errorMsg && <Alert type="warning" showIcon title={r.errorMsg} style={{ marginBottom: 8 }} />}
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {r.steps.map((s) => <StepLine key={s.seq} step={s} drawing={r.stage === 'illustration'} />)}
            </ol>
          </div>
        ))
      )}
    </>
  )
}

function StepLine({ step: s, drawing }: { step: AiRunStep; drawing?: boolean }) {
  const what = drawing
    ? s.status === 'failed' ? '没画出来' : `画了一张 ${s.outputSummary.replace(/^1 张 /, '')}`
    : s.kind === 'skill'
      ? `${s.outputSummary.includes('点名') ? '按配方点名用了' : '读了'}技能「${s.name}」${s.skillVersion ? `（第 ${s.skillVersion} 版）` : ''}`
      : s.kind === 'tool'
        ? s.name.startsWith('run_skill_script:') ? `在沙箱里运行了技能脚本 ${s.name.slice('run_skill_script:'.length)}` : `用了工具 ${s.name}`
        : s.outputSummary.startsWith('调用 ') ? '想了想，决定先用能力' : '交稿'
  return (
    <li style={{ marginBottom: 4, color: s.status === 'failed' ? brand.danger : undefined }}>
      <Typography.Text>{what}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
        {secondsText(s.costMs)}
        {s.errorMsg && ` · ${s.errorMsg}`}
      </Typography.Text>
    </li>
  )
}

const SKIP_REASON: Record<string, string> = {
  not_found: '已删除',
  disabled: '已停用',
  not_applicable: '不适用',
}

function skipText(s: string) {
  const [id, reason] = s.split(':')
  return `${id}（${SKIP_REASON[reason] ?? reason}）`
}
