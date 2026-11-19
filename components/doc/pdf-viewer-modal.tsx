"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuLoader,
} from "react-icons/lu";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ZoomStepper } from "@/components/ui/zoom-stepper";
import { cn } from "@/lib/utils";

// PDF.js parses in a Web worker; point it at the bundled worker asset.
// This must be configured in the same module that renders <Document>/<Page>
// — anywhere else and module execution order resets it to the default.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  meta?: React.ReactNode;
}

/**
 * Zoom moves in whole-number steps only — 1×…5× — where 1× means "fit the
 * whole sheet in the viewer" (fit-page), so text starts at a natural,
 * readable size instead of being blown up to fill the width. Decimal zoom
 * values (1.5×, 2.5×, …) do not work in this UI, so the control and the
 * scroll gesture only ever land on these.
 */
const ZOOM_STEPS = [1, 2, 3, 4, 5] as const;

/** Vertical gutter (px) around the sheet at 1× — matches the content
 *  column's py-4 padding. Scaling is height-driven: the page's height is
 *  set to the viewer's height (minus this gutter), and the width follows
 *  the page's own aspect ratio. */
const V_GUTTER = 32;
const MIN_PAGE_HEIGHT = 240;

/** Pixels of wheel travel that count as one zoom step, so a trackpad
 *  pinch or a mouse notch lands on one level instead of skipping past. */
const WHEEL_STEP_PX = 40;

export function PdfViewerModal({
  open,
  onClose,
  title,
  url,
  meta,
}: PdfViewerModalProps): React.ReactElement | null {
  const t = useTranslations("pdfViewer");
  const [numPages, setNumPages] = React.useState(0);
  const [zoomIdx, setZoomIdx] = React.useState(0);
  const [viewerHeight, setViewerHeight] = React.useState(0);
  const viewerRef = React.useRef<HTMLDivElement>(null);
  const zoomIdxRef = React.useRef(zoomIdx);
  zoomIdxRef.current = zoomIdx;

  // Track panning with cursor when zoomed in
  const [isPanning, setIsPanning] = React.useState(false);
  const panStartRef = React.useRef({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
    moved: false,
  });

  // Reset zoom on open or when URL changes
  React.useEffect(() => {
    if (open) {
      setZoomIdx(0);
    }
  }, [open, url]);

  /** Zoom to a specific index, maintaining the position under the cursor */
  const zoomAt = React.useCallback(
    (newIdx: number, clientX?: number, clientY?: number) => {
      const el = viewerRef.current;
      const clamped = Math.max(0, Math.min(ZOOM_STEPS.length - 1, newIdx));
      if (clamped === zoomIdxRef.current) return;

      if (el && clientX !== undefined && clientY !== undefined) {
        const rect = el.getBoundingClientRect();
        const cursorX = clientX - rect.left;
        const cursorY = clientY - rect.top;

        // Content scroll ratios before zoom
        const ratioX = (el.scrollLeft + cursorX) / (el.scrollWidth || 1);
        const ratioY = (el.scrollTop + cursorY) / (el.scrollHeight || 1);

        setZoomIdx(clamped);

        requestAnimationFrame(() => {
          if (!el) return;
          el.scrollLeft = ratioX * el.scrollWidth - cursorX;
          el.scrollTop = ratioY * el.scrollHeight - cursorY;
        });
      } else {
        setZoomIdx(clamped);
      }
    },
    [],
  );

  // Measure the scroll viewport and attach cursor wheel & gesture listeners
  React.useEffect(() => {
    const el = viewerRef.current;
    if (!open || !el) return;
    const ro = new ResizeObserver(() => setViewerHeight(el.clientHeight));
    ro.observe(el);

    // Scroll to zoom with mouse cursor (Ctrl/Cmd + Wheel or trackpad pinch).
    // Scrolling UP (dy < 0) zooms in; scrolling DOWN (dy > 0) zooms out.
    let wheelAcc = 0;
    const onWheel = (e: WheelEvent): void => {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;

      // Ctrl / Meta + Wheel OR Trackpad Pinch -> Instant Zoom under cursor.
      // Plain wheel scrolls the document naturally without unexpected zooming.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        wheelAcc += dy;
        // dy < 0 is wheel UP (zoom in), dy > 0 is wheel DOWN (zoom out)
        if (wheelAcc <= -WHEEL_STEP_PX) {
          wheelAcc = 0;
          zoomAt(zoomIdxRef.current + 1, e.clientX, e.clientY);
        } else if (wheelAcc >= WHEEL_STEP_PX) {
          wheelAcc = 0;
          zoomAt(zoomIdxRef.current - 1, e.clientX, e.clientY);
        }
        return;
      }

      // Normal wheel scrolling does not zoom
      wheelAcc = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    // Touch gesture pinch on iOS/WebKit
    let gestureScale = 1;
    const onGestureStart = (e: Event): void => {
      e.preventDefault();
      gestureScale = 1;
    };
    const onGestureChange = (e: Event): void => {
      e.preventDefault();
      const scale =
        typeof (e as Event & { scale?: number }).scale === "number"
          ? (e as Event & { scale: number }).scale
          : 1;
      if (scale >= gestureScale * 1.25) {
        gestureScale = scale;
        zoomAt(zoomIdxRef.current + 1);
      } else if (scale <= gestureScale * 0.8) {
        gestureScale = scale;
        zoomAt(zoomIdxRef.current - 1);
      }
    };
    el.addEventListener("gesturestart", onGestureStart, { passive: false });
    el.addEventListener("gesturechange", onGestureChange, { passive: false });

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [open, zoomAt]);

  // Double-click with cursor to zoom in / cycle zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (zoomIdxRef.current === 0) {
      zoomAt(1, e.clientX, e.clientY);
    } else if (zoomIdxRef.current < 2) {
      zoomAt(2, e.clientX, e.clientY);
    } else {
      zoomAt(0);
    }
  };

  // Cursor drag-to-pan when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const el = viewerRef.current;
    if (!el) return;

    // Only pan if content is scrollable or zoomed in
    const isScrollable =
      el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    if (!isScrollable && zoomIdx === 0) return;

    // If clicking selectable text, don't hijack selection
    const target = e.target as HTMLElement;
    if (target.closest(".react-pdf__Page__textContent")) {
      return;
    }

    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      moved: false,
    };
    setIsPanning(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const el = viewerRef.current;
    if (!el) return;
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      panStartRef.current.moved = true;
    }
    el.scrollLeft = panStartRef.current.scrollLeft - dx;
    el.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  if (!open || !url) return null;

  const step = ZOOM_STEPS[zoomIdx];
  const pageHeight = Math.max(
    MIN_PAGE_HEIGHT,
    Math.floor((viewerHeight - V_GUTTER) * step),
  );

  const actionLink = "min-h-10";

  return (
    <Modal open={open} onClose={onClose} size="2xl" fullHeight>
      {/* Header comes from the shared ModalHeader, so the dialog's name is
          wired to the h2 by Modal itself (aria-labelledby) instead of each
          call site remembering to. On narrow screens the controls wrap to
          their own row beneath the title. */}
      <ModalHeader
        title={title || t("document")}
        description={meta}
        onClose={onClose}
        closeLabel={t("close")}
        actions={
          <>
            <ZoomStepper
              label={t("zoom")}
              value={`${step}×`}
              decreaseDisabled={zoomIdx === 0}
              increaseDisabled={zoomIdx === ZOOM_STEPS.length - 1}
              onDecrease={() => zoomAt(zoomIdx - 1)}
              onIncrease={() => zoomAt(zoomIdx + 1)}
              decreaseLabel={t("zoomOut")}
              increaseLabel={t("zoomIn")}
            />

            {/* Download — the header's only file action. "Open in a new
                tab" did the same thing, so it's gone (it survives on the
                error state below, as the way out when the PDF won't
                render). aria-label keeps the link named when its word is
                hidden on small screens. */}
            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("download")}
              title={t("download")}
              className={buttonClassName({
                variant: "primary",
                size: "sm",
                className: actionLink,
              })}
            >
              <LuDownload aria-hidden="true" />
              <span aria-hidden="true" className="hidden sm:inline">
                {t("download")}
              </span>
            </a>
          </>
        }
      />

      {/* Viewer — white sheets on the app's light wash background, rendered
          by PDF.js. No browser PDF chrome, no dark surround, same look in
          every browser. Double-click to zoom; Ctrl+Wheel / pinch to zoom
          centered on cursor; click-and-drag to pan when zoomed in. */}
      <div
        ref={viewerRef}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          "relative flex-1 w-full min-h-0 overflow-auto bg-wash select-none transition-colors",
          step > 1
            ? isPanning
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-default",
        )}
      >
        <Document
          file={url}
          suspense={false}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex min-h-[240px] w-full flex-col items-center justify-center gap-2">
              <LuLoader
                aria-hidden="true"
                className="size-6 animate-spin text-brand-600"
              />
              <span className="text-sm text-ink-2">{t("loading")}</span>
            </div>
          }
          error={
            <div className="flex min-h-[240px] w-full items-center justify-center px-6">
              <EmptyState
                compact
                icon={LuFileText}
                title={t("failed")}
                action={
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    <LuExternalLink aria-hidden="true" />
                    {t("openNewTab")}
                  </a>
                }
              />
            </div>
          }
          className="flex w-max min-w-full flex-col items-center gap-4 px-3 py-4"
        >
          {viewerHeight > 0
            ? Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  // A page's pixels are baked white, so dark mode dims the
                  // sheet a step (var(--paper-dim) in foundation.css) instead
                  // of inverting photographs and colour charts along with it.
                  style={{ filter: "var(--paper-dim, none)" }}
                >
                  {/* bg-white is intentional: the sheet is paper. */}
                  <Page
                    pageNumber={n}
                    height={pageHeight}
                    className="border border-line-2 bg-white"
                  />
                </div>
              ))
            : null}
        </Document>
      </div>
    </Modal>
  );
}
