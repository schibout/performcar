import api from "@/lib/api/api";
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
  ChangePasswordPayload,
} from "@/lib/types/auth";
import type { User } from "@/stores/auth.store";

export const authService = {
  getMe: (): Promise<NonNullable<User>> => {
    return api.get<NonNullable<User>, NonNullable<User>>("/users/me");
  },

  login: (payload: LoginPayload): Promise<AuthResponse> => {
    // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded with username and password
    const formData = new URLSearchParams();
    formData.append("username", payload.email);
    if (payload.password) {
      formData.append("password", payload.password);
    }

    return api.post<AuthResponse, AuthResponse>("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  register: (payload: RegisterPayload): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/register", payload);
  },

  logout: (): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/logout");
  },

  refresh: (): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/refresh");
  },

  verifyEmail: (payload: VerifyEmailPayload): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/verify-email", payload);
  },

  forgotPassword: (payload: ForgotPasswordPayload): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/forgot-password", payload);
  },

  resetPassword: (payload: ResetPasswordPayload): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/reset-password", payload);
  },
  resendVerification: (payload: { email: string; lang?: string }): Promise<MessageResponse> => {
    return api.post<MessageResponse, MessageResponse>("/auth/resend-verification", payload);
  },
  changePassword: (payload: ChangePasswordPayload): Promise<MessageResponse> => {
    return api.patch<MessageResponse, MessageResponse>("/auth/change-password", payload);
  },
};
