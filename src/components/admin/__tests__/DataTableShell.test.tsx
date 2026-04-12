import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTableShell } from "@/components/admin/DataTableShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

describe("DataTableShell", () => {
  it("renders toolbar and table content slots", () => {
    render(
      <DataTableShell
        search={<Input placeholder="search nodes" />}
        filters={<span>filters</span>}
        actions={<Button>refresh</Button>}
        batchActions={<Button>batch delete</Button>}
        advancedFilters={<span>advanced settings</span>}
      >
        <div>table body</div>
      </DataTableShell>,
    );

    expect(screen.getByPlaceholderText("search nodes")).toBeInTheDocument();
    expect(screen.getByText("filters")).toBeInTheDocument();
    expect(screen.getByText("refresh")).toBeInTheDocument();
    expect(screen.getByText("batch delete")).toBeInTheDocument();
    expect(screen.getByText("table body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more filters/i })).toBeInTheDocument();
  });

  it("exposes loading and error retry states with accessible roles", () => {
    const retry = vi.fn();
    const { rerender } = render(
      <DataTableShell loading loadingLabel="loading table data">
        <div>table body</div>
      </DataTableShell>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("loading table data")).toBeInTheDocument();

    rerender(
      <DataTableShell
        error="failed to load"
        onRetry={retry}
        retryLabel="retry table"
      >
        <div>table body</div>
      </DataTableShell>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "retry table" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
