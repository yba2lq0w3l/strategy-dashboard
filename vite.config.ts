import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * 上游 Staging 服务未返回任何 CORS 响应头（OPTIONS 预检直接 405），
 * 因此浏览器无法直连。开发态统一走 Vite 代理，生产态走 vercel.json rewrites，
 * 两端都以 `/api` 作为前端可见的 Base URL。
 */
const DEFAULT_UPSTREAM = 'https://agent-staging.agentos-app.app'
const PROXY_PREFIX = '/api'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const upstream = env.API_UPSTREAM_URL || DEFAULT_UPSTREAM

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        [PROXY_PREFIX]: {
          target: upstream,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(new RegExp(`^${PROXY_PREFIX}`), ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // 图表库体积大且很少变动，单独分包以便浏览器长期缓存。
          manualChunks: (id: string) => {
            if (/node_modules[/\\](recharts|d3-|victory-)/.test(id)) {
              return 'charts'
            }
            if (/node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) {
              return 'react'
            }
            return undefined
          },
        },
      },
    },
  }
})
