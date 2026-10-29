"use client";

import * as React from "react";
import { BilingualRichTextEditor } from "@/components/editor/bilingual-rich-text-editor";
import type { ProcedureBlock } from "@/lib/types";
import type { BodyProps } from "./notion-block-shared";

/** Default word cap for the rich text editor (per language). */
export const RICH_TEXT_MAX_WORDS = 10000;

export function RichTextBody({
  block,
  onPatch,
}: BodyProps<
  Extract<ProcedureBlock, { kind: "rich_text" }>
>): React.ReactElement {
  return (
    <BilingualRichTextEditor
      block={block}
      onPatch={onPatch}
      maxWords={RICH_TEXT_MAX_WORDS}
    />
  );
}
