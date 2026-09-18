export function getPortForwardEditorStatus({ dirty, saving, applying, rule }: {
  dirty: boolean;
  saving: boolean;
  applying: boolean;
  rule: { status: string; last_task_id: string } | null;
}) {
  if (saving) return "saving";
  if (applying) return "applying";
  if (dirty) return "unsaved";
  if (!rule) return "new";
  if (rule.status === "pending" && rule.last_task_id) return "submitted";
  return rule.status;
}
