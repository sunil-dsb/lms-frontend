"use client";

import * as React from "react";
import { useState } from "react";
import { RichTextEditor } from "./rich-text-editor";
import type { ProcedureBlock } from "@/lib/types";

export function BilingualRichTextEditor({
  block,
  onPatch,
}: {
  block: Extract<ProcedureBlock, { kind: "rich_text" }>;
  onPatch: (block: Extract<ProcedureBlock, { kind: "rich_text" }>) => void;
}): React.ReactElement {
  const [activeLanguage, setActiveLanguage] = useState<"en" | "es">("en");
  return (
    <div
      className="bli bli--rich-text"
      role="group"
      aria-label="Bilingual rich text"
    >
      <div className="bli__fields">
        {(["en", "es"] as const).map((language) => {
          const active = activeLanguage === language;
          return (
            <div
              key={language}
              className={`bli__field is-multiline ${active ? "is-active" : "is-inactive"}`}
              aria-label={
                language === "en" ? "English content" : "Contenido en español"
              }
              onClick={() => setActiveLanguage(language)}
            >
              <span
                className="bli__tag notranslate"
                translate="no"
                aria-hidden="true"
              >
                {language.toUpperCase()}
              </span>
              <RichTextEditor
                embedded
                minHeight={active ? 104 : 44}
                label={
                  language === "en"
                    ? "Rich text in English"
                    : "Texto enriquecido en español"
                }
                value={block.body[language]}
                onFocus={() => setActiveLanguage(language)}
                onChange={(value) =>
                  onPatch({
                    ...block,
                    body: { ...block.body, [language]: value },
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
