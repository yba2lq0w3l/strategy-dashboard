import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, RefreshCw, Rocket } from 'lucide-react'
import type { CreateStrategyInput, RuntimeEnv } from '../../types/strategy'
import { RUNTIME_ENVS } from '../../types/strategy'
import type { StrategyTemplate } from '../../types/template'
import { getErrorMessage } from '../../services/apiError'
import {
  collectFieldErrors,
  launchTemplateFormSchema,
  splitAssets,
  type FieldErrors,
  type LaunchTemplateFormValues,
} from '../../services/validation'
import { percentToRatio } from '../../utils/percent'
import { formatCompactCurrency, formatLeverage } from '../../utils/format'
import { Button } from '../ui/Button'
import { CONTROL_CLASS, CONTROL_ERROR_CLASS, Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { RiskBadge } from '../badges/RiskBadge'
import { TemplateCard } from './TemplateCard'
import { TemplateParamList } from './TemplateParamList'

interface LaunchTemplateModalProps {
  readonly open: boolean
  readonly templates: readonly StrategyTemplate[]
  readonly loading: boolean
  readonly error: string | null
  readonly onReload: () => void
  readonly onClose: () => void
  readonly onLaunch: (input: CreateStrategyInput) => Promise<unknown>
}

function initialValues(template: StrategyTemplate): LaunchTemplateFormValues {
  return {
    name: template.name,
    allocation: template.defaultAllocation,
    takeProfitPct: '10',
    stopLossPct: '5',
    allowedAssets: '',
  }
}

export function LaunchTemplateModal({
  open,
  templates,
  loading,
  error,
  onReload,
  onClose,
  onLaunch,
}: LaunchTemplateModalProps) {
  const [selected, setSelected] = useState<StrategyTemplate | null>(null)
  const [values, setValues] = useState<LaunchTemplateFormValues | null>(null)
  const [runtimeEnv, setRuntimeEnv] = useState<RuntimeEnv>('paper')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  // 每次打开都回到第一步，避免残留上次的选择。
  useEffect(() => {
    if (!open) return
    setSelected(null)
    setValues(null)
    setRuntimeEnv('paper')
    setErrors({})
    setSubmitting(false)
  }, [open])

  const handleSelect = (template: StrategyTemplate) => {
    setSelected(template)
    setValues(initialValues(template))
    setErrors({})
  }

  const update = <K extends keyof LaunchTemplateFormValues>(
    key: K,
    value: LaunchTemplateFormValues[K],
  ) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleLaunch = async () => {
    if (!selected || !values) return

    const parsed = launchTemplateFormSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error))
      return
    }

    const data = parsed.data
    const allocation = data.allocation.trim()
    const assets = splitAssets(data.allowedAssets)

    setErrors({})
    setSubmitting(true)
    try {
      await onLaunch({
        name: data.name.trim(),
        templateId: selected.templateId,
        runtimeEnv,
        // 「授权固定额度」的语义就是不超过这个数，因此容量与额度取齐。
        allocation,
        capitalCapacity: allocation,
        strategyCapacity: allocation,
        maxLeverage: selected.recommendedLeverage,
        ...(assets.length > 0 ? { allowedAssets: assets } : {}),
        // 表单收百分比，上游要 0~1 比例，务必在此转换。
        ...(data.takeProfitPct
          ? { takeProfitPct: percentToRatio(Number(data.takeProfitPct)) }
          : {}),
        ...(data.stopLossPct
          ? { stopLossPct: percentToRatio(Number(data.stopLossPct)) }
          : {}),
      })
      onClose()
    } catch (err: unknown) {
      setErrors({ _form: getErrorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  const step = selected === null ? 'pick' : 'configure'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'pick' ? '选择官方策略模板' : `配置 · ${selected?.name}`}
      subtitle={
        step === 'pick'
          ? 'GET /v1/agent/strategy-templates · 选择模板后配置授权额度与风控'
          : '确认参数后一键启动，策略将立即进入 ACTIVE'
      }
      footer={
        step === 'pick' ? (
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              icon={<ArrowLeft aria-hidden className="size-3.5" />}
              onClick={() => setSelected(null)}
              disabled={submitting}
            >
              返回选择
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              icon={<Rocket aria-hidden className="size-3.5" />}
              onClick={() => void handleLaunch()}
            >
              一键启动策略
            </Button>
          </>
        )
      }
    >
      {step === 'pick' ? (
        <TemplatePicker
          templates={templates}
          loading={loading}
          error={error}
          onReload={onReload}
          onSelect={handleSelect}
        />
      ) : (
        selected &&
        values && (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void handleLaunch()
            }}
          >
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-white/[0.02] px-3 py-2.5">
              <RiskBadge level={selected.riskLevel} />
              <span className="numeric text-[11px] text-ink-dim">
                推荐杠杆 {formatLeverage(selected.recommendedLeverage)}
              </span>
              <span className="numeric text-[11px] text-ink-dim">
                建议额度 {formatCompactCurrency(selected.defaultAllocation)}
              </span>
              <code className="numeric ml-auto text-[10px] text-ink-faint">
                {selected.templateId}
              </code>
            </div>

            <Field label="Strategy Name" htmlFor="tpl-name" error={errors.name}>
              <input
                id="tpl-name"
                value={values.name}
                onChange={(event) => update('name', event.target.value)}
                className={errors.name ? CONTROL_ERROR_CLASS : CONTROL_CLASS}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="授权额度 (Allocation)"
                htmlFor="tpl-allocation"
                hint="资金容量与策略容量将与该额度取齐"
                error={errors.allocation}
              >
                <input
                  id="tpl-allocation"
                  inputMode="decimal"
                  value={values.allocation}
                  onChange={(event) => update('allocation', event.target.value)}
                  className={
                    errors.allocation ? CONTROL_ERROR_CLASS : CONTROL_CLASS
                  }
                />
              </Field>

              <Field
                label="Runtime Env"
                htmlFor="tpl-runtime"
                hint={runtimeEnv === 'live' ? '⚠ live 为真实资金环境' : undefined}
              >
                <select
                  id="tpl-runtime"
                  value={runtimeEnv}
                  onChange={(event) =>
                    setRuntimeEnv(event.target.value as RuntimeEnv)
                  }
                  className={CONTROL_CLASS}
                >
                  {RUNTIME_ENVS.map((env) => (
                    <option key={env} value={env} className="bg-panel">
                      {env}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="止盈比例 (%)"
                htmlFor="tpl-tp"
                hint="按百分比填写，10 表示 +10%；留空则不设"
                error={errors.takeProfitPct}
              >
                <input
                  id="tpl-tp"
                  inputMode="decimal"
                  value={values.takeProfitPct}
                  onChange={(event) =>
                    update('takeProfitPct', event.target.value)
                  }
                  className={
                    errors.takeProfitPct ? CONTROL_ERROR_CLASS : CONTROL_CLASS
                  }
                />
              </Field>

              <Field
                label="止损比例 (%)"
                htmlFor="tpl-sl"
                hint="按百分比填写，5 表示 -5%；留空则不设"
                error={errors.stopLossPct}
              >
                <input
                  id="tpl-sl"
                  inputMode="decimal"
                  value={values.stopLossPct}
                  onChange={(event) => update('stopLossPct', event.target.value)}
                  className={
                    errors.stopLossPct ? CONTROL_ERROR_CLASS : CONTROL_CLASS
                  }
                />
              </Field>
            </div>

            <Field
              label="允许资产对 (Allowed Assets)"
              htmlFor="tpl-assets"
              hint="逗号分隔，如 BTC-USDT, ETH-USDT；留空表示不限"
              error={errors.allowedAssets}
            >
              <input
                id="tpl-assets"
                value={values.allowedAssets}
                onChange={(event) => update('allowedAssets', event.target.value)}
                placeholder="BTC-USDT, ETH-USDT"
                className={
                  errors.allowedAssets ? CONTROL_ERROR_CLASS : CONTROL_CLASS
                }
              />
            </Field>

            <TemplateParamList params={selected.params} />

            {errors._form && (
              <p
                className="rounded border border-ask/40 bg-ask/10 px-3 py-2 text-[11px] text-ask"
                role="alert"
              >
                {errors._form}
              </p>
            )}
          </form>
        )
      )}
    </Modal>
  )
}

interface TemplatePickerProps {
  readonly templates: readonly StrategyTemplate[]
  readonly loading: boolean
  readonly error: string | null
  readonly onReload: () => void
  readonly onSelect: (template: StrategyTemplate) => void
}

function TemplatePicker({
  templates,
  loading,
  error,
  onReload,
  onSelect,
}: TemplatePickerProps) {
  if (loading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Loader2 aria-hidden className="size-6 animate-spin text-ink-faint" />
        <p className="text-sm text-ink-dim">正在加载官方模板…</p>
      </div>
    )
  }

  if (error && templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-ask">模板加载失败</p>
        <p className="text-[11px] text-ink-faint">{error}</p>
        <Button
          variant="outline"
          icon={<RefreshCw aria-hidden className="size-3.5" />}
          onClick={onReload}
        >
          重试
        </Button>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-dim">
        暂无可用的官方策略模板
      </p>
    )
  }

  return (
    <div
      className="grid max-h-[60vh] gap-2.5 overflow-y-auto sm:grid-cols-2"
      role="list"
      aria-label="官方策略模板"
    >
      {templates.map((template) => (
        <div key={template.templateId} role="listitem" className="flex">
          <TemplateCard
            template={template}
            selected={false}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  )
}
