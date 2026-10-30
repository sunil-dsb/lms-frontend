import * as React from "react";
import { CourseDetailSkeleton } from "@/components/admin/training-courses-skeleton";

export default function AdminCourseDetailLoading(): React.ReactElement {
  return (
    <div className="pt-12 lg:pt-0">
      <CourseDetailSkeleton sidebarOffsetPx={280} />
    </div>
  );
}
