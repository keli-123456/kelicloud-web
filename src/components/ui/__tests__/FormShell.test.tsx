import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Input } from "@/components/ui/input";
import {
  FormActions,
  FormField,
  FormSection,
  FormShell,
} from "@/components/ui/form-shell";

describe("FormShell", () => {
  it("renders labeled fields, advanced section toggle, and action group", async () => {
    render(
      <FormShell>
        <FormSection title="Basic">
          <FormField label="Name" htmlFor="name" required>
            <Input id="name" />
          </FormField>
        </FormSection>

        <FormSection advanced title="Advanced options">
          <div>advanced body</div>
        </FormSection>

        <FormActions>
          <button type="button">Cancel</button>
          <button type="submit">Save</button>
        </FormActions>
      </FormShell>,
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.queryByText("advanced body")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Advanced options" }),
    );

    expect(screen.getByText("advanced body")).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
