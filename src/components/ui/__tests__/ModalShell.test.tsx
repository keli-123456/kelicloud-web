import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "@/components/ui/button";
import { DetailSheetShell, EditDialogShell } from "@/components/ui/modal-shell";

describe("ModalShell", () => {
  it("renders EditDialogShell with dialog semantics", () => {
    render(
      <EditDialogShell
        open
        onOpenChange={() => {}}
        title="Edit node"
        description="Update node settings"
        footer={<Button>Save</Button>}
      >
        <div>edit form body</div>
      </EditDialogShell>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Edit node" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Update node settings")).toBeInTheDocument();
    expect(screen.getByText("edit form body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders DetailSheetShell with title and content", () => {
    render(
      <DetailSheetShell
        open
        onOpenChange={() => {}}
        title="Node detail"
        description="Read-only diagnostics"
        footer={<Button>Close</Button>}
      >
        <div>detail panel body</div>
      </DetailSheetShell>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Node detail" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Read-only diagnostics")).toBeInTheDocument();
    expect(screen.getByText("detail panel body")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /close/i }).length).toBeGreaterThan(0);
  });
});
