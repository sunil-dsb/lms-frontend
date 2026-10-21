"use client";

import * as React from "react";
import { LuBookOpen } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import type { Procedure, ProcedureBlock } from "@/lib/types";
import { listAvailableSops } from "@/lib/mock-training";
import { useProcedures } from "@/services/library/hooks";
import { LinkProcedureModal } from "@/components/admin/link-procedure-modal";

interface LinkedProceduresBodyProps {
  block: Extract<ProcedureBlock, { kind: "linked_procedures" }>;
  onPatch: (
    next: Extract<ProcedureBlock, { kind: "linked_procedures" }>,
  ) => void;
  locale?: string;
  onPreview?: (procedure: Procedure) => void;
}

export function LinkedProceduresBody({
  block,
  onPatch,
  locale = "en",
  onPreview,
}: LinkedProceduresBodyProps): React.ReactElement {
  const isEs = locale === "es";
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [fetchedProcedures, setFetchedProcedures] = React.useState<
    Record<string, Procedure>
  >({});

  const { data: apiData } = useProcedures({}, true);

  const availableSops = React.useMemo(() => {
    if (apiData?.procedures && apiData.procedures.length > 0) {
      return apiData.procedures;
    }
    return listAvailableSops();
  }, [apiData]);

  const byId = React.useMemo(() => {
    const map = new Map<string, Procedure>();
    for (const p of availableSops) {
      map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    }
    return map;
  }, [availableSops]);

  // Fetch any missing procedure directly from the library API by slug/id
  React.useEffect(() => {
    const missingIds = block.procedureIds.filter(
      (id) => !byId.has(id) && !fetchedProcedures[id],
    );
    if (missingIds.length === 0) return;

    let isMounted = true;
    for (const id of missingIds) {
      import("@/services/library/api")
        .then(({ fetchProcedureById }) => fetchProcedureById(id, true))
        .then((proc) => {
          if (isMounted && proc) {
            setFetchedProcedures((prev) => ({
              ...prev,
              [id]: proc,
              ...(proc.slug ? { [proc.slug]: proc } : {}),
            }));
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [block.procedureIds, byId, fetchedProcedures]);

  const selectedProcedures = React.useMemo(() => {
    return block.procedureIds
      .map((id) => byId.get(id) || fetchedProcedures[id])
      .filter((p): p is Procedure => Boolean(p));
  }, [block.procedureIds, byId, fetchedProcedures]);

  const handleConfirm = (procedureIds: string[]) => {
    onPatch({
      ...block,
      procedureIds,
    });
  };

  return (
    <>
      <div className="space-y-3">
        {selectedProcedures.length === 0 ? (
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-line-2)] bg-[var(--color-wash)]/40 py-8 px-6 text-center cursor-pointer hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]/20 transition-all group"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-line-2)] text-[var(--color-ink-2)] group-hover:text-[var(--color-brand-600)] group-hover:border-[var(--color-brand-200)] shadow-xs transition-colors">
              <LuBookOpen className="w-5 h-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
              {isEs ? "Vincular un procedimiento" : "Link a procedure"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-3)] max-w-sm">
              {isEs
                ? "Selecciona un procedimiento de la biblioteca para incluirlo en este capítulo."
                : "Select a procedure from the library to include it in this chapter."}
            </p>
          </div>
        ) : (
          selectedProcedures.map((sop) => {
            const title = isEs
              ? sop.titleEs || sop.titleEn
              : sop.titleEn || sop.titleEs;

            const categoryName = sop.category
              ? isEs
                ? sop.category.nameEs || sop.category.nameEn
                : sop.category.nameEn || sop.category.nameEs
              : "Recipes";

            // Count ingredients
            const blocks = (sop.bodyEn?.blocks ||
              sop.bodyEs?.blocks ||
              []) as ProcedureBlock[];
            const ingBlock = blocks.find(
              (b) => b.kind === "ingredients" || b.kind === "recipe",
            );
            let ingCount = 0;
            if (
              ingBlock &&
              "ingredients" in ingBlock &&
              Array.isArray(ingBlock.ingredients)
            ) {
              ingCount = ingBlock.ingredients.length;
            }

            // Count steps
            const methodBlock = blocks.find(
              (b) => b.kind === "method" || b.kind === "recipe",
            );
            let stepCount = 0;
            if (
              methodBlock &&
              "steps" in methodBlock &&
              Array.isArray(methodBlock.steps)
            ) {
              stepCount = methodBlock.steps.length;
            }

            // Formatted date
            const formattedDate = sop.updatedAt
              ? new Date(sop.updatedAt).toLocaleDateString(
                  isEs ? "es-ES" : "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  },
                )
              : "Sep 12";

            const metaParts = [
              categoryName,
              ingCount > 0
                ? `${ingCount} ${isEs ? "ingredientes" : "ingredients"}`
                : null,
              stepCount > 0 ? `${stepCount} ${isEs ? "pasos" : "steps"}` : null,
              `${isEs ? "Actualizado" : "Updated"} ${formattedDate}`,
            ].filter(Boolean);

            const metaText = metaParts.join(" · ");

            return (
              <div
                key={sop.id}
                className="rounded-2xl border border-[#f4cfc6] bg-[#fbf5f3] dark:bg-[var(--color-brand-950)]/20 dark:border-[var(--color-brand-900)] p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] text-[var(--color-brand-600)] border border-[var(--color-brand-200)]">
                      <LuBookOpen className="w-5 h-5 stroke-[2]" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-[var(--color-ink)] truncate">
                        {title}
                      </h4>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-2)] truncate">
                        {metaText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="surface"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-white hover:bg-neutral-50 dark:bg-[var(--color-surface)] shadow-xs text-xs font-semibold"
                    >
                      {isEs ? "Reemplazar" : "Replace"}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-ink-2)] leading-relaxed pt-1">
                  {isEs
                    ? "Los empleados leen este procedimiento dentro del capítulo. Si edita el procedimiento, el capítulo también se actualiza."
                    : "Employees read this procedure inside the chapter. If you edit the procedure, the chapter updates too."}
                </p>
              </div>
            );
          })
        )}
      </div>

      <LinkProcedureModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSelectedIds={block.procedureIds}
        onConfirm={handleConfirm}
        locale={locale}
      />
    </>
  );
}
