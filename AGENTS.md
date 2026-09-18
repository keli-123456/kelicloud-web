# Kelicloud Web

## 范围
- 仅适用于 `kelicloud-web`，不约束后端或 Agent 仓库。
- 前端改动保持现有 API 兼容；只有任务确实需要时才同步调整协议和调用方。
- 优先局部修改，不为小改动引入大型 UI 依赖或整套新样式。

## UI 约定
- 优先复用 `src/components/ui/*`；缺少组件时按现有模式补充，不强制安装组件或调用外部 registry。
- 需要共享的 Radix 封装放在 `src/components/ui/*`，页面专用逻辑留在所属模块。
- 使用 `src/lib/utils.ts` 的 `cn`、现有 Tailwind token 和 CSS 变量。
- 新增用户可见文案使用现有 i18n 方案。
- 保持后台导航一致、列表状态紧凑；长错误放入提示或详情，不撑大表格行。
- 危险操作保留确认和执行中禁用态，批量操作明确作用范围。

## 验证
- 运行代码变更后执行 `npm run lint`、`npm test`、`npm run build`。
- `build` 已包含 TypeScript 检查和 PWA 产物校验，不重复执行单独的类型检查或 Vite 构建。
- 文案或翻译变更时补跑 `npm run i18n:audit`；纯文档或指令调整只检查内容、引用和差异。
- UI 变更验证受影响的交互、桌面与移动端布局，以及浅色/深色状态。
