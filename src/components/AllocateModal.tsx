import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import type { Strategy } from '../types/strategy'
import {
  allocationFormSchema,
  collectFieldErrors,
  type FieldErrors,
} from '../services/validation'
import { formatCurrency, parseAmount } from '../utils/format'
import { Button } from './ui/Button'
import { CONTROL_CLASS, CONTROL_ERROR_CLASS, Field } from './ui/Field'
import { Modal } from './ui/Modal'

interface AllocateModalProps {
  readonly strategy: Strategy | null
  readonly onClose: () => void
  readonly onSubmit: (strategyId: string, allocation: string) => Promise<boolean>
}

export function AllocateModal({
  strategy,
  onClose,
  onSubmit,
}: AllocateModalProps) {
  const [allocation, setAllocation] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!strategy) return
    setAllocation(strategy.allocation)
    setErrors({})
    setSubmitting(false)
  }, [strategy])

  const capacity = parseAmount(strategy?.capitalCapacity)

  const handleSubmit = async () => {
    if (!strategy) return

    const parsed = allocationFormSchema.safeParse({ allocation })
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error))
      return
    }

    if (capacity > 0 && Number(parsed.data.allocation) > capacity) {
      setErrors({
        allocation: `不能超过资金容量 ${formatCurrency(capacity)}`,
      })
      return
    }

    setErrors({})
    setSubmitting(true)
    const success = await onSubmit(strategy.strategyId, parsed.data.allocation)
    setSubmitting(false)
    if (success) onClose()
  }

  return (
    <Modal
      open={strategy !== null}
      onClose={onClose}
      title="Reallocate Capital"
      subtitle={
        strategy
          ? `POST /v1/agent/strategies/${strategy.strategyId}/allocate`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            icon={<Coins aria-hidden className="size-3.5" />}
            onClick={() => void handleSubmit()}
          >
            APPLY
          </Button>
        </>
      }
    >
      {strategy && (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-hairline bg-white/[0.02] px-3 py-2.5">
            <div>
              <dt className="label-caps">Strategy</dt>
              <dd className="truncate text-xs text-ink">{strategy.name}</dd>
            </div>
            <div>
              <dt className="label-caps">当前分配</dt>
              <dd className="numeric text-xs text-ink">
                {formatCurrency(strategy.allocation)}
              </dd>
            </div>
          </dl>

          <Field
            label="New Allocation"
            htmlFor="field-allocation"
            hint={`资金容量上限 ${formatCurrency(strategy.capitalCapacity)}`}
            error={errors.allocation}
          >
            <input
              id="field-allocation"
              inputMode="decimal"
              autoFocus
              value={allocation}
              onChange={(event) => setAllocation(event.target.value)}
              className={errors.allocation ? CONTROL_ERROR_CLASS : CONTROL_CLASS}
            />
          </Field>
        </form>
      )}
    </Modal>
  )
}
