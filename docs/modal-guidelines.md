# Modal Guidelines

## Scope

These rules apply to admin edit/confirm/detail interactions.

Examples: see [shared-wrapper-examples.md](./shared-wrapper-examples.md).

## Modal types

- Edit modal: use `EditDialogShell` (`Dialog` based) for editable forms.
- Danger confirm modal: use `DangerConfirmDialog` (`AlertDialog` based) for destructive confirmation.
- Read-only detail panel: use `DetailSheetShell` (`Sheet` based) for large read-only detail content.

## Structure

- Header: title + short description only.
- Body: one content surface; avoid nested card stacks inside dialog body.
- Footer: primary action right, cancel/back secondary.

## Size

- Use shared sizes only: `sm`, `md`, `lg`, `xl`.
- Prefer `lg` for edit forms, `sm` for danger confirms, `lg/xl` for detail sheets.

## Action rules

- Destructive actions must have explicit confirm labels and disabled loading state.
- Do not rely on tooltip-only explanations for critical actions.
- Keep retry/recovery actions visible inside modal content when async operations fail.

## Form integration

- Use `FormShell` primitives inside edit modals for consistent label/help/error/action layout.
- Advanced options should be inside collapsed `FormSection advanced`.
