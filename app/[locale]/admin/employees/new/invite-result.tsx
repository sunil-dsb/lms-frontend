'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InviteResult } from '@/lib/types';
import { LuPlus, LuMail, LuCheck, LuCopy, LuArrowLeft } from 'react-icons/lu';

interface InviteResultProps {
  locale: string;
  invite: InviteResult;
  employeeName: string;
  onCreateAnother: () => void;
}

export function InviteResultCard({
  locale,
  invite,
  employeeName,
  onCreateAnother,
}: InviteResultProps): React.ReactElement {
  const t = useTranslations('admin');
  const [copied, setCopied] = useState(false);

  const displayUrl = React.useMemo(() => {
    if (!invite?.url) return '';
    try {
      if (typeof window !== 'undefined') {
        const urlObj = new URL(invite.url, window.location.origin);
        const inviteMatch = urlObj.pathname.match(/\/auth\/invites\/([^/]+)\/([^/]+)\/?$/);
        if (inviteMatch) return `${window.location.origin}/${inviteMatch[1]}/invite/${encodeURIComponent(inviteMatch[2])}`;
        if (urlObj.pathname.match(/^\/[^/]+\/invite\/[^/]+\/?$/)) return `${window.location.origin}${urlObj.pathname}${urlObj.search}`;
      }
    } catch {
      // fallback
    }
    return invite.url;
  }, [invite?.url]);

  async function copyUrl(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(displayUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-[580px] w-full py-4">
      <Card className="w-full shadow-e2 border border-[var(--color-line-2)] rounded-[var(--radius-xl)] overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)]" />
      <CardHeader className="text-center pt-8 pb-3 px-6 sm:px-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]">
          <LuMail className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {t('inviteCreatedHeading')}
        </CardTitle>
        <p className="text-base font-medium text-[var(--color-ink-2)] mt-1">
          {employeeName}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
        {/* Email confirmation callout */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-line,var(--color-line))] bg-[var(--color-brand-tint,#fef7f2)] p-4 text-sm text-[var(--color-ink)] space-y-1.5">
          <p className="font-semibold text-[var(--color-brand-800,#9c3b12)] flex items-center gap-2">
            <LuMail className="h-4 w-4 shrink-0 text-[var(--color-brand)]" />
            {t('inviteEmailSent')}
          </p>
          <p className="text-xs text-[var(--color-ink-2)] leading-relaxed">
            {t('inviteEmailDesc')}
          </p>
        </div>

        {/* Direct link fallback */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wider">
            {t('inviteUrlLabel')}
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-2 text-xs font-mono text-[var(--color-ink)] select-all">
              {displayUrl}
            </code>
            <Button
              size="sm"
              variant={copied ? 'secondary' : 'neutral'}
              onClick={() => void copyUrl()}
              icon={copied ? LuCheck : LuCopy}
            >
              {copied ? t('copied') : t('copyUrl')}
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-[var(--color-ink-3,#8a9099)]">
          {t('expiresAt', { time: new Date(invite.expiresAt).toLocaleString() })}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCreateAnother}
            icon={LuPlus}
          >
            {t('createAnother')}
          </Button>
          <Link href={`/${locale}/admin/employees`} className="flex-1">
            <Button variant="primary" className="w-full" icon={LuArrowLeft}>
              {t('backToList')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
