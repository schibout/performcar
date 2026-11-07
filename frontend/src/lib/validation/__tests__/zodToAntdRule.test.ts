import { describe, expect, it } from "vitest";
import { z } from "zod";

import { zodFieldRule } from "@/lib/validation/zodToAntdRule";

import type { RuleObject } from "antd/es/form";

// zodFieldRule returns an antd RuleObject whose `validator` carries the logic.
// Invoke it directly (rule arg is unused by our validator) and normalise the
// loosely-typed return into a Promise the assertions below can await.
const validate = (schema: z.ZodType, value: unknown): Promise<unknown> => {
  const { validator } = zodFieldRule(schema) as RuleObject;
  if (typeof validator !== "function") throw new Error("expected a validator rule");
  return Promise.resolve(validator({}, value, () => undefined));
};

describe("zodFieldRule", () => {
  it("surfaces the schema's own message for an undefined required string", async () => {
    await expect(validate(z.string().min(1, { message: "required" }), undefined)).rejects.toThrow(
      "required",
    );
  });

  it("does not leak Zod's default 'expected string, received undefined'", async () => {
    await expect(
      validate(z.string().min(1, { message: "required" }), undefined),
    ).rejects.not.toThrow(/expected string/i);
  });

  it("surfaces the min message for an empty string", async () => {
    await expect(validate(z.string().min(5, { message: "too short" }), "")).rejects.toThrow(
      "too short",
    );
  });

  it("handles piped string schemas (e.g. email) for undefined", async () => {
    const schema = z
      .string()
      .min(1, { message: "email required" })
      .pipe(z.email({ message: "email invalid" }));
    await expect(validate(schema, undefined)).rejects.toThrow("email required");
  });

  it("resolves for a valid value", async () => {
    await expect(
      validate(z.string().min(1, { message: "required" }), "ok"),
    ).resolves.toBeUndefined();
  });

  it("leaves non-string schemas untouched (keeps their own type error)", async () => {
    await expect(validate(z.number(), undefined)).rejects.toBeInstanceOf(Error);
  });
});
