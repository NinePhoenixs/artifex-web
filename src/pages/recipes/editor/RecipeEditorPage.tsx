import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftOutlined, CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons'
import { Alert, App, Badge, Button, Card, Form, Skeleton, Space, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, toNamePath } from '@/api/client'
import {
  getApp, getRecipe, markRecipeReady, selectRecipe, updateRecipe,
} from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { ImageRatio, Layout, Recipe, UpdateRecipeRequest } from '@/api/types'
import { STAGE_LABEL } from '@/constants/stage'
import { useApiError } from '@/hooks/useApiError'
import { BasicSection, MaterialSection, ReviewSection } from './sections'
import StageSection from './StageSection'
import IllustrationSection from './IllustrationSection'
import TrialCard from './TrialCard'
import { findVariables } from './variables'
import { type SectionKey, formFieldOf, sectionOfField } from './fieldVisibility'
import { ratioAfterLayoutChange, toFormValues, toPayload } from './formMapping'
import { useEnums } from '@/hooks/useEnums'
import { brand } from '@/theme'

/** 左侧分类：各步是主角，每步 = 提示词 + 带哪些能力 + 这一步自己的设置；配图可关。 */
const SECTIONS: { key: SectionKey; label: string; group?: string }[] = [
  { key: 'basic', label: '基本信息' },
  { key: 'retrieval', label: STAGE_LABEL.retrieval, group: '步骤' },
  { key: 'generation', label: STAGE_LABEL.generation, group: '步骤' },
  { key: 'review', label: STAGE_LABEL.review, group: '步骤' },
  { key: 'illustration', label: STAGE_LABEL.illustration, group: '步骤' },
]

/**
 * 编辑配方：左侧分类，中间是当前这一块，右侧常驻「最近一次试产」。
 * 「找资料 / 写 / 检查」每一步一整块提示词 + 这一步带的能力 + 这一步自己的设置——
 * 设置跟着它影响的那一步走，不另开一个「配方设置」，免得来回跳。
 *
 * 关键点：**所有块共用一个 Form**，切换分类只切换显示（display:none 而不是卸载）。
 * 这样 422 返回跨块的一批字段错误时，一次 setFields 就能全部标红——包括当前没显示的块。
 */
export default function RecipeEditorPage() {
  const { appId = '', recipeId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const handleError = useApiError()

  const [form] = Form.useForm()
  const { label } = useEnums()
  const layout = (Form.useWatch('layout', form) as Layout | undefined) ?? 'note'
  const [section, setSection] = useState<SectionKey>('generation')
  const [errorSections, setErrorSections] = useState<Set<SectionKey>>(new Set())
  const [readyHint, setReadyHint] = useState<string | null>(null)

  const { data: app } = useQuery({
    queryKey: qk.app(appId),
    queryFn: () => getApp(appId),
    enabled: Boolean(appId),
  })

  const { data: recipe, isLoading } = useQuery({
    queryKey: qk.recipe(appId, recipeId),
    queryFn: () => getRecipe(appId, recipeId),
    enabled: Boolean(appId && recipeId),
  })

  const prevLayout = useRef<Layout>('note')
  useEffect(() => {
    if (!recipe) return
    form.setFieldsValue(toFormValues(recipe))
    prevLayout.current = recipe.layout ?? 'note'
  }, [recipe, form])

  const isSelected = Boolean(recipe && app?.selectedRecipeId === recipe.recipeId)

  /** 把 422 的 errors[] 一次全部标红，并跳到第一个出错的段。 */
  const applyFieldErrors = (err: ApiError) => {
    const list = err.errors?.length
      ? err.errors
      : err.field
        ? [{ field: err.field, message: err.message }]
        : []
    if (!list.length) return false

    form.setFields(
      list.map((e) => ({ name: toNamePath(formFieldOf(e.field)), errors: [e.message] })),
    )
    const secs = new Set(list.map((e) => sectionOfField(e.field)))
    setErrorSections(secs)
    const first = SECTIONS.find((s) => secs.has(s.key))
    if (first) setSection(first.key)
    return true
  }

  const save = useMutation({
    mutationFn: (values: UpdateRecipeRequest) => updateRecipe(appId, recipeId, values),
    onSuccess: () => {
      setErrorSections(new Set())
      setReadyHint(null)
      message.success('已保存')
      qc.invalidateQueries({ queryKey: qk.recipe(appId, recipeId) })
      qc.invalidateQueries({ queryKey: qk.recipes(appId) })
    },
    onError: (err) => {
      if (err instanceof ApiError) applyFieldErrors(err)
      handleError(err)
    },
  })

  /**
   * 保存并启用 = PUT → ready → select，三步。
   *
   * **第三步 select 不能省**：只做到 ready 的话，配方仅仅是"配置完整"，
   * 应用当前用的还是原来那份——按钮叫「启用」却没启用，用户会以为生效了。
   *
   * 另一个最容易做错的地方：PUT 成功、ready 失败时，**配置已经存进数据库了**，
   * 只是没达到就绪标准。不能说成"整体失败"，否则用户以为白填了。
   */
  const saveAndEnable = useMutation({
    mutationFn: async (values: UpdateRecipeRequest) => {
      await updateRecipe(appId, recipeId, values)
      await markRecipeReady(appId, recipeId)
      return selectRecipe(appId, recipeId)
    },
    onSuccess: (r) => {
      setErrorSections(new Set())
      setReadyHint(null)
      message.success(`「${r.name}」已启用，之后的生产都会用它`)
      qc.invalidateQueries({ queryKey: qk.recipe(appId, recipeId) })
      qc.invalidateQueries({ queryKey: qk.recipes(appId) })
      qc.invalidateQueries({ queryKey: qk.app(appId) })
      // 配好了就该回列表看到它标着「使用中」，而不是干留在编辑页
      navigate(`/apps/${appId}/recipes`)
    },
    onError: (err) => {
      if (err instanceof ApiError && applyFieldErrors(err)) {
        setReadyHint(
          '已保存。还差标红的几项才能启用，补齐后再点「保存并启用」。',
        )
        return
      }
      handleError(err)
    },
  })

  const pending = save.isPending || saveAndEnable.isPending

  const submit = (mode: 'save' | 'enable') => {
    form
      .validateFields()
      .then(() => {
        // 取整个表单存储，而不只是已注册的输入项：各步挑的 MCP 动作没有单独的输入框
        const payload = toPayload(form.getFieldsValue(true), recipe)
        if (mode === 'save') {
          save.mutate(payload)
          return
        }
        // 会把应用当前在用的配方换掉 → 先问一声，别悄悄改
        const willSwitch =
          Boolean(app?.selectedRecipeId) && app?.selectedRecipeId !== recipeId
        if (willSwitch) {
          modal.confirm({
            title: '启用这份配方？',
            content:
              '启用后，这个应用之后发起的生产都会用这份配方，当前使用的那份会被替换。已经在跑的任务不受影响。',
            okText: '启用',
            cancelText: '取消',
            // catch 掉是为了让弹窗关上——失败的反馈由 onError 在页面上给
            // （422 会把缺的字段全标红），弹窗杵在那儿反而挡着看不见
            onOk: () => saveAndEnable.mutateAsync(payload).catch(() => {}),
          })
          return
        }
        saveAndEnable.mutate(payload)
      })
      .catch(() => {
        message.warning('还有必填项没填完')
      })
  }

  const navItems = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        hasError: errorSections.has(s.key),
      })),
    [errorSections],
  )

  const grants = Form.useWatch(['aiSetting', 'grants'], form) as Record<string, string[]> | undefined
  const illustration = Form.useWatch('illustration', form) as Recipe['illustration'] | undefined
  const grantCount = (k: SectionKey) => {
    if (k === 'illustration') return illustration?.enabled ? `${illustration.imageCount} 张` : '关'
    return grants?.[k]?.length ? `${grants[k].length} 个能力` : ''
  }

  if (isLoading || !recipe) {
    return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 12 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/apps/${appId}/recipes`)}
        >
          返回应用配方
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {recipe.name}
        </Typography.Title>
        {isSelected ? (
          <Tag color="success" variant="filled">● 使用中</Tag>
        ) : recipe.status === 'ready' ? (
          <Tag color="blue" variant="filled">就绪</Tag>
        ) : (
          <Tag variant="filled">草稿</Tag>
        )}
        <Tag variant="outlined" style={{ cursor: 'pointer' }} onClick={() => setSection('basic')}>
          {label('layout', layout)}
        </Tag>
        <Space style={{ marginLeft: 'auto' }}>
          <Button loading={save.isPending} onClick={() => submit('save')} disabled={pending}>
            保存
          </Button>
          <Button
            type="primary"
            loading={saveAndEnable.isPending}
            onClick={() => submit('enable')}
            disabled={pending}
          >
            保存并启用
          </Button>
        </Space>
      </div>

      {readyHint && (
        <Alert
          type="warning"
          showIcon
          closable
          message={readyHint}
          onClose={() => setReadyHint(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '184px minmax(0, 1fr) 340px', gap: 20, alignItems: 'start' }}>
        <Card style={{ position: 'sticky', top: 72 }} styles={{ body: { padding: 8 } }}>
          {navItems.map((s, i) => (
            <div key={s.key}>
              {/* 基本信息与各步之间留一道细线，不写分组名 */}
              {s.group && !navItems[i - 1]?.group && (
                <div style={{ borderTop: `1px solid ${brand.line}`, margin: '6px 12px' }} />
              )}
              <div
                onClick={() => setSection(s.key)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: section === s.key ? brand.inkSoft : 'transparent',
                  color: section === s.key ? brand.ink : brand.text,
                  fontWeight: section === s.key ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {s.label}
                <span style={{ marginLeft: 'auto' }}>
                  {s.hasError ? (
                    <Badge count={<ExclamationCircleFilled style={{ color: brand.danger }} />} />
                  ) : s.group ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{grantCount(s.key)}</Typography.Text>
                  ) : (
                    <CheckCircleFilled style={{ color: '#d1d5db', fontSize: 12 }} />
                  )}
                </span>
              </div>
            </div>
          ))}
        </Card>

        <Form
          form={form}
          layout="vertical"
          requiredMark
          scrollToFirstError
          onValuesChange={(changed: { layout?: Layout }) => {
            // 换版式时，图片比例还是旧版式的默认值就跟着换
            if (!changed.layout) return
            const ratio = form.getFieldValue(['illustration', 'imageRatio']) as ImageRatio | undefined
            const next = ratioAfterLayoutChange(prevLayout.current, changed.layout, ratio)
            if (next !== ratio) form.setFieldValue(['illustration', 'imageRatio'], next)
            prevLayout.current = changed.layout
          }}
        >
          {/* 用 display:none 而不是卸载——保持所有字段挂载，这样 setFields 能标红当前没显示的块 */}
          <Card style={{ display: section === 'basic' ? 'block' : 'none' }}>
            <BasicSection />
          </Card>
          <div style={{ display: section === 'retrieval' ? 'block' : 'none' }}>
            <StageSection stage="retrieval" appType={recipe.appType} recipeName={recipe.name} appTypeName={recipe.appTypeName}>
              <MaterialSection form={form} bare />
            </StageSection>
          </div>
          <div style={{ display: section === 'generation' ? 'block' : 'none' }}>
            <StageSection stage="generation" appType={recipe.appType} recipeName={recipe.name} appTypeName={recipe.appTypeName} />
          </div>
          <div style={{ display: section === 'review' ? 'block' : 'none' }}>
            <StageSection stage="review" appType={recipe.appType} recipeName={recipe.name} appTypeName={recipe.appTypeName}>
              <ReviewSection bare />
            </StageSection>
          </div>
          <div style={{ display: section === 'illustration' ? 'block' : 'none' }}>
            <IllustrationSection />
          </div>
        </Form>

        <div style={{ position: 'sticky', top: 72 }}>
          <TrialCard
            appId={appId}
            recipeId={recipeId}
            ready={recipe.status === 'ready'}
            variables={findVariables(...Object.values(recipe.aiSetting?.prompts ?? {}))}
          />
        </div>
      </div>
    </div>
  )
}
