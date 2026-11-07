import { fireEvent, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AdminPagination } from "@/components/admin/shared/Pagination";
import { renderWithProviders } from "@/test/test-utils";

describe("AdminPagination", () => {
  it("disables 'previous' on the first page and enables 'next' when more data exists", () => {
    renderWithProviders(<AdminPagination total={50} skip={0} limit={10} onChange={vi.fn()} />);

    const prev = screen.getByRole("button", { name: /admin:users\.pagination\.previous/ });
    const next = screen.getByRole("button", { name: /admin:users\.pagination\.next/ });

    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
  });

  it("disables 'next' on the last page", () => {
    renderWithProviders(<AdminPagination total={25} skip={20} limit={10} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /admin:users\.pagination\.next/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /admin:users\.pagination\.previous/ })).toBeEnabled();
  });

  it("advances skip by `limit` when 'next' is clicked", () => {
    const onChange = vi.fn();
    renderWithProviders(<AdminPagination total={50} skip={0} limit={10} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /admin:users\.pagination\.next/ }));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("steps back by `limit` when 'previous' is clicked from a later page", () => {
    const onChange = vi.fn();
    renderWithProviders(<AdminPagination total={50} skip={30} limit={10} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /admin:users\.pagination\.previous/ }));
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("omits the 'rows per page' control when no callback is supplied", () => {
    renderWithProviders(<AdminPagination total={50} skip={0} limit={10} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/admin:users\.pagination\.rowsPerPage/)).not.toBeInTheDocument();
  });

  it("renders the rows-per-page select when a handler is supplied", () => {
    const onPageSizeChange = vi.fn();
    renderWithProviders(
      <AdminPagination
        total={50}
        skip={0}
        limit={10}
        onChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    expect(screen.getByLabelText(/admin:users\.pagination\.rowsPerPage/)).toBeInTheDocument();
  });

  it("renders the showing/page translation keys for a zero-row table", () => {
    renderWithProviders(<AdminPagination total={0} skip={0} limit={10} onChange={vi.fn()} />);
    expect(screen.getByText(/admin:users\.pagination\.showing/)).toBeInTheDocument();
    expect(screen.getByText(/admin:users\.pagination\.pageOf/)).toBeInTheDocument();
  });

  it("jumps to the typed page when Enter is pressed", () => {
    const onChange = vi.fn();
    renderWithProviders(<AdminPagination total={500} skip={0} limit={10} onChange={onChange} />);

    const input = screen.getByLabelText(/admin:users\.pagination\.goToPage/);
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 13 });

    expect(onChange).toHaveBeenCalledWith(110); // (12 - 1) * 10
  });

  it("clamps an out-of-range page to the last page on blur", () => {
    const onChange = vi.fn();
    renderWithProviders(<AdminPagination total={50} skip={0} limit={10} onChange={onChange} />);

    const input = screen.getByLabelText(/admin:users\.pagination\.goToPage/);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(40); // last page (5) → (5 - 1) * 10
  });

  it("does not call onChange when the typed page equals the current page", () => {
    const onChange = vi.fn();
    renderWithProviders(<AdminPagination total={50} skip={20} limit={10} onChange={onChange} />);

    const input = screen.getByLabelText(/admin:users\.pagination\.goToPage/);
    fireEvent.change(input, { target: { value: "3" } }); // already on page 3
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });
});
