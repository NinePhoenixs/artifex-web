import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftOutlined, CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons'
import { Alert, App, Badge, Button, Card, Form, Skeleton, Space, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, toNamePath } from '@/api/client'
import {
  getApp, getRecipe, markRecipeReady, selectRecipe, updateRecipe,
} from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import type { Recipe, UpdateRecipeRequest } from '@/api/types'
import { useApiError } from '@/hooks/useApiError'
import { BasicSection, GenerationSection, MaterialSection, ReviewSection } from './sections'
import { type SectionKey, sectionOfField } from './fieldVisibility'

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'basic', label: '基本信息' },
  { key: 'material', label: '资料检索' },
  { key: 'generation', label: '内容生成' },
  { key: 'review', label: '质量评审' },
]

/**
 * 编辑配方。设计见 docs/设计方案.md §7。
 *
 * 关键点：**四段共用一个 Form**，分段导航只切换显示哪一块（用 display:none
 * 而不是卸载）。这样 422 返回跨段的一批字段错误时，一次 setFields 就能
 * 全部标红——包括当前没显示的段。
 */
export default function RecipeEditorPage() {
  const { appId = '', recipeId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const handleError = useApiError()

  const [form] = Form.useForm()
  const [section, setSection] = useState<SectionKey>('basic')
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

  useEffect(() => {
    if (recipe) form.setFieldsValue(toFormValues(recipe))
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
      list.map((e) => ({ name: toNamePath(e.field), errors: [e.message] })),
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
          '配置已保存，但还差下面标红的几项才能启用。补齐后再点一次「保存并启用」。',
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
      .then((values) => {
        const payload = toPayload(values, recipe)
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

  if (isLoading || !recipe) {
    return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
  }

  return (
    <div style={{ maxWidth: 1180 }}>
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

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Card style={{ width: 200, flexShrink: 0 }} styles={{ body: { padding: 8 } }}>
          {navItems.map((s) => (
            <div
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: section === s.key ? '#eff4ff' : 'transparent',
                color: section === s.key ? '#2563eb' : '#0f172a',
                fontWeight: section === s.key ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {s.label}
              <span style={{ marginLeft: 'auto' }}>
                {s.hasError ? (
                  <Badge count={<ExclamationCircleFilled style={{ color: '#dc2626' }} />} />
                ) : (
                  <CheckCircleFilled style={{ color: '#d1d5db', fontSize: 12 }} />
                )}
              </span>
            </div>
          ))}
        </Card>

        <Card style={{ flex: 1, minWidth: 0 }}>
          <Form form={form} layout="vertical" requiredMark scrollToFirstError>
            {/* 用 display:none 而不是卸载——保持所有字段挂载，
                这样 setFields 能标红当前没显示的段 */}
            <div style={{ display: section === 'basic' ? 'block' : 'none' }}>
              <BasicSection />
            </div>
            <div style={{ display: section === 'material' ? 'block' : 'none' }}>
              <MaterialSection form={form} />
            </div>
            <div style={{ display: section === 'generation' ? 'block' : 'none' }}>
              <GenerationSection form={form} spec={recipe.generationSpec} />
            </div>
            <div style={{ display: section === 'review' ? 'block' : 'none' }}>
              <ReviewSection />
            </div>
          </Form>
        </Card>
      </div>
    </div>
  )
}

function toFormValues(r: Recipe) {
  return {
    name: r.name,
    description: r.description,
    materialSpec: r.materialSpec,
    generationSpec: r.generationSpec,
    reviewPolicy: r.reviewPolicy,
  }
}

/**
 * 全量提交。**只提交后端该类型确实有的字段**——
 * generationSpec 以详情响应的 key 为准，用户没改的照原样带回去。
 * 夹带别的类型的字段服务端会忽略，但没必要发。
 */
function toPayload(
  values: Record<string, unknown>,
  recipe: Recipe | undefined,
): UpdateRecipeRequest {
  const gen = (values.generationSpec ?? {}) as Record<string, unknown>
  const allowed = recipe ? Object.keys(recipe.generationSpec) : Object.keys(gen)
  const trimmedGen: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in gen) trimmedGen[key] = gen[key]
  }
  // 自定义配套字段是用户新填的，详情响应里可能没有这个 key
  for (const key of ['customSections', 'customTone', 'customVisualStyle', 'customFreshness']) {
    if (key in gen && !(key in trimmedGen)) trimmedGen[key] = gen[key]
  }

  return {
    name: String(values.name ?? ''),
    description: String(values.description ?? ''),
    materialSpec: values.materialSpec as UpdateRecipeRequest['materialSpec'],
    generationSpec: trimmedGen as unknown as UpdateRecipeRequest['generationSpec'],
    reviewPolicy: values.reviewPolicy as UpdateRecipeRequest['reviewPolicy'],
  }
}
