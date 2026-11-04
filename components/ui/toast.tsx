"use client";

import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";

export { toast } from "sonner";

export function Toaster(): React.ReactElement {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        className:
          "lms-toast font-medium text-xs shadow-e3 rounded-[var(--radius-lg)]",
        duration: 4000,
      }}
    />
  );
}
