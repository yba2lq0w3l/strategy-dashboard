# Strategy Mission Control · 策略沙箱实盘监控大屏

面向 AI 策略沙箱的常驻监控大屏。实时轮询 Staging 后端，展示各智能体策略的运行状态、资金容量、杠杆与风控指标，并提供暂停 / 恢复 / 终止 / 调整资金 / 新建策略的一键控制。

**技术栈**：React 19 + TypeScript + Vite 8 + TailwindCSS 4 + Recharts + Zod + Vitest

---

## 快速开始

```bash
npm install
cp .env.example .env      # 可选，默认值已可直接运行
npm run dev               # http://localhost:5173
```

其他命令：

```bash
npm run build             # 类型检查 + 生产构建
npm run preview           # 预览生产包
npm run lint              # oxlint
npm run test              # 单元 / 集成测试
npm run test:coverage     # 覆盖率报告
```

---

## 关于 CORS：为什么必须走代理

上游 `https://agent-staging.agentos-app.app` **未开放 CORS**（`OPTIONS` 预检返回 405，响应中没有任何 `Access-Control-Allow-*` 头）。浏览器直连必然被拦截，因此前端统一以 `/api` 作为 Base URL：

| 环境 | 转发方式 | 配置位置 |
| --- | --- | --- |
| 本地开发 | Vite dev server proxy | `vite.config.ts` |
| Vercel 生产 | Rewrites 反向代理 | `vercel.json` |

不要把 `VITE_API_BASE_URL` 直接改成上游域名，否则页面会一直停留在 `OFFLINE` 状态。

---

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | 前端可见的 API 前缀，保持默认即可 |
| `VITE_API_USER_ID` | `u_dev` | `X-User-Id` 请求头 |
| `VITE_API_AGENT_ID` | `agent-test-001` | `X-Agent-Id` 请求头 |
| `VITE_API_TIMEOUT_MS` | `15000` | 单次请求超时 |
| `API_UPSTREAM_URL` | `https://agent-staging.agentos-app.app` | 仅开发态：Vite 代理的上游地址 |

---

## 部署到 Vercel

1. 推送仓库到 GitHub。
2. 在 Vercel 导入项目，Framework 选 **Vite**（`vercel.json` 已声明构建命令与输出目录）。
3. 无需配置环境变量即可运行；如需切换租户标识，在 Project Settings 里补 `VITE_API_USER_ID` / `VITE_API_AGENT_ID`。
4. 部署完成后 `/api/*` 会自动反代到 Staging 服务。

若上游地址变更，改 `vercel.json` 的 `rewrites.destination` 即可，无需改动前端代码。

---

## 后端契约与文档差异

以下差异**已通过 Staging 实测确认**，代码按实际行为实现：

| 项目 | 需求文档写法 | 实际后端行为 | 代码中的处理 |
| --- | --- | --- | --- |
| `state` 取值 | `created/active/paused/terminated` | 返回大写 `ACTIVE`/`PAUSED`/`TERMINATED` | 解析层统一小写化（`services/schemas.ts`） |
| `max_leverage` | 示例为 `"3x"` | 必须是纯数值字符串，`"3x"` 返回 `400 INVALID_REQUEST` | 表单在提交前拦截并提示（`services/validation.ts`） |
| `allocate` 请求体 | 未说明 | 必须包含 `{ "allocation": "..." }`，缺失返回 422 | `strategyApi.allocate` 固定携带该字段 |
| 状态机 | 未说明 | 仅 `ACTIVE` 可暂停、仅 `PAUSED` 可恢复，非法转换返回 409 | 按钮按状态禁用（`types/strategy.ts` 的 `canRunAction`） |
| 错误结构 | 未说明 | `{code, message, details, trace_id}`；参数错误为 FastAPI 的 `{detail:[...]}` | `services/apiError.ts` 统一归一化 |
| CORS | 未说明 | 完全未开放 | 开发/生产双端代理 |

---

## 真实数据 vs 模拟数据

大屏上的数据分两类，界面中已用 `SIM` 角标和页脚说明标出：

**真实（来自后端接口）**

- 策略列表、名称、ID、版本、模板
- 运行环境、状态、到期时间
- 资金分配 / 资金容量 / 策略容量 / 杠杆
- 活跃策略数、总分配资金、容量使用率
- 所有控制操作的结果

**模拟（后端暂无对应接口，前端合成）**

- 权益曲线与 PnL、最大回撤
- 预估胜率（66.6%）、最大回撤限制（12.5%）
- 买卖压力、Conviction、Edge、Imbalance、延迟与信号频率
- 信号类日志（`SIG` 级别）；控制与同步类日志是真实事件

模拟数据使用**可播种的确定性 PRNG**（`utils/random.ts`），种子由真实策略 ID 与状态派生，因此曲线不会在每次轮询时随机跳变，且真实策略变化时曲线随之变化。

---

## 目录结构

```
src/
├── App.tsx                     # 大屏布局与数据编排
├── config/
│   ├── env.ts                  # 环境变量、轮询档位、风控阈值
│   └── chartRanges.ts          # 图表时间范围档位
├── types/strategy.ts           # 领域模型与状态机
├── services/
│   ├── httpClient.ts           # fetch 封装：默认头、超时、错误归一化
│   ├── api.ts                  # 策略仓储（Repository 模式）
│   ├── schemas.ts              # zod 响应校验与 snake_case → 领域模型映射
│   ├── apiError.ts             # 统一错误模型
│   └── validation.ts           # 表单入口校验
├── hooks/
│   ├── useStrategies.ts        # 轮询、乐观更新、错误分级
│   ├── useTelemetry.ts         # 遥测流（模拟）
│   ├── useConsoleLog.ts        # 日志流
│   ├── useToasts.ts            # 轻提示
│   ├── useInterval.ts / useNow.ts
├── components/
│   ├── Header.tsx / ConnectionStatus.tsx
│   ├── PerformanceOverview.tsx / MetricCard.tsx
│   ├── EquityChart.tsx / ChartRangePicker.tsx
│   ├── StrategyGrid.tsx / StrategyCard.tsx
│   ├── CreateStrategyModal.tsx / AllocateModal.tsx
│   ├── ToastStack.tsx
│   ├── badges/ StateBadge.tsx RuntimeBadge.tsx
│   ├── telemetry/ TelemetryPanel.tsx PressureGauge.tsx FactorMeter.tsx LogConsole.tsx
│   └── ui/ Panel.tsx Button.tsx Modal.tsx Field.tsx
└── utils/
    ├── format.ts / metrics.ts  # 展示格式化与组合指标聚合
    ├── equity.ts / telemetry.ts / random.ts   # 模拟数据生成
```

---

## 可靠性设计

- **降级不白屏**：拿到过数据后再失败标记为 `DEGRADED`，保留上一份快照继续展示；从未成功过才显示 `OFFLINE`。
- **脏数据隔离**：列表逐条校验，单条格式异常只跳过该条并告警，不影响其余策略。
- **请求不堆积**：轮询间隔短于请求耗时时跳过重叠请求；组件卸载时中断在途请求。
- **不可逆操作二次确认**：终止策略需点击 YES 确认。
- **状态机前置约束**：按钮按当前状态禁用，减少注定失败的 409 请求。
- **终止策略默认收起**：后端策略已持久化到数据库，终止态会长期累积。ALL 视图默认隐藏它们并提示隐藏数量，可用「终止」开关或 TERMINATED 筛选调出；输入搜索词时自动不再隐藏，避免按名称搜不到。

---

## 无障碍与可视化规范

- 状态、环境、日志级别均以「颜色 + 图标 + 文字」三重编码，不依赖颜色单独表意。
- 买卖压力条配色经色觉障碍（CVD）分离度校验：teal `#2dd4bf` 与 rose `#fb7185` 在 deutan 模拟下 ΔE 8.4 通过，并配合方向与直标百分比作为二次编码。
- 权益曲线为单序列，标题即图例；十字准星 + 悬浮读数，网格与坐标轴保持弱化。
- 全站遵循 `prefers-reduced-motion`，开启后关闭所有动画。

---

## 测试

170 个测试，覆盖率约 96%（语句）/ 97%（行）。

```bash
npm run test
npm run test:coverage
```

覆盖范围：格式化与聚合工具、模拟数据生成的确定性、zod 边界校验、HTTP 错误归一化、API 请求体映射、轮询 Hook 的状态机与降级逻辑、策略卡按钮的状态约束、表单校验、以及 App 级集成流程（刷新、筛选、暂停、调资金、离线降级、遥测注入）。
