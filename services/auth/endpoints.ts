export const AUTH_ENDPOINTS = {
  LOGIN: "/api/v1/auth/login",
  ME: "/api/v1/auth/me",
  SET_PASSWORD: "/api/v1/auth/set-password",
  SIGN_UP: "/api/v1/auth/sign-up",
  INVITE_VERIFY: (lang: string, token: string) =>
    `/api/v1/auth/invites/${lang}/${token}`,
  INVITE_LOOKUP: (token: string) => `/api/v1/auth/invites/lookup/${token}`,
  FORGOT_PASSWORD: "/api/v1/auth/password/forget",
  RESET_PASSWORD: "/api/v1/auth/password/reset",
  SIGN_OUT: "/api/auth/sign-out",
} as const;
