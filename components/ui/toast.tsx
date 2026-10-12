'use client';

import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export { toast } from 'sonner';

export function Toaster(): React.ReactElement {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        // Sonner hangs the close button off the toast's top-left corner in
        // LTR: [data-close-button] reads left/right/transform from the
        // --toast-close-button-* vars set on [dir=ltr]. Setting the same
        // vars on the toast itself wins for its subtree (the button), so
        // mirroring them moves the cross to the opposite (top-right) corner
        // with the same half-outside offset — no sonner CSS fork needed.
        className:
          'font-medium text-xs shadow-e3 rounded-[var(--radius-lg)] [--toast-close-button-start:unset] [--toast-close-button-end:0] [--toast-close-button-transform:translate(35%,-35%)]',
        duration: 4000,
      }}
    />
  );
}
