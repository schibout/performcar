import type { Rule } from "antd/es/form";
import type { z } from "zod";

// Adapts a zod schema into an antd Form.Item rule. Uses synchronous safeParse
// since our auth/admin schemas have no async refinements; this avoids a
// microtask per keystroke and keeps validation responsive.
export function zodFieldRule(schema: z.ZodType): Rule {
  return {
    validator: (_rule, value) => {
      let result = schema.safeParse(value);
      // An untouched antd field hands the validator `undefined`. For a
      // string-typed schema that surfaces Zod's default "expected string,
      // received undefined" instead of the schema's own (i18n) min/required
      // message. When the value is nullish and the only failure is that string
      // type error, re-parse as "" so the schema's string checks produce the
      // intended message. Works for both plain strings and piped strings
      // (e.g. email) and leaves non-string schemas untouched.
      if (!result.success && (value === undefined || value === null)) {
        const first = result.error.issues[0];
        if (first?.code === "invalid_type" && first.expected === "string") {
          result = schema.safeParse("");
        }
      }
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? "Invalid";
        return Promise.reject(new Error(message));
      }
      return Promise.resolve();
    },
  };
}
