'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  LuLock,
  LuEye,
  LuEyeOff,
  LuCircleCheck,
  LuCircleAlert,
  LuLoader,
  LuArrowLeft,
  LuCheck,
} from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { resetPassword, requestPasswordReset } from '@/lib/api';

interface ResetPasswordFormProps {
  locale: string;
  initialToken?: string;
}

export function ResetPasswordForm({ locale, initialToken }: ResetPasswordFormProps): React.ReactElement {
  const t = useTranslations('resetPassword');
  const searchParams = useSearchParams();
  const emailQuery = searchParams?.get('email') || '';

  const [status, setStatus] = useState<'form' | 'success'>('form');
  const [email, setEmail] = useState<string>(emailQuery);
  const [code, setCode] = useState('');
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Cooldown countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const isCodeComplete = /^\d{6}$/.test(code);
  const isMinLength = password.length >= 8;
  const isMatching = password.length > 0 && password === confirmPassword;

  function onCodeChange(next: string): void {
    const cleaned = next.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    requestAnimationFrame(() => {
      const nextIndex = Math.min(cleaned.length, 5);
      codeRefs.current[nextIndex]?.focus();
    });
  }

  function onCodeBoxChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const chars = code.padEnd(6, '').split('');
    chars[index] = digit;
    const next = chars.join('').replace(/ /g, '').slice(0, 6);
    setCode(next);
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
      codeRefs.current[index + 1]?.select();
    }
  }

  function onCodeBoxKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
      event.preventDefault();
      codeRefs.current[index - 1]?.focus();
    }
  }

  async function handleResendCode(): Promise<void> {
    if (resendCooldown > 0 || !email.trim()) return;
    setError(null);
    try {
      await requestPasswordReset({ email: email.trim() });
      setResendCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message || t('errorGeneric'));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    const emailToUse = email.trim();
    if (!emailToUse || !emailToUse.includes('@')) {
      setError('Please provide a valid staff email address.');
      return;
    }

    if (!code) {
      setError(t('errorCodeRequired'));
      return;
    }

    if (!isCodeComplete) {
      setError(t('errorCodeInvalid'));
      return;
    }

    if (!isMinLength) {
      setError(t('errorLength'));
      return;
    }

    if (!isMatching) {
      setError(t('errorMismatch'));
      return;
    }

    startTransition(async () => {
      try {
        await resetPassword({ email: emailToUse, code, password });
        setStatus('success');
      } catch (err: any) {
        setError(err?.message || t('errorGeneric'));
      }
    });
  }

  // --------------------------------------------------------------------------
  // SUCCESS (PASSWORD RESET COMPLETE)
  // --------------------------------------------------------------------------
  if (status === 'success') {
    return (
      <Card className="w-full rounded-3xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xl overflow-hidden backdrop-blur-sm text-center">
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-ok)] to-[var(--color-ok-700)]" />
        <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok)]/20 shadow-xs animate-in zoom-in-75 duration-300">
            <LuCircleCheck className="text-3xl" />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('successTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {t('successBody')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3 px-6 sm:px-8 pb-8 pt-4">
          <Link href={`/${locale}/login`} className="w-full">
            <Button
              type="button"
              className="w-full h-12 rounded-full font-semibold text-sm bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all"
            >
              {t('signInButton')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 4: VERIFIED! RESET PASSWORD SCREEN OPENS
  // --------------------------------------------------------------------------
  return (
    <Card
      className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 backdrop-blur-sm"
      style={{
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
      }}
    >
      {/* Decorative top accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] shrink-0" />

      <CardHeader className="text-center pt-6 pb-2 px-4 sm:px-8 sm:mt-12 shrink-0">

        <CardTitle
          className="font-[family-name:var(--font-display)] text-xl sm:text-[26px] tracking-tight text-[var(--color-ink)] leading-tight"
          style={{ fontWeight: 500 }}
        >
          {t('title')}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[var(--color-ink-2)] mt-1.5 max-w-sm mx-auto leading-relaxed">
          {t('subtitle')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col justify-between">
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

          {/* Email notice or input */}
          {emailQuery ? (
            <div className="rounded-xl border border-[var(--color-brand)]/20 bg-[var(--color-brand-tint)]/40 p-3 text-xs text-[var(--color-brand-700)] flex items-center justify-between gap-2">
              <span className="leading-relaxed">
                We sent a 6-digit code to <strong className="font-semibold">{email}</strong>. Fill it below to reset your password.
              </span>
              <Link
                href={`/${locale}/forgot-password`}
                className="font-semibold underline shrink-0 text-[var(--color-brand-700)] hover:text-[var(--color-brand-800)] text-[11px]"
              >
                Change
              </Link>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[var(--color-ink)]">
                Staff Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. employee@alimentariamexicana.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm focus:border-[var(--color-brand-600)] transition-all px-4"
              />
            </div>
          )}

          {/* 6-digit code */}
          <div className="grid gap-1.5">
            <Label className="text-sm font-medium text-[var(--color-ink)]">
              {t('codeLabel')}
            </Label>
            <div
              role="group"
              aria-label={t('codeLabel')}
              className="grid grid-cols-6 gap-1.5 sm:gap-2"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Input
                  key={i}
                  ref={(el) => {
                    codeRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  pattern="\d{1}"
                  maxLength={1}
                  value={code[i] ?? ''}
                  onChange={(e) => onCodeBoxChange(i, e.target.value)}
                  onKeyDown={(e) => onCodeBoxKeyDown(i, e)}
                  onPaste={i === 0 ? (e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (/\d{6}/.test(pasted)) {
                      e.preventDefault();
                      onCodeChange(pasted);
                    }
                  } : undefined}
                  disabled={isPending}
                  aria-label={t('codeLabel')}
                  className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-center text-xl sm:text-2xl font-semibold tabular-nums focus:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-600)]/30 transition-all p-0"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-ink-3)] mt-0.5">
              <span>{t('codeHelper')}</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || isPending || !email.trim()}
                className={`font-semibold transition-colors ${
                  resendCooldown > 0 || !email.trim()
                    ? 'text-[var(--color-ink-3)] cursor-not-allowed'
                    : 'text-[var(--color-brand-600)] hover:underline cursor-pointer'
                }`}
              >
                {resendSuccess
                  ? 'Code sent!'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend code'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="grid gap-1.5">
            <Label htmlFor="new-password" className="text-sm font-medium text-[var(--color-ink)]">
              {t('newPasswordLabel')}
            </Label>
            <div className="relative w-full flex items-center">
              <Input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('newPasswordPlaceholder')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
                style={{ paddingLeft: '16px', paddingRight: '48px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors focus:outline-none cursor-pointer"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  zIndex: 10,
                }}
              >
                {showPassword ? <LuEyeOff style={{ width: '20px', height: '20px' }} /> : <LuEye style={{ width: '20px', height: '20px' }} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="grid gap-1.5">
            <Label
              htmlFor="confirm-password"
              className="text-sm font-medium text-[var(--color-ink)]"
            >
              {t('confirmPasswordLabel')}
            </Label>
            <div className="relative w-full flex items-center">
              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('confirmPasswordPlaceholder')}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                className="h-12 w-full rounded-xl sm:rounded-2xl border-[var(--color-line-2)] bg-[var(--color-field)] text-sm sm:text-base focus:border-[var(--color-brand-600)] transition-all"
                style={{ paddingLeft: '16px', paddingRight: '48px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
                className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] transition-colors focus:outline-none cursor-pointer"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  zIndex: 10,
                }}
              >
                {showConfirm ? <LuEyeOff style={{ width: '20px', height: '20px' }} /> : <LuEye style={{ width: '20px', height: '20px' }} />}
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

          {/* Real-time Password checklist with generous padding */}
          <div
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] flex flex-col gap-2"
            style={{ padding: '14px 16px' }}
          >
            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isCodeComplete ? 'text-[var(--color-ok)] font-medium' : 'text-[var(--color-ink-3)]'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isCodeComplete
                    ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold'
                    : 'bg-[var(--color-line-2)] text-[var(--color-ink-3)]'
                }`}
              >
                {isCodeComplete ? <LuCheck /> : '•'}
              </div>
              <span className="pl-1 text-xs sm:text-sm">{t('codeRule')}</span>
            </div>

            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isMinLength ? 'text-[var(--color-ok)] font-medium' : 'text-[var(--color-ink-3)]'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMinLength
                    ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold'
                    : 'bg-[var(--color-line-2)] text-[var(--color-ink-3)]'
                }`}
              >
                {isMinLength ? <LuCheck /> : '•'}
              </div>
              <span className="ml-1 text-xs sm:text-sm">{t('ruleLength')}</span>
            </div>

            <div
              className={`flex items-center gap-2.5 transition-colors ${
                isMatching ? 'text-[var(--color-ok)] font-medium' : 'text-[var(--color-ink-3)]'
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMatching
                    ? 'bg-[var(--color-ok-tint)] text-[var(--color-ok)] font-bold'
                    : 'bg-[var(--color-line-2)] text-[var(--color-ink-3)]'
                }`}
              >
                {isMatching ? <LuCheck /> : '•'}
              </div>
              <span className="pl-2 text-xs sm:text-sm">{t('ruleMatch')}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-5 sm:px-8 pb-6 sm:pb-8 pt-2 shrink-0">
          <Button
            type="submit"
            className="w-full h-12 rounded-full font-semibold text-base bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-md shadow-[var(--color-brand-600)]/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            disabled={isPending || !isCodeComplete || !isMinLength || !isMatching}
          >
            {isPending ? (
              <>
                <LuLoader className="animate-spin text-base" />
                <span>{t('submitting')}</span>
              </>
            ) : (
              <span>{t('submit')}</span>
            )}
          </Button>

          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors py-1 cursor-pointer"
          >
            <LuArrowLeft className="text-sm" />
            <span>{t('backToLogin')}</span>
          </Link>

          <p className="text-[11px] text-center text-[var(--color-ink-3)]/80 pt-1">
            &copy; {new Date().getFullYear()} Alimentaria Mexicana &bull; Culinary Learning &amp; SOPs
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
