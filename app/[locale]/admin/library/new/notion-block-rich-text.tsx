"use client";

import * as React from "react";
import { BilingualRichTextEditor } from "@/components/editor/bilingual-rich-text-editor";
import type { ProcedureBlock } from "@/lib/types";
import type { BodyProps } from "./notion-block-shared";

export function RichTextBody({
  block,
  onPatch,
}: BodyProps<
  Extract<ProcedureBlock, { kind: "rich_text" }>
>): React.ReactElement {
  return <BilingualRichTextEditor block={block} onPatch={onPatch} />;
}
