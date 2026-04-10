# AGENTS.md

## Frontend working rules
- 优先最小改动，避免无关重构。
- 不修改后端 API 协议。
- 不引入新的大型第三方 UI 依赖。
- 新增文案必须走现有 i18n 方案。
- 修改前先定位页面、相关组件、状态管理和样式来源。
- 修改后必须运行项目已有的 lint、typecheck、build、test。
- 危险操作必须有确认与禁用态。
- 批量操作必须明确作用范围。
- 能复用现有 design token 和组件时，不要重新发明一套样式体系。
# UI Rules

## Scope
These rules apply to all frontend work in `komari-web`.

## Component Source
- Treat the local `shadcn`-style component system as the default UI layer.
- Prefer components from `src/components/ui/*` before creating anything new.
- When a component is missing, use the `shadcn` MCP server or registry workflow against `components.json` to search and install it first.
- Do not paste random third-party UI snippets into feature pages.

## Allowed Patterns
- New pages and new features should import from `src/components/ui/*`.
- If raw `@radix-ui/*` is needed, wrap it in `src/components/ui/*` before using it broadly.
- Use `cn` from `src/lib/utils.ts` for class composition.
- Use Tailwind tokens and CSS variables already defined by the project.

## Legacy Boundary
- `src/components/ui/compat.tsx` is a legacy bridge.
- Do not expand `compat.tsx` for new UI unless the task is explicitly migrating an old page incrementally.
- New UI work should prefer the dedicated component files such as `ui/button.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, `ui/dropdown-menu.tsx`, `ui/badge.tsx`.

## Visual Consistency
- Keep desktop and mobile navigation patterns consistent across admin pages.
- Prefer layout-level reuse over page-specific navigation hacks.
- Avoid ad-hoc inline colors when an existing token or utility class can express the same state.
- Keep status presentation compact: short badge text in the list, long vendor detail in tooltip, dialog, or details panel.

## Review Standard
- New UI should look like it belongs to the existing admin console.
- If a change introduces a new reusable pattern, extract it into `src/components/ui/*` or a focused admin component instead of duplicating markup.
- Before merging frontend UI changes, run `tsc --noEmit` and a production `vite build`.
