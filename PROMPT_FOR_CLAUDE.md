# 策略沙箱实盘监控大屏 (Strategy Mission Control Dashboard) - 需求与 Prompt

你是一个资深的前端开发专家，请帮我开发一个基于 React + TypeScript + Vite + TailwindCSS 的**数字人/AI 策略实时监控控制台**。
页面视觉风格和布局完全对标 [HyperAgent Live Demo](https://hyperagent.ch/live-demo) 的高科技暗黑极客风格。

---

## 1. 项目背景与目标

我们后端已经在 Staging 环境部署了 AI 策略容器，服务地址为：
`https://agent-staging.agentos-app.app`

我们需要一个常驻运行的前端大屏监控面板，自动通过 HTTP API 轮询该服务，将沙箱中运行的各个 AI 智能体策略状态、资金容量、PnL 收益、杠杆比率以及实时控制按钮展示在界面上。

---

## 2. API 接口规范

**Base URL**: `https://agent-staging.agentos-app.app`
**默认请求头 (Default Headers)**:
```json
{
  "X-User-Id": "u_dev",
  "X-Agent-Id": "agent-test-001",
  "Content-Type": "application/json"
}
```

### 核心接口列表：
1. **获取策略列表**: `GET /v1/agent/strategies`
   - 返回结构: `{ "items": [ { "strategy_id": "...", "name": "...", "runtime_env": "live|paper|backtest", "allocation": "...", "capital_capacity": "...", "strategy_capacity": "...", "max_leverage": "...", "state": "created|active|paused|terminated", "expires_at": "...", "version": 1 } ] }`
2. **获取策略详情**: `GET /v1/agent/strategies/{strategy_id}`
3. **创建新策略**: `POST /v1/agent/strategies`
   - Body: `{ "name": "...", "template_id": "...", "runtime_env": "paper", "allocation": "10000", "capital_capacity": "50000", "strategy_capacity": "100000", "max_leverage": "3x" }`
4. **暂停策略**: `POST /v1/agent/strategies/{strategy_id}/pause`
5. **恢复策略**: `POST /v1/agent/strategies/{strategy_id}/resume`
6. **终止策略**: `POST /v1/agent/strategies/{strategy_id}/terminate`
7. **修改资金分配**: `POST /v1/agent/strategies/{strategy_id}/allocate`

---

## 3. UI 布局与组件设计（参考 HyperAgent 风格）

**整体风格**: 深色极客暗黑主题 (`#020617`)，搭配 翡翠绿 (`#10b981`) 和 靛蓝 (`#6366f1`) 霓虹高亮。

### 模块划分：

1. **Header 顶部栏**:
   - 左侧：Logo + 系统的实时连接状态指示器 (`● ONLINE - Staging Connected`)。
   - 右侧：自动刷新开关（可选 2s / 5s / 关）、手动刷新按钮、新建策略 Modal 触发按钮。

2. **Top Performance Overview (核心指标卡片)**:
   - 活跃策略数 (Active Strategies)
   - 总资金分配 (Total Allocated Capital)
   - 平均胜率预测 (Estimated Win Rate, 模拟展示 66.6%)
   - 最大回撤限制 (Max Drawdown Limit)

3. **主区域 - 左侧/中央部分**:
   - **组件 A: 资金收益曲线 (Equity Curve Chart)**:
     - 使用 Recharts / Chart.js 绘制暗黑高光渐变的 PnL 折线图。支持展示随着策略运行产生的累积收益。
   - **组件 B: 智能体策略列表 (Strategy Grid & Control)**:
     - 以美观的科技感卡片/表格展示策略列表。
     - 展示：策略 ID、策略名称、运行环境 Badge (`live`/`paper`/`backtest`)、状态 Badge (`active` 绿色/`paused` 黄色/`terminated` 红色)、分配额度、资金容量、杠杆倍数、到期时间。
     - 包含快捷操作按钮：一键【暂停】、【恢复】、【终止】。

4. **主区域 - 右侧部分 (Neural Stream & AI Feed)**:
   - **AI 决策与信号流 (Telemetry Feed)**:
     - 模仿 HyperAgent 展示买卖压力 (Bid vs Ask Pressure Gauge)。
     - 因子指标：Conviction (72%)、Edge 得分 (72)、Imbalance (0.93x)。
     - 实时运行日志流 (Console-style live feed)。

---

## 4. 技术栈与库推荐

- **框架**: React 18 + TypeScript + Vite
- **样式**: TailwindCSS (可搭配 lucide-react 提供图标)
- **图表**: Recharts 或 Chart.js
- **网络请求**: fetch 或 axios (配有定时轮询 `setInterval` / `react-query`)

---

## 5. 输出要求

请帮我生成完整的代码结构与文件，包含：
1. `src/App.tsx` 及相关子组件 (`components/StrategyCard.tsx`, `components/EquityChart.tsx`, `components/Header.tsx`, `components/CreateStrategyModal.tsx`)
2. API 请求封装模块 `src/services/api.ts`
3. TailwindCSS 配置与样式代码
4. 确保代码可以直接运行 `npm run dev` 本地预览，并支持随时推送到 GitHub 一键在 Vercel 部署。
