"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuClock, LuLoader, LuShieldCheck } from "react-icons/lu";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantTrainingOverrideApi } from "@/services/courses/api";

export interface GrantOverrideModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  courseId?: string;
  courseTitle?: string;
  onSuccess: () => void;
}

type DurationOption = "24h" | "48h" | "7d" | "custom";

export function GrantOverrideModal({
  open,
  onClose,
  employeeId,
  employeeName,
  courseId,
  courseTitle,
  onSuccess,
}: GrantOverrideModalProps): React.ReactElement | null {
  const t = useTranslations("admin.training.override");
  const [duration, setDuration] = React.useState<DurationOption>("24h");
  const [customDate, setCustomDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Set default custom date to 3 days ahead in YYYY-MM-DD
  React.useEffect(() => {
    if (open) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setCustomDate(d.toISOString().slice(0, 10));
      setReason("");
      setDuration("24h");
      setError(null);
    }
  }, [open]);

  function calculateExpiry(): string {
    const now = new Date();
    if (duration === "24h") {
      now.setHours(now.getHours() + 24);
      return now.toISOString();
    }
    if (duration === "48h") {
      now.setHours(now.getHours() + 48);
      return now.toISOString();
    }
    if (duration === "7d") {
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    }
    // custom date
    const d = new Date(customDate);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const overrideUntil = calculateExpiry();
      await grantTrainingOverrideApi(employeeId, {
        overrideUntil,
        reason: reason.trim() || undefined,
        courseId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to grant training override:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to grant override",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => !loading && onClose()} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title={t("grantTitle")}
          description={
            courseTitle
              ? t("grantCourseSubtitle", {
                  name: employeeName,
                  course: courseTitle,
                })
              : t("grantSubtitle", { name: employeeName })
          }
          onClose={onClose}
        />
        <ModalBody className="space-y-4">
          {error ? (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bad-surface)] p-3 text-sm text-[var(--color-bad)]">
              {error}
            </div>
          ) : null}

          <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 text-xs text-[var(--color-ink-2)] flex items-start gap-2.5">
            <LuShieldCheck className="size-4 shrink-0 text-[var(--color-brand-600)] mt-0.5" />
            <p className="leading-relaxed">{t("grantNotice")}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-ink)]">
              {t("durationLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: "24h", label: t("duration24h") },
                { value: "48h", label: t("duration48h") },
                { value: "7d", label: t("duration7d") },
                { value: "custom", label: t("durationCustom") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value as DurationOption)}
                  className={`rounded-[var(--radius-md)] border py-2 px-3 text-xs font-semibold transition-colors text-center ${
                    duration === opt.value
                      ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] shadow-sm dark:bg-[var(--color-brand-950)]/40 dark:text-[var(--color-brand-300)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-hover)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {duration === "custom" ? (
              <div className="mt-2.5">
                <Input
                  type="date"
                  value={customDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  required
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-ink)]">
              {t("reasonLabel")}{" "}
              <span className="text-xs text-[var(--color-ink-3)] font-normal">
                ({t("optional")})
              </span>
            </label>
            <Input
              type="text"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="neutral"
            size="sm"
            disabled={loading}
            onClick={onClose}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading || (duration === "custom" && !customDate)}
          >
            {loading ? (
              <>
                <LuLoader className="size-4 animate-spin" />
                <span>{t("granting")}</span>
              </>
            ) : (
              <>
                <LuClock className="size-4" />
                <span>{t("grantConfirm")}</span>
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
