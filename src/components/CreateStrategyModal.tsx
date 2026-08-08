import { useEffect, useState } from 'react'
import { Rocket } from 'lucide-react'
import { RUNTIME_ENVS, type CreateStrategyInput } from '../types/strategy'
import { getErrorMessage } from '../services/apiError'
import {
  collectFieldErrors,
  createStrategyFormSchema,
  DEFAULT_CREATE_FORM,
  toCreateInput,
  type CreateStrategyFormValues,
  type FieldErrors,
} from '../services/validation'
import { Button } from './ui/Button'
import { CONTROL_CLASS, CONTROL_ERROR_CLASS, Field } from './ui/Field'
import { Modal } from './ui/Modal'

interface CreateStrategyModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onSubmit: (input: CreateStrategyInput) => Promise<unknown>
}

const AMOUNT_FIELDS = [
  {
    key: 'allocation',
    label: 'Allocation',
    hint: '初始投入资金',
  },
  {
    key: 'capitalCapacity',
    label: 'Capital Capacity',
    hint: '资金上限',
  },
  {
    key: 'strategyCapacity',
    label: 'Strategy Capacity',
    hint: '策略总容量',
  },
] as const

export function CreateStrategyModal({
  open,
  onClose,
  onSubmit,
}: CreateStrategyModalProps) {
  const [values, setValues] = useState<CreateStrategyFormValues>(DEFAULT_CREATE_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(DEFAULT_CREATE_FORM)
    setErrors({})
    setSubmitting(false)
  }, [open])

  const update = <K extends keyof CreateStrategyFormValues>(
    key: K,
    value: CreateStrategyFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const parsed = createStrategyFormSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error))
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      await onSubmit(toCreateInput(parsed.data))
      onClose()
    } catch (error: unknown) {
      setErrors({ _form: getErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deploy New Strategy"
      subtitle="POST /v1/agent/strategies · 部署后立即进入 ACTIVE 状态"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            icon={<Rocket aria-hidden className="size-3.5" />}
            onClick={() => void handleSubmit()}
          >
            DEPLOY
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <Field label="Strategy Name" htmlFor="field-name" error={errors.name}>
          <input
            id="field-name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="例如 Alpha Momentum v2"
            className={errors.name ? CONTROL_ERROR_CLASS : CONTROL_CLASS}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Template ID"
            htmlFor="field-template"
            error={errors.templateId}
          >
            <input
              id="field-template"
              value={values.templateId}
              onChange={(event) => update('templateId', event.target.value)}
              className={errors.templateId ? CONTROL_ERROR_CLASS : CONTROL_CLASS}
            />
          </Field>

          <Field
            label="Runtime Env"
            htmlFor="field-runtime"
            hint={values.runtimeEnv === 'live' ? '⚠ live 为真实资金环境' : undefined}
          >
            <select
              id="field-runtime"
              value={values.runtimeEnv}
              onChange={(event) =>
                update(
                  'runtimeEnv',
                  event.target.value as CreateStrategyFormValues['runtimeEnv'],
                )
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

        <div className="grid gap-4 sm:grid-cols-3">
          {AMOUNT_FIELDS.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              htmlFor={`field-${field.key}`}
              hint={field.hint}
              error={errors[field.key]}
            >
              <input
                id={`field-${field.key}`}
                inputMode="decimal"
                value={values[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                className={
                  errors[field.key] ? CONTROL_ERROR_CLASS : CONTROL_CLASS
                }
              />
            </Field>
          ))}
        </div>

        <Field
          label="Max Leverage"
          htmlFor="field-leverage"
          hint="纯数字，后端不接受 3x 这类带单位写法"
          error={errors.maxLeverage}
        >
          <input
            id="field-leverage"
            inputMode="decimal"
            value={values.maxLeverage}
            onChange={(event) => update('maxLeverage', event.target.value)}
            className={errors.maxLeverage ? CONTROL_ERROR_CLASS : CONTROL_CLASS}
          />
        </Field>

        {errors._form && (
          <p
            className="rounded border border-ask/40 bg-ask/10 px-3 py-2 text-[11px] text-ask"
            role="alert"
          >
            {errors._form}
          </p>
        )}
      </form>
    </Modal>
  )
}
