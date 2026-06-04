# UI Regression Checklist

每次调整管理端视觉、表格、弹窗或权限入口后，按这份清单回归。目标不是展示所有细节，而是保证页面清楚、紧凑、不会暴露普通用户不该看到的后台流程。

## Viewports

- Desktop: 1280 x 900
- Mobile: 390 x 844

## Routes

- `/admin/client`
- `/admin/cloud?provider=digitalocean`
- `/admin/cloud?provider=linode`
- `/admin/cloud?provider=vultr`
- `/admin/cloud?provider=azure`
- `/admin/cloud?provider=aws`
- `/admin/failover`
- `/admin/failover-v2`
- `/admin/exec`
- `/admin/account`
- `/admin/billing`
- `/admin/notification/general`
- `/admin/proxy`

## Visual Rules

- Page body must not create horizontal overflow. Wide tables may scroll inside their own table container only.
- Action columns must never overlap status text, countdown text, IP addresses, or badges.
- Table columns should adapt to content: compact actions, readable primary information, no large empty columns.
- Dialogs must keep a clear surface against the page background and stay within the viewport on desktop and mobile.
- Dialog footers stay pinned to the dialog bottom, with primary action on the right on desktop and full-width safe spacing on mobile.
- Nested cards inside dialogs should be avoided unless they are repeated list items or a true framed tool.
- Form labels, help text, and inputs should keep one visual rhythm: label, optional hint, control.
- Script/code editors must use compact line numbers and must not push the editor horizontally.
- Cloud token import dialogs should keep group selection, group chips, token textarea, and actions in one clean flow.
- Normal users should not see server management, agent installation, agent connection logic, or infrastructure diagnosis details.
- Normal users may see account, billing/shop, proxy policy summary, permitted cloud pages, permitted DNS/failover pages, and script library mode only.
- Public share pages should show task state and result, not internal implementation steps or cleanup/probe logic.
- User-facing Chinese locale should not expose raw English labels, backend error jargon, or untranslated provider field names where a Chinese label exists.

## Commands

```powershell
npm run i18n:audit
npm run build
```

## Browser Checks

- Open each route at both viewports and inspect `document.documentElement.scrollWidth <= clientWidth`.
- Inspect all visible `[role="dialog"]` surfaces after opening the main create/import/edit dialog on cloud, failover, script, account, billing, and server pages.
- Verify table scroll containers use internal scrolling and the overall admin shell remains fixed.
- Verify a non-admin account is redirected away from `/admin`, `/admin/client`, `/admin/settings`, and `/admin/notification/general` unless the matching feature is enabled.
