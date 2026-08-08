import { z } from 'zod'
import type { CreateStrategyInput, RuntimeEnv } from '../types/strategy'

/**
 * 表单入口校验。
 *
 * 关键约束：上游要求 `max_leverage` 为**纯数值字符串**——
 * 需求文档里的 `"3x"` 会被后端拒绝（400 INVALID_REQUEST），
 * 因此这里在提交前就拦下带单位的写法。
 */

const MAX_LEVERAGE_CAP = 125
const MAX_NAME_LENGTH = 64

const positiveAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label}不能为空`)
    .refine((value) => /^\d+(\.\d+)?$/.test(value), `${label}必须是数字`)
    .refine((value) => Number(value) > 0, `${label}必须大于 0`)

export const createStrategyFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, '策略名称不能为空')
      .max(MAX_NAME_LENGTH, `策略名称不能超过 ${MAX_NAME_LENGTH} 个字符`),
    templateId: z.string().trim().min(1, '模板 ID 不能为空'),
    runtimeEnv: z.enum(['live', 'paper', 'backtest']),
    allocation: positiveAmount('资金分配'),
    capitalCapacity: positiveAmount('资金容量'),
    strategyCapacity: positiveAmount('策略容量'),
    maxLeverage: z
      .string()
      .trim()
      .min(1, '杠杆倍数不能为空')
      .refine(
        (value) => /^\d+(\.\d+)?$/.test(value),
        '杠杆必须是纯数字（例如 3，不要写 3x）',
      )
      .refine(
        (value) => Number(value) > 0 && Number(value) <= MAX_LEVERAGE_CAP,
        `杠杆需在 0 与 ${MAX_LEVERAGE_CAP} 之间`,
      ),
  })
  .refine(
    (data) => Number(data.allocation) <= Number(data.capitalCapacity),
    { path: ['allocation'], message: '资金分配不能超过资金容量' },
  )
  .refine(
    (data) => Number(data.capitalCapacity) <= Number(data.strategyCapacity),
    { path: ['capitalCapacity'], message: '资金容量不能超过策略容量' },
  )

export type CreateStrategyFormValues = z.infer<typeof createStrategyFormSchema>

export const allocationFormSchema = z.object({
  allocation: positiveAmount('资金分配'),
})

export type FieldErrors = Readonly<Record<string, string>>

/** 把 zod 的 issue 列表压平成 `字段名 -> 首条错误` 的映射，便于表单渲染。 */
export function collectFieldErrors(error: z.ZodError): FieldErrors {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form'
    if (!(key in result)) result[key] = issue.message
  }
  return result
}

export const DEFAULT_CREATE_FORM: CreateStrategyFormValues = Object.freeze({
  name: '',
  templateId: 'tpl_demo',
  runtimeEnv: 'paper' as RuntimeEnv,
  allocation: '10000',
  capitalCapacity: '50000',
  strategyCapacity: '100000',
  maxLeverage: '3',
})

export function toCreateInput(
  values: CreateStrategyFormValues,
): CreateStrategyInput {
  return {
    name: values.name.trim(),
    templateId: values.templateId.trim(),
    runtimeEnv: values.runtimeEnv,
    allocation: values.allocation.trim(),
    capitalCapacity: values.capitalCapacity.trim(),
    strategyCapacity: values.strategyCapacity.trim(),
    maxLeverage: values.maxLeverage.trim(),
  }
}
