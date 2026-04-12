# Form Guidelines

## Shared primitives

Use `src/components/ui/form-shell.tsx`:

- `FormShell`
- `FormSection`
- `FormField`
- `FormHelpText`
- `FormErrorText`
- `FormActions`

Examples: see [shared-wrapper-examples.md](./shared-wrapper-examples.md).

## Rules

- Labels and help/error texts should come from `FormField` layout, not ad-hoc wrappers.
- Put advanced options in `FormSection advanced` (collapsed by default).
- Keep form action buttons in `FormActions`.
- Inline validation errors should be shown in `FormErrorText`, not toast-only.
