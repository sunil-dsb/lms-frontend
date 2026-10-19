import type { Procedure } from "@/lib/types";

function cleanLoc(v: any, fallback = "Content"): { en: string; es: string } {
  if (typeof v === "string") {
    const s = v.trim() || fallback;
    return { en: s, es: s };
  }
  const en = (v?.en ?? "").trim();
  const es = (v?.es ?? "").trim();
  const valid = en || es || fallback;
  return {
    en: en || valid,
    es: es || valid,
  };
}

function cleanLocOptional(
  v: any,
  defEn = "",
  defEs = "",
): { en?: string; es?: string } {
  if (!v)
    return defEn || defEs
      ? { en: defEn || undefined, es: defEs || undefined }
      : {};
  if (typeof v === "string") {
    const s = v.trim();
    if (!s)
      return defEn || defEs
        ? { en: defEn || undefined, es: defEs || undefined }
        : {};
    return { en: s, es: s };
  }
  const en = (v.en ?? "").trim() || defEn;
  const es = (v.es ?? "").trim() || defEs;
  const res: { en?: string; es?: string } = {};
  if (en) res.en = en;
  if (es) res.es = es;
  return res;
}

function normalizeStep(st: any, idx = 1): any {
  const isCrit = !!st.critical;
  let criticalLimit = st.criticalLimit;

  if (
    isCrit &&
    criticalLimit &&
    typeof criticalLimit.value === "string" &&
    criticalLimit.value.trim().length > 0
  ) {
    criticalLimit = {
      value: criticalLimit.value.trim(),
      howToCheck:
        criticalLimit.howToCheck?.trim() || "Visual and tactile verification",
      breachLabel:
        criticalLimit.breachLabel?.trim() || "Standard threshold breached",
      breachResponse:
        criticalLimit.breachResponse?.trim() ||
        "Stop preparation and notify kitchen lead",
      ...(criticalLimit.label?.trim()
        ? { label: criticalLimit.label.trim() }
        : {}),
      ...(criticalLimit.subtitle?.trim()
        ? { subtitle: criticalLimit.subtitle.trim() }
        : {}),
      ...(criticalLimit.icon?.trim()
        ? { icon: criticalLimit.icon.trim() }
        : {}),
    };
  } else {
    criticalLimit = undefined;
  }

  let timer = undefined;
  if (
    st.timer &&
    typeof st.timer.seconds === "number" &&
    st.timer.seconds > 0
  ) {
    timer = {
      seconds: Math.round(st.timer.seconds),
      label: (st.timer.label || "").trim() || "Timer",
    };
  }

  let note = undefined;
  if (
    st.note &&
    (st.note.body?.en?.trim() ||
      st.note.body?.es?.trim() ||
      (typeof st.note.body === "string" && st.note.body.trim()))
  ) {
    const validSeverities = ["warn", "tip", "alt", "equip", "allergen"];
    note = {
      severity: validSeverities.includes(st.note.severity)
        ? st.note.severity
        : "tip",
      body: cleanLoc(st.note.body, "Note"),
    };
  }

  let videoSegment = undefined;
  if (
    st.videoSegment &&
    typeof st.videoSegment.src === "string" &&
    st.videoSegment.src.trim().length > 0
  ) {
    videoSegment = {
      src: st.videoSegment.src.trim(),
      startSec: Math.max(0, Math.round(Number(st.videoSegment.startSec) || 0)),
      endSec: Math.max(0, Math.round(Number(st.videoSegment.endSec) || 0)),
    };
  }

  let images: any[] | undefined = undefined;
  if (Array.isArray(st.images) && st.images.length > 0) {
    const validImgs = st.images
      .filter(
        (img: any) =>
          img && typeof img.src === "string" && img.src.trim().length > 0,
      )
      .map((img: any) => ({
        src: img.src.trim(),
        alt: cleanLocOptional(img.alt, "Step photo", "Foto del paso"),
        ...(img.caption ? { caption: cleanLocOptional(img.caption) } : {}),
      }));
    if (validImgs.length > 0) images = validImgs;
  }

  return {
    id: st.id || `s-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    body: cleanLoc(st.body, `Step ${idx}`),
    critical: isCrit,
    ...(criticalLimit ? { criticalLimit } : {}),
    ...(timer ? { timer } : {}),
    ...(note ? { note } : {}),
    ...(videoSegment ? { videoSegment } : {}),
    ...(images ? { images } : {}),
    ...(typeof st.discardAt === "boolean" ? { discardAt: st.discardAt } : {}),
    ...(typeof st.discardAtHours === "number"
      ? { discardAtHours: st.discardAtHours }
      : {}),
    ...(typeof st.compareImages === "boolean"
      ? { compareImages: st.compareImages }
      : {}),
    ...(typeof st.videoSrc === "string" && st.videoSrc.trim()
      ? { videoSrc: st.videoSrc.trim() }
      : {}),
    ...(typeof st.videoCaption === "string" && st.videoCaption.trim()
      ? { videoCaption: st.videoCaption.trim() }
      : {}),
  };
}

function normalizeIngredientAmounts(
  validIngredients: any[],
  factors: number[],
): { factors: number[]; ingredients: any[] } {
  // Trim + pad to factors length first (legacy shape).
  let ingredients = validIngredients.map((ing: any) => {
    let amounts = Array.isArray(ing.amounts) ? [...ing.amounts] : [];
    amounts = amounts.map((a: any) => (typeof a === "string" ? a.trim() : ""));
    while (amounts.length < factors.length) amounts.push("");
    if (amounts.length > factors.length)
      amounts = amounts.slice(0, factors.length);
    return {
      name: ing.name.trim(),
      ...(ing.form?.trim() ? { form: ing.form.trim() } : {}),
      allergen: !!ing.allergen,
      ...(ing.unit?.trim() ? { unit: ing.unit.trim() } : {}),
      amounts,
    };
  });

  // Single-column UI (recipe-block-body / ingredients-block-body) only fills
  // amounts[0]. Sending ["2.8kg","",""] fails backend min(1). Collapse the
  // whole block to factors [1] when no ingredient carries a real 2nd+ value.
  const onlyBaseFilled = ingredients.every((ing) =>
    ing.amounts
      .slice(1)
      .every((a: string) => !a || a.trim() === "" || a.trim() === "1"),
  );
  if (onlyBaseFilled) {
    ingredients = ingredients.map((ing) => {
      const base = (ing.amounts[0] || "").trim() || "1";
      return { ...ing, amounts: [base] };
    });
    return { factors: [1], ingredients };
  }

  // Mixed case: legacy multi-factor row with a gap — backfill the gap from
  // the base so no empty string reaches backend validation.
  ingredients = ingredients.map((ing) => {
    const base = (ing.amounts[0] || "").trim() || "1";
    return {
      ...ing,
      amounts: ing.amounts.map((a: string) => (a && a.trim() ? a : base)),
    };
  });
  return { factors, ingredients };
}

export function normalizeBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  const normalized: any[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object" || !block.kind) continue;

    if (block.kind === "text") {
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "text",
        body: cleanLoc(block.body, "Content text"),
      });
      continue;
    }

    if (block.kind === "rich_text") {
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "rich_text",
        body: {
          en:
            block.body?.en?.type === "doc"
              ? block.body.en
              : { type: "doc", content: [{ type: "paragraph" }] },
          es:
            block.body?.es?.type === "doc"
              ? block.body.es
              : { type: "doc", content: [{ type: "paragraph" }] },
        },
      });
      continue;
    }

    if (block.kind === "heading") {
      const level = [1, 2, 3].includes(block.level) ? block.level : 2;
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "heading",
        level,
        text: cleanLoc(block.text, "Heading"),
      });
      continue;
    }

    if (block.kind === "warning") {
      const validSeverities = ["warn", "tip", "alt", "equip", "allergen"];
      const severity = validSeverities.includes(block.severity)
        ? block.severity
        : "warn";
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "warning",
        severity,
        body: cleanLoc(block.body, "Warning notification"),
      });
      continue;
    }

    if (block.kind === "image") {
      let src = (block.src || "").trim();
      if (!src)
        src =
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80";
      if (
        !src.startsWith("http://") &&
        !src.startsWith("https://") &&
        !src.startsWith("data:")
      ) {
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";
        src = `${origin}${src.startsWith("/") ? "" : "/"}${src}`;
      }
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "image",
        src,
        alt: cleanLocOptional(
          block.alt,
          "Procedure image",
          "Imagen del procedimiento",
        ),
        ...(block.caption ? { caption: cleanLocOptional(block.caption) } : {}),
        hint: block.hint === "diagram" ? "diagram" : "photo",
      });
      continue;
    }

    if (block.kind === "video") {
      const src = (block.src || "").trim() || "https://www.youtube.com";
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "video",
        src,
        ...(block.caption ? { caption: cleanLocOptional(block.caption) } : {}),
      });
      continue;
    }

    if (block.kind === "attachment") {
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "attachment",
        title: cleanLoc(block.title, "Document attachment"),
        href: (block.href || "").trim() || "#",
        ...(block.meta?.trim() ? { meta: block.meta.trim() } : {}),
      });
      continue;
    }

    if (block.kind === "table") {
      let rawHeaders = Array.isArray(block.headers) ? block.headers : [];
      if (rawHeaders.length === 0) {
        rawHeaders = [{ en: "Item", es: "Artículo" }];
      }
      const headers = rawHeaders.map((h: any, j: number) =>
        cleanLoc(h, `Column ${j + 1}`),
      );
      const rawRows = Array.isArray(block.rows) ? block.rows : [];
      const rows = rawRows.map((row: any) => {
        const rowArr = Array.isArray(row) ? row : [];
        return headers.map((_: unknown, colIdx: number) =>
          cleanLoc(rowArr[colIdx], "—"),
        );
      });
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "table",
        headers,
        rows: rows.length > 0 ? rows : [headers.map(() => cleanLoc(null, "—"))],
      });
      continue;
    }

    if (block.kind === "checklist") {
      const rawItems = Array.isArray(block.items) ? block.items : [];
      const items = (
        rawItems.length > 0
          ? rawItems
          : [{ id: "cl-1", text: { en: "Item 1", es: "Elemento 1" } }]
      ).map((it: any, j: number) => ({
        id: it.id || `cl-${j + 1}`,
        text: cleanLoc(it.text, `Item ${j + 1}`),
      }));
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "checklist",
        title: cleanLoc(block.title, "Checklist"),
        items,
      });
      continue;
    }

    if (block.kind === "method") {
      const rawSteps =
        Array.isArray(block.steps) && block.steps.length > 0
          ? block.steps.filter(
              (s: any) =>
                s &&
                (s.body?.en?.trim() ||
                  s.body?.es?.trim() ||
                  (typeof s.body === "string" && s.body.trim()) ||
                  s.images?.length ||
                  s.timer),
            )
          : [];
      const steps = (
        rawSteps.length > 0
          ? rawSteps
          : [
              {
                id: "s-1",
                body: { en: "Follow instructions", es: "Seguir instrucciones" },
              },
            ]
      ).map((s: any, idx: number) => normalizeStep(s, idx + 1));
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "method",
        steps,
      });
      continue;
    }

    if (block.kind === "recipe") {
      const rawIngredients = Array.isArray(block.ingredients)
        ? block.ingredients
        : [];
      const validIngredients = rawIngredients.filter(
        (ing: any) =>
          ing && typeof ing.name === "string" && ing.name.trim().length > 0,
      );

      let factors: number[] | undefined = undefined;
      let ingredients: any[] | undefined = undefined;

      if (validIngredients.length > 0) {
        factors =
          Array.isArray(block.factors) && block.factors.length > 0
            ? block.factors.map((f: any) =>
                Math.max(1, Math.round(Number(f) || 1)),
              )
            : [1];

        const fixed = normalizeIngredientAmounts(validIngredients, factors!);
        factors = fixed.factors;
        ingredients = fixed.ingredients;
      }

      let allergen = undefined;
      if (
        block.allergen &&
        Array.isArray(block.allergen.selectedAllergens) &&
        block.allergen.selectedAllergens.length > 0
      ) {
        const validChips = block.allergen.selectedAllergens.filter(
          (k: any) => typeof k === "string" && k.trim().length > 0,
        );
        if (validChips.length > 0) {
          allergen = {
            summary:
              (block.allergen.summary || "").trim() || "Contains allergens",
            detail:
              (block.allergen.detail || "").trim() ||
              "Please check ingredients list for allergen details",
            selectedAllergens: validChips,
          };
        }
      }

      const rawYield = Array.isArray(block.yieldItems) ? block.yieldItems : [];
      const yieldItems = rawYield
        .filter(
          (y: any) =>
            y &&
            typeof y.label === "string" &&
            y.label.trim().length > 0 &&
            typeof y.value === "string" &&
            y.value.trim().length > 0,
        )
        .map((y: any) => ({
          label: y.label.trim(),
          value: y.value.trim(),
          ...(y.unit?.trim() ? { unit: y.unit.trim() } : {}),
          ...(typeof y.scales === "boolean" ? { scales: y.scales } : {}),
        }));

      const rawSteps =
        Array.isArray(block.steps) && block.steps.length > 0
          ? block.steps.filter(
              (s: any) =>
                s &&
                (s.body?.en?.trim() ||
                  s.body?.es?.trim() ||
                  (typeof s.body === "string" && s.body.trim()) ||
                  s.images?.length ||
                  s.timer),
            )
          : [];
      const steps = (
        rawSteps.length > 0
          ? rawSteps
          : [
              {
                id: "s-1",
                body: {
                  en: "Prepare ingredients",
                  es: "Preparar ingredientes",
                },
              },
            ]
      ).map((s: any, idx: number) => normalizeStep(s, idx + 1));

      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "recipe",
        ...(block.audience?.trim() ? { audience: block.audience.trim() } : {}),
        ...(allergen ? { allergen } : {}),
        ...(yieldItems.length > 0 ? { yieldItems } : {}),
        ...(factors ? { factors } : {}),
        ...(ingredients ? { ingredients } : {}),
        steps,
      });
      continue;
    }

    if (block.kind === "ingredients") {
      const rawIngredients = Array.isArray(block.ingredients)
        ? block.ingredients
        : [];
      const validIngredients = rawIngredients.filter(
        (ing: any) =>
          ing && typeof ing.name === "string" && ing.name.trim().length > 0,
      );

      let factors: number[] | undefined = undefined;
      let ingredients: any[] | undefined = undefined;

      if (validIngredients.length > 0) {
        factors =
          Array.isArray(block.factors) && block.factors.length > 0
            ? block.factors.map((f: any) =>
                Math.max(1, Math.round(Number(f) || 1)),
              )
            : [1];

        const fixed = normalizeIngredientAmounts(validIngredients, factors!);
        factors = fixed.factors;
        ingredients = fixed.ingredients;
      }

      let allergen = undefined;
      if (
        block.allergen &&
        Array.isArray(block.allergen.selectedAllergens) &&
        block.allergen.selectedAllergens.length > 0
      ) {
        const validChips = block.allergen.selectedAllergens.filter(
          (k: any) => typeof k === "string" && k.trim().length > 0,
        );
        if (validChips.length > 0) {
          allergen = {
            summary:
              (block.allergen.summary || "").trim() || "Contains allergens",
            detail:
              (block.allergen.detail || "").trim() ||
              "Please check ingredients list for allergen details",
            selectedAllergens: validChips,
          };
        }
      }

      const rawYield = Array.isArray(block.yieldItems) ? block.yieldItems : [];
      const yieldItems = rawYield
        .filter(
          (y: any) =>
            y &&
            typeof y.label === "string" &&
            y.label.trim().length > 0 &&
            typeof y.value === "string" &&
            y.value.trim().length > 0,
        )
        .map((y: any) => ({
          label: y.label.trim(),
          value: y.value.trim(),
          ...(y.unit?.trim() ? { unit: y.unit.trim() } : {}),
          ...(typeof y.scales === "boolean" ? { scales: y.scales } : {}),
        }));

      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: "ingredients",
        ...(block.audience?.trim() ? { audience: block.audience.trim() } : {}),
        ...(allergen ? { allergen } : {}),
        ...(yieldItems.length > 0 ? { yieldItems } : {}),
        ...(factors ? { factors } : {}),
        ...(ingredients ? { ingredients } : {}),
      });
      continue;
    }
  }

  return normalized;
}

export function normalizeBackendProcedure(raw: any): Procedure {
  // The backend marks archived rows with `status: "archived"` (plus
  // `previousStatus`) and sends no `isArchived` boolean. Map that onto the
  // frontend's separate `isArchived` flag — otherwise archived procedures
  // fail the `statusFilter === 'archived'` branch (which checks isArchived)
  // and keep showing in the default list. Without this, archiving works API-
  // side but the Archived filter reads "0 of N".
  const archived = raw.isArchived ?? raw.status === "archived";
  const status =
    raw.status === "archived" ? (raw.previousStatus ?? "draft") : raw.status;
  // Backend shape is `stationIds: string[] | null` (multi-station). The
  // frontend's `stationId` stays the first id (single-station UI paths);
  // `stationIds` carries the full allocation.
  const stationIds: string[] = Array.isArray(raw.stationIds)
    ? raw.stationIds.filter((s: unknown): s is string => typeof s === "string")
    : raw.station?.id || raw.stationId
      ? [raw.station?.id || raw.stationId]
      : [];
  const normalizeBodyAmounts = (body: any): any => {
    if (!body || !Array.isArray(body.blocks)) return body;
    return {
      ...body,
      blocks: body.blocks.map((block: any) => {
        if (
          !block ||
          !["recipe", "ingredients"].includes(block.kind) ||
          !Array.isArray(block.ingredients)
        ) {
          return block;
        }
        const factors =
          Array.isArray(block.factors) && block.factors.length > 0
            ? block.factors
            : [1];
        return {
          ...block,
          ingredients: block.ingredients.map((ingredient: any) => {
            if (!Array.isArray(ingredient?.amounts)) return ingredient;
            const amounts = [...ingredient.amounts];
            const base =
              typeof amounts[0] === "string" ? amounts[0].trim() : "";
            // Older writes filled absent factor values with "1". Treat that
            // generated placeholder as missing so the recipe view can scale
            // from the base amount. Real factor values remain untouched.
            for (let i = 1; i < amounts.length; i += 1) {
              if (
                typeof amounts[i] === "string" &&
                amounts[i].trim() === "1" &&
                base !== "" &&
                base !== "1" &&
                (factors[i] ?? 1) > (factors[0] ?? 1)
              ) {
                amounts[i] = "";
              }
            }
            return { ...ingredient, amounts };
          }),
        };
      }),
    };
  };
  return {
    ...raw,
    bodyEn: normalizeBodyAmounts(raw.bodyEn),
    bodyEs: normalizeBodyAmounts(raw.bodyEs),
    status,
    stationIds,
    stationId: stationIds[0] ?? null,
    isDirectlyAssigned: Boolean(raw.isDirectlyAssigned),
    isStationProcedure: Boolean(raw.isStationProcedure),
    subcategoryId: raw.subcategory?.id ?? raw.subcategoryId ?? null,
    category: raw.category ?? null,
    stationScope:
      raw.stationScope ??
      (stationIds.length > 0 ? { mode: "specific", stationIds } : null),
    iconImageUrl: raw.iconImageUrl ?? raw.procedureImage ?? null,
    version: raw.version ?? 1,
    isArchived: archived,
    audience: raw.audience ?? null,
    protection: raw.protection ?? "standard",
    quizId: raw.quizId ?? null,
    linkedTrainingId: raw.linkedTrainingId ?? null,
    quizMode: raw.quizMode ?? "training",
  };
}
