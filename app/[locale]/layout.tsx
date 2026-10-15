import type { ReactNode } from 'react';
import * as React from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { QueryProvider } from '@/components/providers/query-provider';
import '../globals.css';
import { THEME_COOKIE, isTheme } from '@/lib/theme';
import { Toaster } from '@/components/ui/toast';

// The root reads a cookie (the theme), so it renders per request. next-intl's
// setRequestLocale below is what would otherwise let this segment be static, and
// in a statically rendered segment cookies() hands back an empty store — which
// is why the theme arrived as undefined until this was set.
export const dynamic = 'force-dynamic';

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'app' });
  return {
    title: t('title'),
    icons: {
      icon: '/brand-mark.png',
      apple: '/brand-mark.png',
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  // The theme comes from a cookie so the server can render it. With no cookie
  // the attribute is left off and the stylesheet follows the operating system.
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(stored) ? stored : undefined;

  return (
    <html lang={locale} data-theme={theme}>
      <head>
        {/* Two faces on a real contrast axis: DM Sans is display only (28px and up),
            Inter is everything else. Authoritative reference: /DESIGN.md §2.2. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,600;9..40,700&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
