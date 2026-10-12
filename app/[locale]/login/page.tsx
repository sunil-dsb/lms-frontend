import * as React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from './login-form';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  // The admin layout bounces here (?reason=session) when the auth check
  // fails for any reason — expired session, backend blip. A short notice
  // explains the bounce so it never reads as a random logout.
  const sp = await searchParams;
  const sessionNotice = sp.reason === 'session';

  const t = await getTranslations('login');

  return (
    <AuthShell locale={locale}>
      {sessionNotice ? (
        <p
          role="status"
          className="mb-4 w-full rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-4 py-3 text-sm font-medium text-[var(--color-ink-2)]"
        >
          {t('sessionExpiredNotice')}
        </p>
      ) : null}
      <LoginForm locale={locale} />
    </AuthShell>
  );
}
