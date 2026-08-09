/**
 * 百分比 ↔ 比例 转换。
 *
 * 上游的 `take_profit_pct` / `stop_loss_pct` 是 0~1 的**比例字符串**
 * （0.15 表示 +15%），而用户在表单里输入的是**百分比**（15）。
 * 后端对该范围不做任何校验——把 15 原样提交会被当成 1500%，
 * 所以这层转换是必须的，不是可选的美化。
 */

/** 百分比 → 比例字符串。10 → "0.1"。 */
export function percentToRatio(percent: number, digits = 6): string {
  if (!Number.isFinite(percent)) return '0'
  const ratio = percent / 100
  // 去掉浮点尾巴（0.1 而不是 0.10000000000000001），再去掉多余的尾随零。
  return String(Number(ratio.toFixed(digits)))
}

/** 比例字符串 → 百分比数值。"0.1" → 10。无效值返回 null。 */
export function ratioToPercent(
  ratio: string | number | null | undefined,
): number | null {
  if (ratio === null || ratio === undefined || ratio === '') return null
  const parsed = typeof ratio === 'number' ? ratio : Number(ratio)
  if (!Number.isFinite(parsed)) return null
  return Number((parsed * 100).toFixed(4))
}

/** 用于展示的百分比文本。"0.1" → "10%"，无值时返回占位符。 */
export function formatRatioAsPercent(
  ratio: string | number | null | undefined,
  placeholder = '未设',
): string {
  const percent = ratioToPercent(ratio)
  if (percent === null) return placeholder
  return `${Number(percent.toFixed(2))}%`
}
