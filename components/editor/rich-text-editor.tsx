"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  LuBold,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuStrikethrough,
  LuUnderline,
} from "react-icons/lu";
import type { JSONContent } from "@tiptap/react";
import type { RichTextDocument } from "@/lib/types";

const extensions = [
  StarterKit.configure({ link: false }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ["mailto", "tel"],
    isAllowedUri: (url, ctx) => ctx.defaultValidate(url),
  }),
];

const allowedTags = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "u",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "hr",
]);

function cleanPastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed
    .querySelectorAll("script,style,meta,link,iframe,object,svg,math,xml")
    .forEach((node) => node.remove());
  for (const node of Array.from(parsed.body.querySelectorAll("*"))) {
    const style = node.getAttribute("style")?.toLowerCase() ?? "";
    if (node.tagName === "SPAN") {
      const replacement = parsed.createElement(
        /font-weight\s*:\s*(bold|[6-9]00)/.test(style)
          ? "strong"
          : /font-style\s*:\s*italic/.test(style)
            ? "em"
            : /text-decoration[^;]*underline/.test(style)
              ? "u"
              : "span",
      );
      replacement.append(...Array.from(node.childNodes));
      if (replacement.tagName !== "SPAN") node.replaceWith(replacement);
      else node.replaceWith(...Array.from(replacement.childNodes));
      continue;
    }
    if (!allowedTags.has(node.tagName.toLowerCase())) {
      node.replaceWith(...Array.from(node.childNodes));
      continue;
    }
    for (const attr of Array.from(node.attributes)) {
      if (node.tagName === "A" && attr.name === "href") {
        try {
          const url = new URL(attr.value, window.location.origin);
          if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol))
            node.removeAttribute("href");
        } catch {
          node.removeAttribute("href");
        }
      } else {
        node.removeAttribute(attr.name);
      }
    }
  }
  return parsed.body.innerHTML;
}

function safeInitialContent(value?: RichTextDocument): JSONContent {
  const allowedNodes = new Set([
    "doc",
    "paragraph",
    "text",
    "heading",
    "hardBreak",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "horizontalRule",
  ]);
  const allowedMarks = new Set([
    "bold",
    "italic",
    "strike",
    "underline",
    "link",
  ]);
  const safeUrl = (href: unknown): string | undefined => {
    if (typeof href !== "string") return undefined;
    try {
      const protocol = new URL(href, "https://lms.invalid").protocol;
      return ["http:", "https:", "mailto:", "tel:"].includes(protocol)
        ? href
        : undefined;
    } catch {
      return undefined;
    }
  };
  const cleanNode = (node: unknown): JSONContent | null => {
    if (
      !node ||
      typeof node !== "object" ||
      !("type" in node) ||
      typeof node.type !== "string" ||
      !allowedNodes.has(node.type)
    )
      return null;
    const raw = node as RichTextDocument["content"][number];
    const result: JSONContent = { type: raw.type };
    if (raw.type === "text" && typeof raw.text === "string")
      result.text = raw.text;
    if (raw.type === "heading") {
      const level = raw.attrs?.level;
      result.attrs = {
        level:
          typeof level === "number" && [1, 2, 3].includes(level) ? level : 2,
      };
    } else if (
      raw.type === "orderedList" &&
      typeof raw.attrs?.start === "number"
    ) {
      result.attrs = { start: raw.attrs.start };
    }
    if (Array.isArray(raw.content))
      result.content = raw.content
        .map(cleanNode)
        .filter((child): child is JSONContent => child !== null);
    if (Array.isArray(raw.marks)) {
      result.marks = raw.marks.flatMap((mark) => {
        if (!allowedMarks.has(mark.type)) return [];
        if (mark.type === "link") {
          const href = safeUrl(mark.attrs?.href);
          return href ? [{ type: "link", attrs: { href } }] : [];
        }
        return [{ type: mark.type }];
      });
    }
    return result;
  };
  const safe = cleanNode(
    value ?? { type: "doc", content: [{ type: "paragraph" }] },
  );
  return safe?.type === "doc"
    ? safe
    : { type: "doc", content: [{ type: "paragraph" }] };
}

interface RichTextEditorProps {
  value?: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
  label: string;
  minHeight?: number;
  embedded?: boolean;
  onFocus?: () => void;
}

export function RichTextEditor({
  value,
  onChange,
  label,
  minHeight = 130,
  embedded = false,
  onFocus,
}: RichTextEditorProps): React.ReactElement {
  const linkId = React.useId();
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkHref, setLinkHref] = React.useState("");
  const [linkError, setLinkError] = React.useState("");
  const linkInputRef = React.useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions,
    content: safeInitialContent(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": label,
        class: "rich-text-prose focus:outline-none",
      },
      transformPastedHTML: cleanPastedHtml,
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.getJSON() as RichTextDocument),
  });

  React.useEffect(() => {
    if (
      editor &&
      value &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(value)
    ) {
      editor.commands.setContent(safeInitialContent(value), {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  React.useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  if (!editor)
    return (
      <div className="min-h-32 animate-pulse rounded-lg bg-[var(--color-wash)]" />
    );
  const activeEditor = editor;

  const buttons = [
    {
      label: "Bold",
      icon: LuBold,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: LuItalic,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Strikethrough",
      icon: LuStrikethrough,
      active: editor.isActive("strike"),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Underline",
      icon: LuUnderline,
      active: editor.isActive("underline"),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Heading 1",
      icon: LuHeading1,
      active: editor.isActive("heading", { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      icon: LuHeading2,
      active: editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Heading 3",
      icon: LuHeading3,
      active: editor.isActive("heading", { level: 3 }),
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bulleted list",
      icon: LuList,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: LuListOrdered,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  function openLinkEditor(): void {
    setLinkHref(
      (activeEditor.getAttributes("link").href as string | undefined) ?? "",
    );
    setLinkError("");
    setLinkOpen((open) => !open);
  }

  function applyLink(): void {
    const href = linkHref.trim();
    if (!href) {
      setLinkError("Enter a link address.");
      return;
    }
    try {
      const protocol = new URL(href, window.location.origin).protocol;
      if (!["http:", "https:", "mailto:", "tel:"].includes(protocol))
        throw new Error("Unsupported link type");
    } catch {
      setLinkError("Enter a valid web, email, or phone link.");
      return;
    }
    activeEditor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
    setLinkOpen(false);
  }

  function removeLink(): void {
    activeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  return (
    <div
      onFocusCapture={onFocus}
      className={
        embedded
          ? "rich-text-embedded h-full"
          : "overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]"
      }
    >
      <div
        aria-label="Text formatting"
        className={`flex flex-wrap gap-1 border-b border-[var(--color-line)] ${embedded ? "px-1 py-0.5" : "p-2"}`}
      >
        {buttons.map(({ label: buttonLabel, icon: Icon, active, run }) => (
          <button
            key={buttonLabel}
            aria-label={buttonLabel}
            aria-pressed={active}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={run}
            className={`inline-flex ${embedded ? "size-6" : "size-9"} items-center justify-center rounded-md ${active ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]" : "text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]"}`}
          >
            <Icon aria-hidden="true" />
          </button>
        ))}
        <button
          aria-label="Link"
          aria-pressed={editor.isActive("link")}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openLinkEditor}
          className={`inline-flex ${embedded ? "size-6" : "size-9"} items-center justify-center rounded-md ${editor.isActive("link") || linkOpen ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]" : "text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]"}`}
        >
          <LuLink aria-hidden="true" />
        </button>
      </div>
      {linkOpen ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
          className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-wash)] p-2"
        >
          <label htmlFor={linkId} className="sr-only">
            Link address
          </label>
          <input
            ref={linkInputRef}
            id={linkId}
            type="text"
            value={linkHref}
            onChange={(event) => {
              setLinkHref(event.target.value);
              setLinkError("");
            }}
            placeholder="https://example.com"
            className="min-w-0 flex-1 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-600)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Apply
          </button>
          {editor.isActive("link") ? (
            <button
              type="button"
              onClick={removeLink}
              className="rounded-full border border-[var(--color-line-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-2)]"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="rounded-full px-2 py-1.5 text-xs font-semibold text-[var(--color-ink-2)]"
          >
            Cancel
          </button>
          {linkError ? (
            <span
              role="alert"
              className="w-full text-xs text-[var(--color-bad)]"
            >
              {linkError}
            </span>
          ) : null}
        </form>
      ) : null}
      <EditorContent
        editor={editor}
        style={{ minHeight: embedded ? undefined : minHeight }}
        className={`${embedded ? "p-2" : "p-3"} text-sm text-[var(--color-ink)]`}
      />
    </div>
  );
}

export function RichTextContent({
  value,
}: {
  value: RichTextDocument;
}): React.ReactElement {
  const editor = useEditor({
    extensions,
    content: safeInitialContent(value),
    editable: false,
    immediatelyRender: false,
  });
  React.useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value))
      editor.commands.setContent(safeInitialContent(value), {
        emitUpdate: false,
      });
  }, [editor, value]);
  return (
    <EditorContent
      editor={editor}
      className="rich-text-content text-sm leading-7 text-[var(--color-ink)]"
    />
  );
}
