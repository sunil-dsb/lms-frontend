'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Modal,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { resendInvite } from '@/services/employees/api';
import { ApiException } from '@/lib/errors';
import type { AdminEmployee, InviteResult } from '@/lib/types';
import {
  LuMail,
  LuSend,
  LuCheck,
  LuCopy,
  LuClock,
  LuCircleAlert,
  LuX,
} from 'react-icons/lu';

interface ResendInviteModalProps {
  open: boolean;
  onClose: () => void;
  employee: AdminEmployee;
  locale: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ResendInviteModal({
  open,
  onClose,
  employee,
}: ResendInviteModalProps): React.ReactElement | null {
  const t = useTranslations('admin');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [phase, setPhase] = useState<'confirm' | 'success'>('confirm');
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens or closes
  React.useEffect(() => {
    if (open) {
      setPhase('confirm');
      setInviteResult(null);
      setError(null);
      setCopied(false);
    }
  }, [open, employee.id]);

  const displayUrl = useMemo(() => {
    if (!inviteResult?.url) return '';
    try {
      if (typeof window !== 'undefined') {
        const isLocal =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';
        if (isLocal) {
          const urlObj = new URL(inviteResult.url);
          return `${window.location.origin}${urlObj.pathname}${urlObj.search}`;
        }
      }
    } catch {
      // fallback
    }
    return inviteResult.url;
  }, [inviteResult?.url]);

  async function handleSend(): Promise<void> {
    setError(null);
    startTransition(async () => {
      try {
        const { invite } = await resendInvite(employee.id);
        setInviteResult(invite);
        setPhase('success');
        router.refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError(t('errorGeneric'));
        }
      }
    });
  }

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

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="md" className="max-w-[520px] w-full">
      {phase === 'confirm' ? (
        <>
          {/* Centered Header with top-right Close button */}
          <div className="relative border-b border-[var(--color-line)] px-6 pt-6 pb-4 text-center">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors focus:outline-none"
              aria-label="Close"
            >
              <LuX className="size-5" />
            </button>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
              {t('resendModalTitle')}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-2)]">
              {t('resendModalSubtitle')}
            </p>
          </div>

          <ModalBody className="space-y-4 pt-5 pb-6">
            {/* Employee summary card */}
            <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-panel)] p-4">
              <Avatar initials={initials(employee.name)} size="md" />
              <div className="min-w-0">
                <h3 className="break-words text-left font-semibold leading-5 text-[var(--color-ink)]">
                    {employee.name}
                </h3>
                <p className="mt-1 break-all text-left text-xs leading-4 text-[var(--color-ink-2)]">
                  {employee.email || 'No email provided'}
                </p>
              </div>
              <StatusPill tone={employee.status === 'pending' ? 'warn' : employee.status === 'active' ? 'success' : 'neutral'}>
                {t(`status${employee.status.charAt(0).toUpperCase()}${employee.status.slice(1)}`)}
              </StatusPill>
            </div>

            {/* Information alert */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-4 text-xs text-[var(--color-ink-2)] leading-relaxed flex items-start gap-3">
              <LuMail className="size-4 shrink-0 mt-0.5 text-[var(--color-brand)]" />
              <div>
                <p className="font-medium text-[var(--color-ink)] mb-0.5">
                  {t('resendModalNotice', { email: employee.email ?? employee.name })}
                </p>
                <p className="text-[var(--color-ink-3)] text-[11px] mt-1 flex items-center gap-1">
                  <LuClock className="size-3" />
                  {t('resendModalExpires')}
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-bad-line)] bg-[var(--color-bad-tint)] p-3 text-xs text-[var(--color-bad)] flex items-center gap-2">
                <LuCircleAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={onClose}
              disabled={isPending}
            >
              {t('actionsCancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSend()}
              disabled={isPending}
              icon={LuSend}
            >
              {isPending ? t('resendModalSending') : t('resendModalConfirmBtn')}
            </Button>
          </ModalFooter>
        </>
      ) : (
        <>
          {/* Top Brand Gradient Stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] shrink-0" />

          {/* Centered Header with top-right Close button */}
          <div className="relative border-b border-[var(--color-line)] px-6 pt-6 pb-4 text-center">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors focus:outline-none"
              aria-label="Close"
            >
              <LuX className="size-5" />
            </button>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
              {t('resendModalSuccessHeading')}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-2)]">
              {t('inviteEmailSent')}
            </p>
          </div>

          <ModalBody className="space-y-5 pt-5 pb-6">
            {/* Success notification banner */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-ok-line,var(--color-line))] bg-[var(--color-ok-tint,#e8f8ed)] p-4 text-center space-y-1">
              <p className="font-semibold text-[var(--color-ok,#1a7f37)] flex items-center justify-center gap-1.5 text-sm">
                <LuCheck className="size-4 shrink-0 text-[var(--color-ok)]" />
                {t('resendModalSuccessHeading')}
              </p>
              <p className="text-xs text-[var(--color-ink-2)] leading-relaxed">
                {t('resendModalSuccessNotice', { email: employee.email ?? employee.name })}
              </p>
            </div>

            {/* Direct invitation link - Centered label + flex container with zero overflow */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wider text-center">
                {t('inviteUrlLabel')}
              </label>
              <div className="flex items-center gap-2 w-full min-w-0">
                <input
                  type="text"
                  readOnly
                  value={displayUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-2 text-xs font-mono text-[var(--color-ink)] select-all truncate focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] shadow-inner"
                />
                <Button
                  type="button"
                  size="sm"
                  variant={copied ? 'secondary' : 'neutral'}
                  onClick={() => void copyUrl()}
                  icon={copied ? LuCheck : LuCopy}
                  className="shrink-0 font-medium"
                >
                  {copied ? t('copied') : t('copyUrl')}
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-[var(--color-ink-3)] flex items-center justify-center gap-1.5 pt-1">
              <LuClock className="size-3.5" />
              {t('resendModalExpires')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto min-w-[100px]"
              onClick={onClose}
            >
              {t('resendModalDone')}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
