"use client";

import * as React from "react";
import { toast } from "@/components/ui/toast";

export interface ContentProtectionProps {
  children: React.ReactNode;
  /** Name of the viewer for compliance records */
  employeeName?: string;
  /** Identifier or code of the employee */
  employeeCode?: string;
  /** UI language ('en' | 'es') */
  locale?: string;
  /** Master toggle to turn protection on or off (defaults to true) */
  enabled?: boolean;
  /** Prevent copying, cutting, drag-and-drop, and right-click (defaults to true) */
  enableCopyProtection?: boolean;
  /** Prevent printing (defaults to true) */
  enablePrintProtection?: boolean;
  /** Optional custom class name for the wrapper */
  className?: string;
}

/**
 * ContentProtection provides clean content security:
 *
 * 1. Anti-Copy & Anti-Selection: Blocks text selection, right-click context menu,
 *    Ctrl+C / Cmd+C copying, cut, text dragging, and DevTools shortcuts.
 * 2. Anti-Print Shield: Hides recipe and course content if browser print (Ctrl+P)
 *    is triggered, displaying a compliance notice instead.
 * 3. 100% Clean UI: No background watermarks, no blur overlays, and no interruptions
 *    when switching tabs or hovering.
 */
export function ContentProtection({
  children,
  employeeName = "",
  locale = "en",
  enabled = true,
  enableCopyProtection = true,
  enablePrintProtection = true,
  className = "",
}: ContentProtectionProps): React.ReactElement {
  const isEs = locale === "es";
  const lastToastTime = React.useRef(0);

  const showSecurityToast = React.useCallback((message: string) => {
    const now = Date.now();
    if (now - lastToastTime.current > 3000) {
      lastToastTime.current = now;
      toast.error(message, { duration: 3000 });
    }
  }, []);

  // Keyboard shortcuts interceptor (Ctrl+C, Ctrl+P, Ctrl+U, PrintScreen, F12)
  React.useEffect(() => {
    if (!enabled || !enableCopyProtection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. Prevent PrintScreen & Wipe Clipboard
      if (e.key === "PrintScreen") {
        e.preventDefault();
        try {
          if (navigator.clipboard) {
            navigator.clipboard.writeText("");
          }
        } catch {
          // Ignore clipboard permission issues
        }
        showSecurityToast(
          isEs
            ? "Capturas de pantalla restringidas por política de seguridad."
            : "Screenshots restricted by security policy.",
        );
        return;
      }

      // 2. Prevent Copy (Ctrl+C / Cmd+C)
      if (isCtrlOrMeta && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        showSecurityToast(
          isEs
            ? "La copia de procedimientos está deshabilitada."
            : "Copying procedures and recipes is disabled.",
        );
        return;
      }

      // 3. Prevent Print (Ctrl+P / Cmd+P)
      if (
        enablePrintProtection &&
        isCtrlOrMeta &&
        (e.key === "p" || e.key === "P")
      ) {
        e.preventDefault();
        showSecurityToast(
          isEs
            ? "La impresión de recetas está restringida."
            : "Printing recipes is restricted.",
        );
        return;
      }

      // 4. Prevent Save Webpage (Ctrl+S / Cmd+S)
      if (isCtrlOrMeta && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        return;
      }

      // 5. Prevent View Source (Ctrl+U / Cmd+U)
      if (isCtrlOrMeta && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        return;
      }

      // 6. Block Developer Tools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      if (
        e.key === "F12" ||
        (isCtrlOrMeta &&
          e.shiftKey &&
          (e.key === "I" ||
            e.key === "i" ||
            e.key === "C" ||
            e.key === "c" ||
            e.key === "J" ||
            e.key === "j"))
      ) {
        e.preventDefault();
        return;
      }
    };

    // Wipe clipboard on keyup if PrintScreen was released
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        try {
          if (navigator.clipboard) {
            navigator.clipboard.writeText("");
          }
        } catch {}
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [
    enabled,
    enableCopyProtection,
    enablePrintProtection,
    isEs,
    showSecurityToast,
  ]);

  // Context Menu & Copy/Cut event listeners
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!enabled || !enableCopyProtection) return;
    e.preventDefault();
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    if (!enabled || !enableCopyProtection) return;
    e.preventDefault();
    if (e.clipboardData) {
      e.clipboardData.setData(
        "text/plain",
        "Proprietary content. Copying is disabled.",
      );
    }
    showSecurityToast(
      isEs
        ? "La copia de procedimientos está deshabilitada."
        : "Copying procedures and recipes is disabled.",
    );
  };

  const handleCut = (e: React.ClipboardEvent) => {
    if (!enabled || !enableCopyProtection) return;
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!enabled || !enableCopyProtection) return;
    e.preventDefault();
  };

  if (!enabled) {
    return <>{children}</>;
  }

  const currentDateStr = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
      onCut={handleCut}
      onDragStart={handleDragStart}
      className={`relative content-protected ${className}`}
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* =====================================================================
          PRINT BLOCK SHIELD (Visible only when user triggers browser print)
          ===================================================================== */}
      {enablePrintProtection ? (
        <div className="hidden print-shield-warning print:flex fixed inset-0 z-[9999] bg-white text-black p-12 flex-col items-center justify-center text-center">
          <div className="max-w-md border-2 border-black p-8 rounded-lg space-y-4">
            <h1 className="text-xl font-black uppercase tracking-tight">
              {isEs ? "Documento Protegido" : "Protected Document"}
            </h1>
            <p className="text-sm font-medium">
              {isEs
                ? "Este material de procedimiento y receta es propiedad exclusiva de Alimentaria. La impresión o exportación a PDF está estrictamente prohibida por política corporativa."
                : "This procedure and recipe material is proprietary to Alimentaria. Printing or exporting to PDF is strictly prohibited by corporate security policy."}
            </p>
            <div className="pt-4 border-t border-gray-400 text-xs text-gray-700">
              {employeeName ? (
                <p>
                  <strong>{isEs ? "Usuario:" : "User:"}</strong> {employeeName}
                </p>
              ) : null}
              <p>
                <strong>{isEs ? "Fecha:" : "Timestamp:"}</strong>{" "}
                {currentDateStr}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          PAGE CONTENT (Always clean, crisp and normal)
          ===================================================================== */}
      <div className="print-shield-hidden">{children}</div>
    </div>
  );
}
