"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuCalendarDays, LuLoader } from "react-icons/lu";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAssignmentDueDatesApi } from "@/services/courses/api";

export interface ChangeDueDateModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  /** One id = a single row; several = a bulk change from the table. */
  employeeIds: string[];
  /** Display name used by the single-row subtitle. */
  employeeName?: string;
  /** Prefill — the current due date, or the date every selected row shares. */
  currentDueDate?: string;
  /** Called after a successful save — the pages reload to re-derive statuses. */
  onSuccess: () => void;
}

/**
 * Retimes assignments: PATCH /courses/:id/assignments with the picked date.
 * Accepts any YYYY-MM-DD (past dates allowed — deliberately, so something
 * can be pushed into the past to become overdue right away).
 */
export function ChangeDueDateModal({
  open,
  onClose,
  courseId,
  courseTitle,
  employeeIds,
  employeeName,
  currentDueDate,
  onSuccess,
}: ChangeDueDateModalProps): React.ReactElement | null {
  const t = useTranslations("admin.training.progress");
  // Rendered only while a target exists (the pages mount it on demand), so
  // every open is a fresh mount — state seeds straight from the props.
  const [dueDate, setDueDate] = React.useState(currentDueDate ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!dueDate || loading) return;
    setError(null);
    setLoading(true);

    try {
      await updateAssignmentDueDatesApi(courseId, employeeIds, dueDate);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to change assignment due date:", err);
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || t("dueDateFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const isBulk = employeeIds.length > 1;

  return (
    <Modal open={open} onClose={() => !loading && onClose()} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title={t("dueDateModalTitle")}
          description={
            isBulk
              ? t("dueDateModalBulkSubtitle", {
                  count: employeeIds.length,
                  course: courseTitle,
                })
              : t("dueDateModalSingleSubtitle", {
                  name: employeeName ?? "",
                  course: courseTitle,
                })
          }
          onClose={onClose}
        />
        <ModalBody className="space-y-4">
          {error ? (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bad-surface)] p-3 text-sm text-[var(--color-bad)]">
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="change-due-date-input"
              className="text-sm font-medium text-[var(--color-ink)]"
            >
              {t("dueDateLabel")}
            </label>
            <Input
              id="change-due-date-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            <p className="text-xs text-[var(--color-ink-3)]">
              {t("dueDateHint")}
            </p>
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
            disabled={loading || !dueDate}
          >
            {loading ? (
              <>
                <LuLoader className="size-4 animate-spin" />
                <span>{t("dueDateSaving")}</span>
              </>
            ) : (
              <>
                <LuCalendarDays className="size-4" />
                <span>{t("dueDateSave")}</span>
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
