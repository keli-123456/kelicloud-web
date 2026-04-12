# Shared Wrappers Examples

## FormShell + EditDialogShell

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormActions, FormField, FormShell } from "@/components/ui/form-shell";
import { EditDialogShell } from "@/components/ui/modal-shell";

<EditDialogShell
  open={open}
  onOpenChange={setOpen}
  title="Edit node"
  description="Update the node metadata"
>
  <FormShell>
    <FormField label="Name" htmlFor="node-name" required>
      <Input id="node-name" value={name} onChange={(e) => setName(e.target.value)} />
    </FormField>
    <FormActions>
      <Button variant="outline" type="button" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button type="submit">Save</Button>
    </FormActions>
  </FormShell>
</EditDialogShell>
```

## DataTableShell + AsyncState

```tsx
import { DataTableShell } from "@/components/admin/DataTableShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

<DataTableShell
  search={<Input placeholder="Search servers" value={keyword} onChange={(e) => setKeyword(e.target.value)} />}
  actions={<Button onClick={reload}>Refresh</Button>}
  loading={loading}
  error={error}
  onRetry={reload}
  empty={rows.length === 0}
  emptyTitle="No servers"
>
  <ServerTable rows={rows} />
</DataTableShell>
```

## DangerConfirmDialog

```tsx
import { DangerConfirmDialog } from "@/components/ui/modal-shell";

<DangerConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete server"
  description="This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  confirmDisabled={submitting}
  onConfirm={handleDelete}
/>
```
