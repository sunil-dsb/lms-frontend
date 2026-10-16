"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { classifyVideoUrl } from "@/lib/procedure-media";
import {
  LuArrowDown,
  LuArrowUp,
  LuCamera,
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuCirclePlay,
  LuCloudUpload,
  LuCopy,
  LuFocus,
  LuGripVertical,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuImagePlus,
  LuLightbulb,
  LuLink,
  LuListChecks,
  LuListOrdered,
  LuPaperclip,
  LuPlus,
  LuRefreshCw,
  LuRotateCcw,
  LuTable,
  LuTrash2,
  LuTriangleAlert,
  LuType,
  LuUpload,
  LuUtensils,
  LuVideo,
  LuWorkflow,
  LuWrench,
  LuX,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";
import type { Localised, ProcedureBlock } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  BilingualTabs,
  EditorProps,
  Field,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  NOTE_KINDS,
  UNITS,
  asLocalised,
  asOpt,
  emptyCriticalLimit,
  emptyIngredient,
  newMethodStep,
  setLocalised,
  setOpt,
  textareaCls,
} from "./shared";

export function TableEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "table" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
  const [lang, setLang] = React.useState<"en" | "es">("en");
  const headerCount = block.headers.length;
  const rowCount = block.rows.length;

  function setHeader(j: number, value: string): void {
    onChange({
      ...block,
      headers: block.headers.map((h, k) =>
        k === j ? setLocalised(h, lang, value) : h,
      ),
    });
  }
  function setCell(i: number, j: number, value: string): void {
    onChange({
      ...block,
      rows: block.rows.map((row, k) =>
        k === i
          ? row.map((cell, l) =>
              l === j ? setLocalised(cell, lang, value) : cell,
            )
          : row,
      ),
    });
  }
  function addColumn(): void {
    const empty: Localised = { en: "", es: "" };
    onChange({
      ...block,
      headers: [...block.headers, empty],
      rows: block.rows.map((row) => [...row, empty]),
    });
  }
  function removeColumn(j: number): void {
    if (headerCount <= 1) return;
    onChange({
      ...block,
      headers: block.headers.filter((_, k) => k !== j),
      rows: block.rows.map((row) => row.filter((_, k) => k !== j)),
    });
  }
  function addRow(): void {
    const emptyRow: Localised[] = Array.from({ length: headerCount }, () => ({
      en: "",
      es: "",
    }));
    onChange({ ...block, rows: [...block.rows, emptyRow] });
  }
  function removeRow(i: number): void {
    if (rowCount <= 1) return;
    onChange({ ...block, rows: block.rows.filter((_, k) => k !== i) });
  }

  return (
    <div className="space-y-3">
      <BilingualTabs
        active={lang}
        onChange={setLang}
        enLabel={t("tabs.en")}
        esLabel={t("tabs.es")}
      />
      <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
        <Label className="text-sm">{t("tableHeaders")}</Label>
        <div
          className="grid grid-cols-1 gap-2"
          style={{
            gridTemplateColumns: `repeat(${headerCount}, minmax(0,1fr)) auto`,
          }}
        >
          {block.headers.map((h, j) => (
            <Input
              key={j}
              value={asLocalised(h, lang)}
              onChange={(e) => setHeader(j, e.target.value)}
              maxLength={100}
            />
          ))}
          {headerCount > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t("table.removeColumn")}
              onClick={() => removeColumn(headerCount - 1)}
            >
              <LuX aria-hidden="true" />
            </Button>
          )}
        </div>
        {headerCount < 6 && (
          <Button type="button" variant="ghost" size="sm" onClick={addColumn}>
            + {t("table.addColumn")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{t("tableRows")}</Label>
        {block.rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="grid flex-1 gap-2"
              style={{
                gridTemplateColumns: `repeat(${headerCount}, minmax(0,1fr))`,
              }}
            >
              {row.map((cell, j) => (
                <Input
                  key={j}
                  value={asLocalised(cell, lang)}
                  onChange={(e) => setCell(i, j, e.target.value)}
                  maxLength={500}
                  placeholder={t("table.emptyCell")}
                />
              ))}
            </div>
            {rowCount > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("table.removeRow")}
                onClick={() => removeRow(i)}
              >
                <LuX aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          + {t("table.addRow")}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist editor — a bilingual list of items the employee can tick off.
// ---------------------------------------------------------------------------

const nextChecklistItemId = (): string =>
  `ci-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

const MAX_CHECKLIST_ITEMS = 30;

export function ChecklistEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "checklist" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
  const [lang, setLang] = React.useState<"en" | "es">("en");

  function patchItem(
    i: number,
    patch: Partial<{ id: string; text: Localised }>,
  ): void {
    onChange({
      ...block,
      items: block.items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    });
  }

  function addItem(): void {
    if (block.items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange({
      ...block,
      items: [
        ...block.items,
        { id: nextChecklistItemId(), text: { en: "", es: "" } },
      ],
    });
  }

  function removeItem(i: number): void {
    if (block.items.length <= 1) return;
    onChange({ ...block, items: block.items.filter((_, j) => j !== i) });
  }

  function moveItem(i: number, dir: "up" | "down"): void {
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= block.items.length) return;
    const next = block.items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...block, items: next });
  }

  return (
    <div className="space-y-3">
      <Field label={t("checklist.title")}>
        <BilingualTabs
          active={lang}
          onChange={setLang}
          enLabel={t("tabs.en")}
          esLabel={t("tabs.es")}
        />
        <Input
          value={asOpt(block.title, lang)}
          onChange={(e) =>
            onChange({
              ...block,
              title: setOpt(block.title, lang, e.target.value),
            })
          }
          placeholder={t("checklist.title")}
          maxLength={50}
        />
      </Field>

      <div className="space-y-2">
        <Label className="text-sm">{t("checklist.items")}</Label>
        <BilingualTabs
          active={lang}
          onChange={setLang}
          enLabel={t("tabs.en")}
          esLabel={t("tabs.es")}
        />
        <ol className="space-y-1.5">
          {block.items.map((it, i) => (
            <li
              key={it.id}
              className="group/item flex items-center gap-2 rounded-md border border-transparent p-1.5 transition-colors hover:border-[var(--color-line-2)] hover:bg-[var(--color-wash)]"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-ok-tint)] font-mono text-[10px] font-bold text-[var(--color-ok)]">
                {i + 1}
              </span>
              <input
                type="text"
                value={asLocalised(it.text, lang)}
                onChange={(e) =>
                  patchItem(i, {
                    text: setLocalised(it.text, lang, e.target.value),
                  })
                }
                placeholder={t("checklist.itemPlaceholder", { n: i + 1 })}
                maxLength={100}
                className="flex-1 bg-transparent px-1 py-0.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] border-none outline-none focus:outline-none focus:ring-0 shadow-none"
              />
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("checklist.moveUp")}
                  disabled={i === 0}
                  onClick={() => moveItem(i, "up")}
                  className="size-7"
                >
                  <LuArrowUp aria-hidden="true" className="text-xs" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("checklist.moveDown")}
                  disabled={i === block.items.length - 1}
                  onClick={() => moveItem(i, "down")}
                  className="size-7"
                >
                  <LuArrowDown aria-hidden="true" className="text-xs" />
                </Button>
                {block.items.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("checklist.removeItem")}
                    onClick={() => removeItem(i)}
                    className="size-7 text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
                  >
                    <LuX aria-hidden="true" className="text-xs" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {block.items.length < MAX_CHECKLIST_ITEMS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addItem}
            className="gap-1 text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:bg-[var(--color-panel)]"
          >
            <LuPlus aria-hidden="true" className="text-xs" />
            {t("checklist.addItem")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------
