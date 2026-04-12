import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AsyncState } from "@/components/ui/async-state";

describe("AsyncState", () => {
  it("renders loading, empty, and error states", () => {
    const retry = vi.fn();

    const { rerender } = render(
      <AsyncState loading loadingLabel="loading message">
        <div>content</div>
      </AsyncState>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("loading message")).toBeInTheDocument();

    rerender(
      <AsyncState
        empty
        emptyTitle="No rows"
        emptyDescription="Please adjust filters"
      >
        <div>content</div>
      </AsyncState>,
    );
    expect(screen.getByText("No rows")).toBeInTheDocument();
    expect(screen.getByText("Please adjust filters")).toBeInTheDocument();

    rerender(
      <AsyncState error="request failed" onRetry={retry} retryLabel="retry now">
        <div>content</div>
      </AsyncState>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "retry now" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
