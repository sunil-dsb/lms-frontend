import type { Employee } from "@/lib/types";

export interface LoginCredentials {
  email: string;
  password?: string;
  code?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface AuthMeResponse {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  employee?: Employee;
  role?: string;
}

export interface SetPasswordInput {
  token?: string;
  password: string;
  email?: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}
