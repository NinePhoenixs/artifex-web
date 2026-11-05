import { Form, Input, InputNumber, Segmented, Switch, Typography } from 'antd'
import { IMAGE_RATIOS } from '@/constants/illustration'
import { IMAGE_COUNT_DEFAULT, IMAGE_COUNT_MAX, IMAGE_COUNT_MIN, PROMPT_MAX_LEN } from '@/constants/limits'
import { brand } from '@/theme'
import AgentSelect from './AgentSelect'

/**
 * 「配图」这一步：检查通过后，按「写」给的配图建议逐张出图，第一张当封面。
 * 和前三步不同：大脑是图片模型，不带能力、不点名，提示词只写画面风格。
 */
export default function IllustrationSection() {
  const form = Form.useFormInstance()
  const enabled = Boolean(Form.useWatch(['illustration', 'enabled'], { form, preserve: true }))
  const count = (Form.useWatch(['illustration', 'imageCount'], { form, preserve: true }) as number | undefined) ?? IMAGE_COUNT_DEFAULT

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>检查通过后给成稿配图</Typography.Title>
        <Form.Item name={['aiSetting', 'agents', 'illustration']} noStyle>
          <AgentSelect stage="illustration" />
        </Form.Item>
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        画面来自「写」这一步给的配图建议，不够时按标题补；第一张当封面。每张十几秒，画失败的不影响文案交付。
      </Typography.Paragraph>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Form.Item name={['illustration', 'enabled']} valuePropName="checked" noStyle>
            <Switch />
          </Form.Item>
          <Typography.Text>{enabled ? '已开启' : '关着：检查通过直接交付'}</Typography.Text>
        </span>
        {enabled && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Typography.Text type="secondary">每次</Typography.Text>
              <Form.Item name={['illustration', 'imageCount']} noStyle>
                <InputNumber min={IMAGE_COUNT_MIN} max={IMAGE_COUNT_MAX} precision={0} style={{ width: 64 }} />
              </Form.Item>
              <Typography.Text type="secondary">张</Typography.Text>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Typography.Text type="secondary">宽高比</Typography.Text>
              <Form.Item name={['illustration', 'imageRatio']} noStyle>
                <Segmented options={IMAGE_RATIOS} />
              </Form.Item>
            </span>
          </>
        )}
      </div>

      <div style={{ display: enabled ? 'block' : 'none' }}>
        <Form.Item
          name={['aiSetting', 'prompts', 'illustration']}
          rules={[{ max: PROMPT_MAX_LEN, message: `提示词最多 ${PROMPT_MAX_LEN} 字` }]}
          style={{ marginBottom: 6 }}
        >
          <Input.TextArea
            autoSize={{ minRows: 8, maxRows: 20 }}
            placeholder={
              '画面风格\n清新明亮的生活方式摄影，暖色调，留白多\n\n统一要求\n· 围绕「{{主题}}」\n· 竖图构图，主体居中偏上\n\n不写也行：按画师的默认风格画'
            }
            style={{ borderRadius: 10, borderColor: brand.line, background: brand.paper }}
          />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {`一次生产画 ${count} 张。画面里不会出现文字、水印和真实人物的脸。`}
        </Typography.Text>
      </div>
    </>
  )
}
