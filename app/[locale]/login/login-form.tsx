"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LuEye, LuEyeOff, LuCircleAlert, LuLoader } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login, ApiException } from "@/lib/api";

interface LoginFormProps {
  locale: string;
}

export function LoginForm({ locale }: LoginFormProps): React.ReactElement {
  const t = useTranslations("login");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogin(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("errorInvalid"));
      return;
    }

    startTransition(async () => {
      try {
        const res = await login({ email: trimmedEmail, password });
        if (
          res.employee?.role === "admin" ||
          res.employee?.role === "super_admin"
        ) {
          router.replace(`/${locale}/admin`);
        } else {
          router.replace(`/${locale}/employee/home`);
        }
        router.refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.code === "ACCOUNT_LOCKED") setError(t("errorLocked"));
          else if (err.code === "INVALID_CREDENTIALS")
            setError(t("errorInvalid"));
          // Never render raw server text for 5xx — it can carry driver
          // internals (SQL, params). Show the generic message instead.
          else if (err.status >= 500 || err.status === 0)
            setError(t("errorGeneric"));
          else setError(err.message);
        } else {
          setError(t("errorGeneric"));
        }
      }
    });
  }

  return (
    <Card
      className="flex-1 w-full bg-[var(--color-surface)] shadow-2xl flex flex-col border-t border-x sm:border border-[var(--color-line-2)] rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20"
      style={{
        borderTopLeftRadius: "32px",
        borderTopRightRadius: "32px",
      }}
    >
      {/* Decorative top accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] shrink-0" />

      <form onSubmit={handleLogin} noValidate className="flex-1 flex flex-col">
        <CardHeader className="text-center pt-6 pb-2 px-4 sm:px-8 sm:mt-12">
          <CardTitle
            className="font-[family-name:var(--font-display)] text-xl sm:text-[26px] tracking-tight text-[var(--color-ink)] leading-tight"
            style={{ fontWeight: 500 }}
          >
            {t("heading")}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-4 sm:px-8 pt-2 pb-4">
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-[var(--color-bad-tint)]/70 border border-[var(--color-bad)]/30 px-3 py-2 text-xs font-medium text-[var(--color-bad-hover)] animate-in fade-in duration-150"
            >
              <LuCircleAlert className="shrink-0 text-sm text-[var(--color-bad)]" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Email field */}
          <div className="grid gap-1.5">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-[var(--color-ink)]"
            >
              {t("emailLabel")}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
              style={{ paddingLeft: "16px", paddingRight: "16px" }}
            />
          </div>

          {/* Password field */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-[var(--color-ink)]"
              >
                {t("passwordLabel")}
              </Label>
              <Link
                href={`/${locale}/forgot-password`}
                className="text-sm font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline focus-visible:outline-none transition-colors"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            <div className="relative w-full flex items-center">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={t("passwordPlaceholder")}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
                style={{ paddingLeft: "16px", paddingRight: "48px" }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors focus:outline-none cursor-pointer"
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  zIndex: 10,
                }}
              >
                {showPassword ? (
                  <LuEyeOff style={{ width: "20px", height: "20px" }} />
                ) : (
                  <LuEye style={{ width: "20px", height: "20px" }} />
                )}
              </button>
            </div>
          </div>

          {/* Hide native browser password reveal icon in Edge/IE */}
          <style>{`
              input[type="password"]::-ms-reveal,
              input[type="password"]::-ms-clear {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
            `}</style>

          {/* Remember me checkbox */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-[var(--color-line-3)] accent-[var(--color-brand-600)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-600)] cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-sm text-[var(--color-ink-2)] select-none cursor-pointer"
            >
              {t("rememberMe")}
            </label>
          </div>

          {/* Submit Button - Positioned ergonomically below Remember me */}
          <div className="pt-2 sm:pt-3">
            <Button
              type="submit"
              className="w-full h-12 rounded-full font-semibold text-base bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <LuLoader className="animate-spin text-base" />
                  <span>{t("submitting")}</span>
                </>
              ) : (
                <span>{t("submit")}</span>
              )}
            </Button>
          </div>

          {/* Assistance note */}
          <p className="text-xs text-center text-[var(--color-ink-3)] leading-relaxed max-w-xs mx-auto pt-1">
            {t("helpNotice")}
          </p>
        </CardContent>

        {/* Footer with copyright at bottom of card */}
        <CardFooter className="mt-auto px-6 sm:px-8 pb-5 pt-3 text-center shrink-0">
          <p className="text-[11px] text-center text-[var(--color-ink-3)]/80 mx-auto">
            &copy; {new Date().getFullYear()} Alimentaria Mexicana &bull;
            Culinary Learning &amp; SOPs
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
