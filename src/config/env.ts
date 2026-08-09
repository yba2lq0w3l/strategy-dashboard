/**
 * 运行时配置。所有值均来自 Vite 环境变量，代码中不硬编码任何凭证。
 * `X-User-Id` / `X-Agent-Id` 是 Staging 的租户标识（非密钥），
 * 保留可覆盖能力以便切换调试账号。
 */

const DEFAULT_API_BASE_URL = '/api'
const DEFAULT_USER_ID = 'u_dev'
const DEFAULT_AGENT_ID = 'agent-test-001'
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000

function readEnv(key: string, fallback: string): string {
  const raw = import.meta.env[key as keyof ImportMetaEnv]
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function readPositiveInt(key: string, fallback: number): number {
  const parsed = Number.parseInt(readEnv(key, ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export interface AppConfig {
  readonly apiBaseUrl: string
  readonly userId: string
  readonly agentId: string
  readonly requestTimeoutMs: number
}

export const appConfig: AppConfig = Object.freeze({
  apiBaseUrl: readEnv('VITE_API_BASE_URL', DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    '',
  ),
  userId: readEnv('VITE_API_USER_ID', DEFAULT_USER_ID),
  agentId: readEnv('VITE_API_AGENT_ID', DEFAULT_AGENT_ID),
  requestTimeoutMs: readPositiveInt(
    'VITE_API_TIMEOUT_MS',
    DEFAULT_REQUEST_TIMEOUT_MS,
  ),
})

export function defaultHeaders(): Record<string, string> {
  return {
    'X-User-Id': appConfig.userId,
    'X-Agent-Id': appConfig.agentId,
    'Content-Type': 'application/json',
  }
}

/** 轮询档位：需求要求 2s / 5s / 关。 */
export const REFRESH_INTERVALS = [
  { label: '2s', value: 2_000 },
  { label: '5s', value: 5_000 },
  { label: 'OFF', value: 0 },
] as const

export type RefreshInterval = (typeof REFRESH_INTERVALS)[number]['value']
