import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReplyBox } from "@/components/support/ReplyBox";
import { createWrapper } from "@/test/test-utils";

const setup = (props: Partial<React.ComponentProps<typeof ReplyBox>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const Wrapper = createWrapper();
  render(
    <Wrapper>
      <ReplyBox onSubmit={onSubmit} isPending={false} {...props} />
    </Wrapper>,
  );
  return { onSubmit };
};

describe("ReplyBox", () => {
  it("submits the typed body with an empty attachment list", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByRole("textbox"), "Any update on this?");
    await user.click(screen.getByRole("button", { name: /support:detail\.send/ }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        body: "Any update on this?",
        attachment_file_ids: [],
      });
    });
  });

  it("blocks submission of an empty message", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.click(screen.getByRole("button", { name: /support:detail\.send/ }));

    await waitFor(() => {
      expect(document.querySelector(".ant-form-item-explain-error")).not.toBeNull();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the input while a reply is pending", () => {
    setup({ isPending: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
