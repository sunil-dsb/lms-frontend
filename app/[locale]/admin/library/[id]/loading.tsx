import * as React from "react";
import { AdminProcedureDetailSkeleton } from "@/components/admin/admin-procedure-detail-skeleton";

/**
 * Skeleton for the admin procedure detail route
 * (`/admin/library/[id]`). Without this file Next.js falls back to the
 * parent `admin/library/loading.tsx` — the explorer list skeleton with
 * chip rail + rows — which is why opening a procedure flashed the list
 * shape before the article landed. This mirrors the article frame
 * instead (chrome bar, head, allergen, yield) so the swap is a fade.
 */
export default function AdminLibraryDetailLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-doc space-y-6 pb-12">
      <AdminProcedureDetailSkeleton />
    </div>
  );
}
