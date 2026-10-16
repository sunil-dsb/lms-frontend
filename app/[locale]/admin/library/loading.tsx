import * as React from "react";
import { LibraryExplorerSkeleton } from "@/components/admin/library-explorer-skeleton";

export default function AdminLibraryLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-48 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
        <div className="h-tap-admin w-36 rounded-full bg-[var(--color-brand-600)]/40 animate-pulse" />
      </div>

      <LibraryExplorerSkeleton />
    </div>
  );
}
