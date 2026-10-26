"use client";

import * as React from "react";
import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LuEye,
  LuEyeOff,
  LuCircleAlert,
  LuLoader,
  LuArrowLeft,
  LuCheck,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { activate, ApiException } from "@/lib/api";

interface SetPasswordFormProps {
  locale: string;
  token?: string;
  employeeName?: string;
  employeeEmail?: string;
}

export function SetPasswordForm({
  locale,
  token: propToken,
  employeeName,
  employeeEmail,
}: SetPasswordFormProps): React.ReactElement {
  const t = useTranslations("activate");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = propToken || searchParams.get("token") || undefined;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Clear lingering admin token from localStorage to prevent cross-session pollution
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }, []);

  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isMatching = password.length > 0 && password === confirm;
  const isValidPassword = isMinLength && hasUppercase && hasSpecial;

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    if (!isMinLength) {
      setError(t("errorPassword"));
      return;
    }
    if (!hasUppercase) {
      setError(
        locale === "es"
          ? "La contraseña debe tener al menos una letra mayúscula."
          : "Password must contain at least one uppercase letter.",
      );
      return;
    }
    if (!hasSpecial) {
      setError(
        locale === "es"
          ? "La contraseña debe tener al menos un carácter especial."
          : "Password must contain at least one special character.",
      );
      return;
    }
    if (!isMatching) {
      setError(t("errorMismatch"));
      return;
    }

    startTransition(async () => {
      try {
        const res = await activate({ token, password, email: employeeEmail });
        const role = res.employee?.role;
        const defaultDest =
          role === "admin" || role === "super_admin"
            ? `/${locale}/admin`
            : `/${locale}/employee/home`;
        const destination = res.redirectTo || defaultDest;
        router.replace(destination);
        router.refresh();
      } catch (err: unknown) {
        if (err instanceof ApiException) {
          if (
            err.status === 401 ||
            err.code === "UNAUTHENTICATED" ||
            err.code === "INVITE_EXPIRED"
          ) {
            setError(t("errorExpired"));
          } else if (err.code === "ACCOUNT_LOCKED") {
            setError(t("errorLocked"));
          } else {
            setError(err.message || t("errorGeneric"));
          }
        } else {
          setError(t("errorGeneric"));
        }
      }
    });
  }

  return (
    <Card
      className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 backdrop-blur-sm"
      style={{
        borderTopLeftRadius: "32px",
        borderTopRightRadius: "32px",
      }}
    >
      {/* Decorative top accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] shrink-0" />

      <CardHeader className="text-center pt-6 pb-2 px-4 sm:px-8 sm:mt-12 shrink-0">
        <CardTitle
          className="font-[family-name:var(--font-display)] text-xl sm:text-[26px] tracking-tight text-[var(--color-ink)] leading-tight"
          style={{ fontWeight: 500 }}
        >
          {t("title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] mt-1.5 max-w-sm mx-auto leading-relaxed">
          {employeeName
            ? t("intro", { name: employeeName })
            : locale === "es"
              ? "Establece tu contraseña para completar la configuración de tu cuenta."
              : "Set your password to finish setting up your account."}
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={onSubmit}
        noValidate
        className="flex-1 flex flex-col justify-between"
      >
        <CardContent className="flex flex-col gap-4 px-5 sm:px-8 pt-2 pb-4">
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-[var(--color-bad-tint)]/70 border border-[var(--color-bad)]/30 px-3 py-2 text-xs font-medium text-[var(--color-bad-hover)] animate-in fade-in duration-150"
            >
              <LuCircleAlert className="shrink-0 text-sm text-[var(--color-bad)]" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Choose Password */}
          <div className="grid gap-1.5">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-[var(--color-ink)]"
            >
              {t("passwordLabel")}
            </Label>
            <div className="relative w-full flex items-center">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
                onClick={() => setShowPassword(!showPassword)}
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

          {/* Confirm Password */}
          <div className="grid gap-1.5">
            <Label
              htmlFor="confirm"
              className="text-sm font-medium text-[var(--color-ink)]"
            >
              {t("confirmLabel")}
            </Label>
            <div className="relative w-full flex items-center">
              <Input
                id="confirm"
                name="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("confirmPlaceholder")}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
                style={{ paddingLeft: "16px", paddingRight: "48px" }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
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
                {showConfirm ? (
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

          {/* Real-time Password checklist */}
          <div
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] flex flex-col gap-2"
            style={{ padding: "14px 16px" }}
          >
            {/* Rule: Min 8 chars */}
            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isMinLength
                  ? "text-[var(--color-ok)] font-medium"
                  : "text-[var(--color-ink-3)]"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMinLength
                    ? "bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold"
                    : "bg-[var(--color-line-2)] text-[var(--color-ink-3)]"
                }`}
              >
                {isMinLength ? <LuCheck /> : "•"}
              </div>
              <span className="pl-1 text-xs sm:text-sm">{t("ruleLength")}</span>
            </div>

            {/* Rule: Uppercase letter */}
            <div
              className={`flex items-center gap-2.5 transition-colors ${
                hasUppercase
                  ? "text-[var(--color-ok)] font-medium"
                  : "text-[var(--color-ink-3)]"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  hasUppercase
                    ? "bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold"
                    : "bg-[var(--color-line-2)] text-[var(--color-ink-3)]"
                }`}
              >
                {hasUppercase ? <LuCheck /> : "•"}
              </div>
              <span className="pl-1 text-xs sm:text-sm">
                {locale === "es"
                  ? "Al menos 1 letra mayúscula (A-Z)"
                  : "At least 1 uppercase letter (A-Z)"}
              </span>
            </div>

            {/* Rule: Special character */}
            <div
              className={`flex items-center gap-2.5 transition-colors ${
                hasSpecial
                  ? "text-[var(--color-ok)] font-medium"
                  : "text-[var(--color-ink-3)]"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  hasSpecial
                    ? "bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold"
                    : "bg-[var(--color-line-2)] text-[var(--color-ink-3)]"
                }`}
              >
                {hasSpecial ? <LuCheck /> : "•"}
              </div>
              <span className="pl-1 text-xs sm:text-sm">
                {locale === "es"
                  ? "Al menos 1 carácter especial (!@#$%...)"
                  : "At least 1 special character (!@#$%...)"}
              </span>
            </div>

            {/* Rule: Passwords match */}
            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isMatching
                  ? "text-[var(--color-ok)] font-medium"
                  : "text-[var(--color-ink-3)]"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMatching
                    ? "bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold"
                    : "bg-[var(--color-line-2)] text-[var(--color-ink-3)]"
                }`}
              >
                {isMatching ? <LuCheck /> : "•"}
              </div>
              <span className="pl-1 text-xs sm:text-sm">{t("ruleMatch")}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-5 sm:px-8 pb-6 sm:pb-8 pt-2 shrink-0">
          <Button
            type="submit"
            className="w-full h-12 rounded-full font-semibold text-base bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            disabled={isPending || !isValidPassword || !isMatching}
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

          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors py-1 cursor-pointer"
          >
            <LuArrowLeft className="text-sm" />
            <span>{t("backToLogin")}</span>
          </Link>

          <p className="text-[11px] text-center text-[var(--color-ink-3)]/80 pt-1">
            &copy; {new Date().getFullYear()} Alimentaria Mexicana &bull;
            Culinary Learning &amp; SOPs
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
