"use client";

import * as React from "react";
import { TextBody, HeadingBody } from "./notion-block-text";
import { MethodBody } from "./notion-block-method";
import {
  ImageBody,
  VideoBody,
  WarningBody,
  AttachmentBody,
} from "./notion-block-media";
import { TableBody, ChecklistBody } from "./notion-block-tables";
import { IngredientsBlockBody } from "./ingredients-block-body";
import { LinkedProceduresBody } from "./notion-block-linked-procedures";
import { RichTextBody } from "./notion-block-rich-text";
import type { ProcedureBlock, ProcedureBlockKind } from "@/lib/types";

export type BodyProps<T extends ProcedureBlock> = {
  block: T;
  onPatch: (next: T) => void;
};

export function BlockBody({
  block,
  onPatch,
  onInsertAfter,
}: {
  block: ProcedureBlock;
  onPatch: (next: ProcedureBlock) => void;
  onInsertAfter?: (kind: ProcedureBlockKind) => void;
}): React.ReactElement {
  switch (block.kind) {
    case "text":
      return (
        <TextBody
          block={block}
          onPatch={onPatch}
          onInsertAfter={onInsertAfter}
        />
      );
    case "rich_text":
      return <RichTextBody block={block} onPatch={onPatch as never} />;
    case "heading":
      return <HeadingBody block={block} onPatch={onPatch as never} />;
    case "method":
      return <MethodBody block={block} onPatch={onPatch as never} />;
    case "ingredients":
      return <IngredientsBlockBody block={block} onPatch={onPatch as never} />;
    case "recipe":
      return (
        <MethodBody
          block={{ ...block, kind: "method", steps: block.steps }}
          onPatch={onPatch as never}
        />
      );
    case "image":
      return <ImageBody block={block} onPatch={onPatch as never} />;
    case "video":
      return <VideoBody block={block} onPatch={onPatch as never} />;
    case "warning":
      return <WarningBody block={block} onPatch={onPatch as never} />;
    case "attachment":
      return <AttachmentBody block={block} onPatch={onPatch as never} />;
    case "table":
      return <TableBody block={block} onPatch={onPatch as never} />;
    case "checklist":
      return <ChecklistBody block={block} onPatch={onPatch as never} />;
    case "linked_procedures":
      return <LinkedProceduresBody block={block} onPatch={onPatch as never} />;
    default:
      return <></>;
  }
}
