## UI Polish Rules
- 修改任何弹窗、表单、表格、工具栏、提示区时，先阅读 docs/ui-polish-skill.md
- 所有 UI 改动必须优先满足：
  1. 布局正确
  2. 响应式不崩
  3. 视觉层级清晰
  4. 交互可预测
  5. shared wrappers 优先
  6. shadcn/ui 优先
  7. 颜色语义一致
  8. a11y 达标
- 不允许新增平行基础 UI 层
- 不允许在窄宽度下让中文标题逐字换行或竖排
- 所有状态颜色必须来自统一语义映射
## Status Color Rules
- 修改状态标签、提示、按钮、进度条、资源指标时，先阅读 docs/color-status-map.md
- 所有状态颜色必须来自统一语义映射，不允许页面临时决定
- 颜色优先表达风险，其次才是视觉区分
