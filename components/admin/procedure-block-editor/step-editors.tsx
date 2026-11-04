"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { nextStepId } from "@/lib/procedure-blocks";
import type { ProcedureBlock, ProcedureMethodStep } from "@/lib/types";
import { EditorProps, newMethodStep } from "./shared";
import { SortableStepRow } from "./step-row";

// ---------------------------------------------------------------------------
// Steps list with nested @dnd-kit drag context.
// ---------------------------------------------------------------------------

export function StepsList({
  steps,
  onChange,
  recipeAware,
}: {
  steps: ProcedureMethodStep[];
  onChange: (next: ProcedureMethodStep[]) => void;
  /** True inside a `recipe` block — gates the cook-mode-only fields
   *  (timer / discard / compare-images) so `method` blocks stay simple. */
  recipeAware?: boolean;
}): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = steps.findIndex(
      (s) => (s.id ?? `step-${steps.indexOf(s)}`) === active.id,
    );
    const to = steps.findIndex(
      (s) => (s.id ?? `step-${steps.indexOf(s)}`) === over.id,
    );
    if (from === -1 || to === -1 || from === to) return;
    onChange(arrayMove(steps, from, to));
  }

  function moveStep(i: number, dir: "up" | "down"): void {
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= steps.length) return;
    onChange(arrayMove(steps, i, j));
  }

  function dupStep(i: number): void {
    const src = steps[i];
    if (!src) return;
    const clone: ProcedureMethodStep = {
      ...src,
      id: nextStepId(),
      body: { en: src.body.en, es: src.body.es },
      criticalLimit: src.criticalLimit ? { ...src.criticalLimit } : undefined,
      videoSegment: src.videoSegment ? { ...src.videoSegment } : undefined,
    };
    onChange([...steps.slice(0, i + 1), clone, ...steps.slice(i + 1)]);
  }

  function removeStep(i: number): void {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, j) => j !== i));
  }

  function patchStep(i: number, next: ProcedureMethodStep): void {
    onChange(steps.map((s, j) => (j === i ? next : s)));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={steps.map((s, i) => s.id ?? `step-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {steps.map((s, i) => (
            <SortableStepRow
              key={s.id ?? `step-${i}`}
              step={s}
              index={i}
              total={steps.length}
              onChange={(next) => patchStep(i, next)}
              onRemove={() => removeStep(i)}
              onMove={(dir) => moveStep(i, dir)}
              onDuplicate={() => dupStep(i)}
              recipeAware={recipeAware}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Method editor
// ---------------------------------------------------------------------------

export function MethodEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "method" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form");
  return (
    <div className="space-y-3">
      <StepsList
        steps={block.steps}
        onChange={(steps) => onChange({ ...block, steps })}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange({ ...block, steps: [...block.steps, newMethodStep()] })
        }
      >
        + {t("addStep")}
      </Button>
    </div>
  );
}
