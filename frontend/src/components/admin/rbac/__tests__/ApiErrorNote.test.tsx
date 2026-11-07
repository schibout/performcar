import { render, screen } from "@testing-library/react";
import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";

import { ApiErrorNote } from "@/components/admin/rbac/ApiErrorNote";

const refusal = (data: unknown, status: number) =>
  new AxiosError("failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe("ApiErrorNote", () => {
  it("renders the message key the API sent", () => {
    render(<ApiErrorNote error={refusal({ detail: "error.rbac.role_in_use" }, 409)} />);
    expect(screen.getByTestId("rbac-api-error")).toHaveTextContent("errors:error.rbac.role_in_use");
  });

  it("falls back to a generic line when detail is a validation list", () => {
    render(
      <ApiErrorNote error={refusal({ detail: [{ loc: ["body", "key"], msg: "bad" }] }, 422)} />,
    );
    expect(screen.getByTestId("rbac-api-error")).toHaveTextContent("admin:rbac.genericError");
  });

  it("renders nothing without an error", () => {
    render(<ApiErrorNote error={null} />);
    expect(screen.queryByTestId("rbac-api-error")).not.toBeInTheDocument();
  });
});
