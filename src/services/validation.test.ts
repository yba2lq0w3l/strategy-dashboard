import { describe, expect, it } from 'vitest'
import {
  allocationFormSchema,
  collectFieldErrors,
  createStrategyFormSchema,
  DEFAULT_CREATE_FORM,
  toCreateInput,
} from './validation'

/** 以一份合法表单为基线，只覆盖被测字段，避免其他字段的错误干扰断言。 */
const VALID_FORM = { ...DEFAULT_CREATE_FORM, name: 'Alpha Momentum' }

function errorsFor(values: Record<string, unknown>) {
  const result = createStrategyFormSchema.safeParse({
    ...VALID_FORM,
    ...values,
  })
  if (result.success) return {}
  return collectFieldErrors(result.error)
}

describe('createStrategyFormSchema', () => {
  it('默认表单填入名称后即可通过校验', () => {
    expect(
      createStrategyFormSchema.safeParse({
        ...DEFAULT_CREATE_FORM,
        name: 'Alpha Momentum',
      }).success,
    ).toBe(true)
  })

  it('默认表单的名称留空，强制用户填写', () => {
    expect(createStrategyFormSchema.safeParse(DEFAULT_CREATE_FORM).success).toBe(
      false,
    )
  })

  it('拒绝空名称', () => {
    expect(errorsFor({ name: '   ' }).name).toBe('策略名称不能为空')
  })

  it('拒绝超长名称', () => {
    expect(errorsFor({ name: 'a'.repeat(65) }).name).toContain('64')
  })

  it('拒绝 "3x" 这类带单位的杠杆写法（后端会 400）', () => {
    expect(errorsFor({ maxLeverage: '3x' }).maxLeverage).toContain('纯数字')
  })

  it('拒绝超出上限的杠杆', () => {
    expect(errorsFor({ maxLeverage: '999' }).maxLeverage).toContain('125')
  })

  it('拒绝非数字金额', () => {
    expect(errorsFor({ allocation: 'abc' }).allocation).toBe('资金分配必须是数字')
  })

  it('拒绝零或负数金额', () => {
    expect(errorsFor({ allocation: '0' }).allocation).toBe('资金分配必须大于 0')
  })

  it('校验资金分配不超过资金容量', () => {
    expect(errorsFor({ allocation: '90000' }).allocation).toBe(
      '资金分配不能超过资金容量',
    )
  })

  it('校验资金容量不超过策略容量', () => {
    expect(
      errorsFor({ capitalCapacity: '200000', allocation: '100' })
        .capitalCapacity,
    ).toBe('资金容量不能超过策略容量')
  })

  it('拒绝非法运行环境', () => {
    expect(errorsFor({ runtimeEnv: 'prod' }).runtimeEnv).toBeDefined()
  })
})

describe('allocationFormSchema', () => {
  it('校验分配金额', () => {
    expect(allocationFormSchema.safeParse({ allocation: '2000' }).success).toBe(
      true,
    )
    expect(allocationFormSchema.safeParse({ allocation: '-1' }).success).toBe(
      false,
    )
  })
})

describe('toCreateInput', () => {
  it('提交前去除首尾空格', () => {
    const input = toCreateInput({
      ...DEFAULT_CREATE_FORM,
      name: '  Alpha  ',
      templateId: ' tpl_demo ',
      maxLeverage: ' 3 ',
    })

    expect(input.name).toBe('Alpha')
    expect(input.templateId).toBe('tpl_demo')
    expect(input.maxLeverage).toBe('3')
  })
})

describe('collectFieldErrors', () => {
  it('每个字段只保留第一条错误', () => {
    const result = createStrategyFormSchema.safeParse({
      ...DEFAULT_CREATE_FORM,
      name: '',
      allocation: 'abc',
    })

    expect(result.success).toBe(false)
    if (result.success) return

    const errors = collectFieldErrors(result.error)
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(['name', 'allocation']),
    )
  })
})
