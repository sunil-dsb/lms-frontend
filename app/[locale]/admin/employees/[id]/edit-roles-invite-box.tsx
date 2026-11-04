"use client";

import * as React from "react";
import { useState } from "react";
import { LuCheck, LuCopy, LuLoader } from "react-icons/lu";
import { Button } from "@/components/ui/button";

interface EditRolesInviteBoxProps {
  inviteLoading: boolean;
  savedInvite: string | null;
  inviteEmpty: boolean;
  inviteFresh: boolean;
  isEs: boolean;
  inviteBoxRef: React.RefObject<HTMLDivElement | null>;
  onResendInvite: () => void;
  labels: {
    inviteCreatedHeading: string;
    inviteUrlLabel: string;
    inviteEmailSent: string;
    copied: string;
    copyUrl: string;
    submitting: string;
  };
}

export function EditRolesInviteBox({
  inviteLoading,
  savedInvite,
  inviteEmpty,
  inviteFresh,
  isEs,
  inviteBoxRef,
  onResendInvite,
  labels,
}: EditRolesInviteBoxProps): React.ReactElement | null {
  const [copied, setCopied] = useState(false);

  async function copyInvite(): Promise<void> {
    if (!savedInvite) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(savedInvite);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = savedInvite;
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setCopied(ok);
  }

  if (!inviteLoading && !savedInvite && !inviteEmpty) return null;

  return (
    <div
      ref={inviteBoxRef}
      className="border-t border-[var(--color-line)] pt-4"
    >
      {savedInvite ? (
        <>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {inviteFresh ? labels.inviteCreatedHeading : labels.inviteUrlLabel}
          </p>
          {inviteFresh ? (
            <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
              {labels.inviteEmailSent}
            </p>
          ) : null}
          <p className="mt-2 break-all rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
            {savedInvite}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copyInvite()}
            icon={copied ? LuCheck : LuCopy}
            className="mt-2"
          >
            {copied ? labels.copied : labels.copyUrl}
          </Button>
        </>
      ) : inviteEmpty ? (
        <>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {labels.inviteUrlLabel}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
            {isEs
              ? "No hay ningún enlace activo. Genera uno nuevo para este empleado pendiente."
              : "There is no active link. Generate a fresh one for this pending employee."}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={onResendInvite}
            icon={LuCopy}
            className="mt-2"
            disabled={inviteLoading}
          >
            {isEs ? "Generar enlace" : "Generate link"}
          </Button>
        </>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)]">
          <LuLoader
            className="size-4 animate-spin text-[var(--color-brand-600)]"
            aria-hidden="true"
          />
          <span>{labels.submitting}</span>
        </p>
      )}
    </div>
  );
}
