import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { QueryProvider } from "../QueryProvider";

// Test component to verify query client is working
const TestComponent = () => {
  const { data } = useQuery({
    queryKey: ["test"],
    queryFn: () => "test-data",
  });
  return <div>{data}</div>;
};

describe("QueryProvider", () => {
  it("should provide query client to children", async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>,
    );

    expect(await screen.findByText("test-data")).toBeInTheDocument();
  });
});
