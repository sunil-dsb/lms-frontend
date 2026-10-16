"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/ui/status-pill";
import { Icon } from "@/components/ui/icon";
import { FormSection } from "@/components/admin/form-section";
import { cn } from "@/lib/utils";
import type { TrainingAssignment, TrainingAssignmentStatus } from "@/lib/types";
import { effectiveStatus } from "@/lib/mock-training";
import {
  LuCheck,
  LuClipboardList,
  LuSearch,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";

interface MockEmployee {
  id: string;
  name: string;
  station: string;
}

interface AssignFormProps {
  locale: string;
  courseId: string;
  employees: MockEmployee[];
  existingAssignments: TrainingAssignment[];
}

// Default due date — seven days from today in YYYY-MM-DD form (HTML date input).
function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function statusFor(a: TrainingAssignment): TrainingAssignmentStatus {
  return effectiveStatus(a);
}

const STATUS_TONE: Record<
  TrainingAssignmentStatus,
  "neutral" | "ok" | "warn" | "bad"
> = {
  due: "warn",
  in_progress: "warn",
  complete: "ok",
  overdue: "bad",
};

// ---------------------------------------------------------------------------
// AlreadyAssignedTable — surfaces who's on this course so the admin can
// avoid double-assigning and see current state at a glance.
// ---------------------------------------------------------------------------

function AlreadyAssignedTable({
  employees,
  assignments,
}: {
  employees: MockEmployee[];
  assignments: TrainingAssignment[];
}): React.ReactElement {
  const t = useTranslations("admin.training.assign");

  const rows = React.useMemo(() => {
    return assignments.flatMap((a) => {
      const emp = employees.find((e) => e.id === a.employeeId);
      if (!emp) return [];
      return [{ employee: emp, assignment: a, status: statusFor(a) }];
    });
  }, [assignments, employees]);

  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-3 text-sm text-[var(--color-ink-2)]">
        {t("noneAssigned")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {rows.map(({ employee, assignment, status }) => (
        <li
          key={assignment.id}
          className="flex flex-col gap-2 p-3 text-xs md:flex-row md:items-center md:gap-4"
        >
          <div className="flex items-center gap-2 md:min-w-0 md:flex-1">
            <span
              aria-hidden="true"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-[11px] font-semibold text-[var(--color-ink)]"
            >
              {employee.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
                {employee.name}
              </p>
              <p className="truncate text-[11px] text-[var(--color-ink-2)]">
                {employee.station}
              </p>
            </div>
          </div>
          <StatusPill tone={STATUS_TONE[status]} withDot>
            {t(`status.${status}`)}
          </StatusPill>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// EmployeePicker — search + chip list. Click a chip to toggle selection.
// ---------------------------------------------------------------------------

function EmployeePicker({
  employees,
  selectedIds,
  onToggle,
}: {
  employees: MockEmployee[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}): React.ReactElement {
  const t = useTranslations("admin.training.assign");
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      (e.name + " " + e.station).toLowerCase().includes(q),
    );
  }, [employees, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{t("pickEmployees")}</Label>
        <span className="text-sm text-[var(--color-ink-2)]">
          {t("selectedCount", { count: selectedIds.size })}
        </span>
      </div>

      <div className="relative">
        <LuSearch
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-3)]"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchEmployees")}
          className="h-tap-admin pl-10 text-xs"
        />
      </div>

      <ul className="max-h-64 divide-y divide-[var(--color-line)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-[var(--color-ink-2)]">
            {t("noEmployeesMatch")}
          </li>
        ) : (
          filtered.map((e) => {
            const selected = selectedIds.has(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onToggle(e.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                    selected
                      ? "bg-[var(--color-brand-tint)] hover:bg-[var(--color-brand-tint-2)]"
                      : "hover:bg-[var(--color-wash)]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      selected
                        ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"
                        : "border-[var(--color-line-3)] text-transparent",
                    )}
                  >
                    {selected ? <LuCheck className="text-xs" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[var(--color-ink)]">
                      {e.name}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--color-ink-2)]">
                      {e.station}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssignForm — the page's interactive surface.
// ---------------------------------------------------------------------------

export function AssignForm({
  locale,
  courseId,
  employees,
  existingAssignments,
}: AssignFormProps): React.ReactElement {
  const t = useTranslations("admin.training.assign");
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dueAt, setDueAt] = React.useState<string>(defaultDueDate());

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAssign(): void {
    const newIds = Array.from(selected).filter(
      (id) => !existingAssignments.some((a) => a.employeeId === id),
    );
    if (newIds.length === 0) return;
    console.info("[training] assign course (mock)", {
      courseId,
      employeeIds: newIds,
      dueAt,
    });
    setSelected(new Set());
    router.push(`/${locale}/admin/training`);
  }

  const newSelections = Array.from(selected).filter(
    (id) => !existingAssignments.some((a) => a.employeeId === id),
  );
  const canAssign = newSelections.length > 0 && Boolean(dueAt);

  return (
    <div className="space-y-8">
      <FormSection
        icon={LuUsers}
        title={t("sectionNew")}
        subtitle={t("sectionNewSubtitle")}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmployeePicker
              employees={employees}
              selectedIds={selected}
              onToggle={toggle}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="dueAt" className="text-sm">
              {t("dueAt")}
            </Label>
            <Input
              id="dueAt"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="h-tap-admin text-sm"
              min={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-sm text-[var(--color-ink-2)]">
              {t("dueAtHint")}
            </p>

            {newSelections.length > 0 ? (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold text-[var(--color-ink-2)]">
                  {t("summary", { count: newSelections.length })}
                </p>
                <ul className="space-y-1">
                  {newSelections.map((id) => {
                    const e = employees.find((x) => x.id === id);
                    if (!e) return null;
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-md bg-[var(--color-wash)] px-2 py-1 text-xs"
                      >
                        <Icon
                          icon={LuUserPlus}
                          className="text-xs text-[var(--color-ink-3)]"
                        />
                        <span className="truncate text-[var(--color-ink)]">
                          {e.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!canAssign}
                onClick={handleAssign}
              >
                <LuUserPlus aria-hidden="true" className="mr-1" />
                {t("assignAction", { count: newSelections.length })}
              </Button>
              {selected.size > 0 ? (
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  {t("clearSelection")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        icon={LuClipboardList}
        title={t("sectionCurrent")}
        subtitle={t("sectionCurrentSubtitle")}
        headerAction={
          <span className="text-sm leading-meta text-[var(--color-ink-2)]">
            {t("totalAssigned", { count: existingAssignments.length })}
          </span>
        }
      >
        <AlreadyAssignedTable
          employees={employees}
          assignments={existingAssignments}
        />
      </FormSection>
    </div>
  );
}
