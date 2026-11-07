import type { User } from "@/stores/auth.store";

export interface LoginPayload {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  lang?: string;
}

export interface AuthResponse {
  token_type: string;
  user: NonNullable<User>;
  message: string;
}

export interface VerifyEmailPayload {
  token: string;
  lang?: string;
}

export interface ForgotPasswordPayload {
  email: string;
  lang?: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
  lang?: string;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}
