import { Info } from 'lucide-react'
import type { TemplateParamField } from '../../types/template'

interface TemplateParamListProps {
  readonly params: readonly TemplateParamField[]
}

function formatRange(param: TemplateParamField): string | null {
  if (param.minimum !== null && param.maximum !== null) {
    return `${param.minimum} ~ ${param.maximum}`
  }
  if (param.minimum !== null) return `≥ ${param.minimum}`
  if (param.maximum !== null) return `≤ ${param.maximum}`
  return null
}

/**
 * 模板参数一览（只读）。
 *
 * 上游用 params_schema 描述每个模板需要哪些参数，但创建接口
 * StrategyCreateRequest 目前没有接收它们的字段，所以这里只做说明性展示，
 * 并明确告知用户当前会使用模板默认值。
 */
export function TemplateParamList({ params }: TemplateParamListProps) {
  if (params.length === 0) return null

  return (
    <section className="rounded-lg border border-hairline bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5">
        <Info aria-hidden className="size-3.5 text-ink-faint" />
        <h4 className="label-caps">模板参数</h4>
      </div>

      <ul className="mt-2 grid gap-1.5">
        {params.map((param) => {
          const range = formatRange(param)
          return (
            <li key={param.name} className="flex items-baseline gap-2">
              <code className="numeric shrink-0 text-[11px] text-flux-soft">
                {param.name}
              </code>
              {param.required && (
                <span className="shrink-0 font-mono text-[9px] text-ask">必填</span>
              )}
              <span className="min-w-0 flex-1 text-[11px] text-ink-faint">
                {param.description || param.type}
                {range && <span className="numeric ml-1 opacity-70">({range})</span>}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="mt-2.5 border-t border-hairline/70 pt-2 text-[10px] text-ink-faint">
        当前创建接口尚未开放这些参数，启动后将使用模板默认值。
      </p>
    </section>
  )
}
