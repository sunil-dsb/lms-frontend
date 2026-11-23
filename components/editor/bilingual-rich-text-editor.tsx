"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { useLocale } from "next-intl";
import { RichTextEditor, isRichTextDocEmpty } from "./rich-text-editor";
import { translateViaServer } from "@/lib/translate-api";
import type { ProcedureBlock, RichTextDocument } from "@/lib/types";

async function translateRichTextDoc(
  doc: RichTextDocument,
  from: "en" | "es",
  to: "en" | "es",
  signal?: AbortSignal,
): Promise<RichTextDocument> {
  if (isRichTextDocEmpty(doc)) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const cloned: RichTextDocument = JSON.parse(JSON.stringify(doc));
  const textNodes: Array<{ text: string }> = [];

  function collect(nodes: any[]) {
    for (const n of nodes) {
      if (n.type === "text" && typeof n.text === "string" && n.text.trim()) {
        textNodes.push(n);
      }
      if (Array.isArray(n.content)) {
        collect(n.content);
      }
    }
  }
  collect(cloned.content);

  if (textNodes.length === 0) return cloned;

  if (textNodes.length === 1) {
    try {
      const res = await translateViaServer(textNodes[0].text, from, to, signal);
      if (res && res.trim()) {
        textNodes[0].text = res.trim();
      }
    } catch {
      // Keep original on failure
    }
    return cloned;
  }

  const SEP = "\n---LMS_SEP---\n";
  const joined = textNodes.map((n) => n.text).join(SEP);
  try {
    const res = await translateViaServer(joined, from, to, signal);
    const parts = res.split(SEP);
    if (parts.length === textNodes.length) {
      for (let i = 0; i < textNodes.length; i++) {
        textNodes[i].text = parts[i].trim();
      }
    } else {
      const lines = res
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.includes("---LMS_SEP---"));
      if (lines.length === textNodes.length) {
        for (let i = 0; i < textNodes.length; i++) {
          textNodes[i].text = lines[i];
        }
      }
    }
  } catch {
    // Keep original on failure
  }

  return cloned;
}

export function BilingualRichTextEditor({
  block,
  onPatch,
  maxWords,
}: {
  block: Extract<ProcedureBlock, { kind: "rich_text" }>;
  onPatch: (block: Extract<ProcedureBlock, { kind: "rich_text" }>) => void;
  maxWords?: number;
}): React.ReactElement {
  const locale = useLocale();
  const [activeLanguage, setActiveLanguage] = useState<"en" | "es">("en");
  const userEditedRef = useRef<Record<"en" | "es", boolean>>({
    en: false,
    es: false,
  });
  const [translatingTarget, setTranslatingTarget] = useState<
    "en" | "es" | null
  >(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const blockRef = useRef(block);
  blockRef.current = block;

  const triggerTranslation = useCallback(
    (sourceLang: "en" | "es", sourceDoc: RichTextDocument) => {
      const targetLang = sourceLang === "en" ? "es" : "en";

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // If user manually edited target side and it's not empty, do not overwrite
      const currentTargetDoc = blockRef.current?.body?.[targetLang];
      if (
        userEditedRef.current[targetLang] &&
        !isRichTextDocEmpty(currentTargetDoc)
      ) {
        return;
      }

      if (isRichTextDocEmpty(sourceDoc)) {
        return;
      }

      debounceTimerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setTranslatingTarget(targetLang);

        try {
          const translated = await translateRichTextDoc(
            sourceDoc,
            sourceLang,
            targetLang,
            controller.signal,
          );

          if (!controller.signal.aborted) {
            onPatch({
              ...blockRef.current,
              body: {
                ...blockRef.current.body,
                [targetLang]: translated,
              },
            });
          }
        } catch {
          // ignore
        } finally {
          if (!controller.signal.aborted) {
            setTranslatingTarget(null);
          }
        }
      }, 800);
    },
    [onPatch],
  );

  const handleEditorChange = (lang: "en" | "es", value: RichTextDocument) => {
    userEditedRef.current[lang] = true;
    onPatch({
      ...block,
      body: { ...block.body, [lang]: value },
    });
    triggerTranslation(lang, value);
  };

  return (
    <div
      className="bli bli--rich-text"
      role="group"
      aria-label="Bilingual rich text"
    >
      <div className="bli__fields">
        {(["en", "es"] as const).map((language) => {
          const active = activeLanguage === language;
          const currentDoc = block.body?.[language] ?? {
            type: "doc",
            content: [{ type: "paragraph" }],
          };

          return (
            <div
              key={language}
              className={`bli__field is-multiline ${active ? "is-active" : "is-inactive"}`}
              aria-label={
                language === "en" ? "English content" : "Contenido en español"
              }
              onClick={() => setActiveLanguage(language)}
            >
              <RichTextEditor
                embedded
                active={active}
                minHeight={active ? 104 : 44}
                label={
                  language === "en"
                    ? "Rich text in English"
                    : "Texto enriquecido en español"
                }
                value={currentDoc}
                maxWords={maxWords}
                onFocus={() => setActiveLanguage(language)}
                onChange={(value) => handleEditorChange(language, value)}
              />
              <span
                className="bli__tag notranslate"
                translate="no"
                aria-hidden="true"
              >
                {language.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {translatingTarget !== null && (
        <span className="bli__status" role="status" aria-live="polite">
          <span>{locale === "es" ? "Traduciendo…" : "Translating…"}</span>
        </span>
      )}
    </div>
  );
}
