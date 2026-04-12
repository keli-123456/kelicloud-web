import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DangerConfirmDialog } from "@/components/ui/modal-shell";

describe("DangerConfirmDialog", () => {
  it("executes confirm action from destructive dialog", async () => {
    const confirm = vi.fn();

    render(
      <DangerConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete node"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirm}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
