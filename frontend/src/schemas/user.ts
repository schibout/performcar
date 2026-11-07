import { z } from "zod";

import type { TFunction } from "i18next";

export const getProfileSchema = (t: TFunction) =>
  z.object({
    first_name: z.string().min(2, { message: t("validation:nameMin", { count: 2 }) }),
    last_name: z.string().min(2, { message: t("validation:nameMin", { count: 2 }) }),
    title: z.string().optional().nullable(),
  });

export type ProfileFormValues = z.infer<ReturnType<typeof getProfileSchema>>;

export const getChangePasswordSchema = (t: TFunction) =>
  z
    .object({
      current_password: z.string().min(1, { message: t("validation:passwordRequired") }),
      new_password: z
        .string()
        .min(6, { message: t("validation:passwordMin", { count: 6 }) })
        .regex(/[A-Z]/, { message: t("validation:passwordUppercase") })
        .regex(/[a-z]/, { message: t("validation:passwordLowercase") })
        .regex(/[0-9]/, { message: t("validation:passwordNumber") })
        .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: t("validation:passwordSpecial") }),
      confirmPassword: z.string().min(1, { message: t("validation:confirmPasswordRequired") }),
    })
    .refine((data) => data.new_password === data.confirmPassword, {
      message: t("validation:confirmPasswordMismatch"),
      path: ["confirmPassword"],
    });

export type ChangePasswordFormValues = z.infer<ReturnType<typeof getChangePasswordSchema>>;

export const getDeactivateAccountSchema = (t: TFunction) =>
  z.object({
    password: z.string().min(1, { message: t("validation:passwordRequired") }),
    acknowledge: z.boolean().refine((v) => v, {
      message: t("validation:deactivateAcknowledgeRequired"),
    }),
  });

export type DeactivateAccountFormValues = z.infer<ReturnType<typeof getDeactivateAccountSchema>>;
