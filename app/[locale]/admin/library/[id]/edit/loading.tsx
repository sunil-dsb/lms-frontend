import * as React from "react";
import { EditProcedureSkeleton } from "@/components/admin/edit-procedure-skeleton";

/** Skeleton shown while the edit page resolves the procedure on the
 *  server (client-side navigation to /admin/library/[id]/edit). */
export default function EditProcedureLoading(): React.ReactElement {
  return <EditProcedureSkeleton />;
}
