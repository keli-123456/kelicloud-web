# List Page Standards

Examples: see [shared-wrapper-examples.md](./shared-wrapper-examples.md).

## DataTableShell

`DataTableShell` is the default skeleton for admin list pages.

### Required layout
- Left area: `search` + common `filters`.
- Right area: primary `actions` + `batchActions`.
- Advanced filters must go into `advancedFilters` and stay collapsed by default.

### Required states
- Use built-in `loading`, `error`, `empty`, `onRetry`.
- Do not rely on `toast` as the only error feedback.
- Keep pagination in the `pagination` slot so state transitions are consistent.

### Recommended pattern
1. Build filtered dataset from source data (`search` + filter conditions).
2. Slice filtered dataset for pagination.
3. Render table inside `DataTableShell` children.
4. Put bulk destructive operations in `batchActions` with confirm + disabled loading state.

## AsyncState

`AsyncState` is the default async-state presenter for list sub-panels and async widgets.

### Required usage
- Any async region must render stable `loading`, `error`, and `empty` UI.
- `error` should provide a visible retry action via `onRetry` where possible.
- Keep important guidance in the panel itself; tooltip-only explanations are not sufficient.

### Typical scenarios
- Selector panels (node/session/user selectors).
- Embedded async cards and side panels.
- Read-only detail loaders.

## Legacy boundary

- Do not import `@/components/admin/admin-ui` or `@/components/admin/cloud/cloud-ui` in new code.
- If migration is incomplete, keep changes inside the existing whitelist and migrate to `ui/*` incrementally.
