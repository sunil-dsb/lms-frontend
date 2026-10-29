"use client";

import * as React from "react";
import type { Procedure, TrainingAssignment } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { getQuizById } from "@/lib/api";
import type { MockEmployee } from "@/lib/mock-training";
import type { CourseAssignmentRow } from "@/services/courses/types";
import { getChapterDefinitions } from "@/lib/course-chapters-data";
import { fetchCourseById } from "@/services/courses/api";
import type { BackendCourse } from "@/services/courses/types";
import { fetchStations } from "@/services/stations/api";
import {
  assignCourse,
  fetchAssignableEmployees,
  fetchCourseAssignments,
} from "@/lib/api/training";
import {
  AssignMainModalView,
  type AssignScope,
} from "./assign-main-modal-view";
import { AssignPeopleModalView } from "./assign-people-modal-view";

interface CourseAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  locale: string;
  course: Procedure | null;
  onAssigned?: (countAssigned: number) => void;
}

type ModalView = "main" | "people";

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function getPresetDate(preset: "1week" | "2weeks" | "endOfMonth"): string {
  const d = new Date();
  if (preset === "1week") {
    d.setDate(d.getDate() + 7);
  } else if (preset === "2weeks") {
    d.setDate(d.getDate() + 14);
  } else if (preset === "endOfMonth") {
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
  }
  return d.toISOString().slice(0, 10);
}

export function CourseAssignmentModal({
  open,
  onClose,
  locale,
  course,
  onAssigned,
}: CourseAssignmentModalProps): React.ReactElement | null {
  // Modal Views: "main" (Image 1) or "people" (Image 2)
  const [view, setView] = React.useState<ModalView>("main");

  // API Data States
  const [employees, setEmployees] = React.useState<MockEmployee[]>([]);
  const [dbStations, setDbStations] = React.useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = React.useState<
    CourseAssignmentRow[]
  >([]);
  const [courseDetail, setCourseDetail] = React.useState<BackendCourse | null>(
    null,
  );
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  // Main modal state
  const [scope, setScope] = React.useState<AssignScope>("everyone");
  const [selectedStations, setSelectedStations] = React.useState<Set<string>>(
    new Set(),
  );

  // People modal state
  const [selectedPeopleIds, setSelectedPeopleIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [peopleSearch, setPeopleSearch] = React.useState("");
  const [stationFilter, setStationFilter] = React.useState<string>("all");

  // Due date & submission
  const [dueAt, setDueAt] = React.useState<string>(defaultDueDate());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Available unique stations from backend stations API and active employees
  const availableStations = React.useMemo(() => {
    const set = new Set<string>(dbStations);
    for (const e of employees) {
      if (e.stations && Array.isArray(e.stations)) {
        e.stations.forEach((s) => set.add(s));
      } else if (e.station) {
        set.add(e.station);
      }
    }
    return Array.from(set).filter(
      (st) => Boolean(st) && st.toLowerCase() !== "saucier",
    );
  }, [dbStations, employees]);

  // Load API data whenever modal opens
  React.useEffect(() => {
    if (!open || !course) return;

    let isMounted = true;
    setIsLoadingData(true);

    Promise.all([
      fetchAssignableEmployees(),
      fetchCourseAssignments(course.id),
      fetchCourseById(course.id).catch(() => null),
      fetchStations().catch(() => ({ stations: [] })),
    ])
      .then(([empRes, assignRes, detailRes, stationsRes]) => {
        if (!isMounted) return;
        if (empRes.success) {
          setEmployees(empRes.data);
        }
        if (assignRes.success) {
          setExistingAssignments(assignRes.data);
        }
        if (detailRes) {
          setCourseDetail(detailRes);
        }

        const realStations = (stationsRes?.stations || [])
          .map((s) => s.name.trim())
          .filter(Boolean);
        setDbStations(realStations);

        // Pre-select all available stations by default
        const allSt = new Set<string>(realStations);
        if (empRes.success) {
          for (const e of empRes.data) {
            if (e.stations && Array.isArray(e.stations)) {
              e.stations.forEach((s) => allSt.add(s));
            } else if (e.station) {
              allSt.add(e.station);
            }
          }
        }
        setSelectedStations(allSt);
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    // Reset interaction state
    setView("main");
    setScope("everyone");
    setSelectedPeopleIds(new Set());
    setPeopleSearch("");
    setStationFilter("all");
    setDueAt(defaultDueDate());
    setCourseDetail(null);
    setDbStations([]);
    setIsSubmitting(false);

    return () => {
      isMounted = false;
    };
  }, [open, course?.id]);

  const assignedEmployeeIds = React.useMemo(() => {
    return new Set(existingAssignments.map((a) => a.employeeId));
  }, [existingAssignments]);

  // Unassigned employees available for assignment
  const unassignedEmployees = React.useMemo(() => {
    return employees.filter((e) => !assignedEmployeeIds.has(e.id));
  }, [employees, assignedEmployeeIds]);

  // Filtered employees for People modal: Show ALL employees matching station and search
  const filteredPeople = React.useMemo(() => {
    return employees.filter((e) => {
      const matchesStation =
        stationFilter === "all" ||
        e.station === stationFilter ||
        Boolean(e.stations?.includes(stationFilter));
      const q = peopleSearch.trim().toLowerCase();
      const matchesQuery =
        !q || (e.name + " " + e.station).toLowerCase().includes(q);
      return matchesStation && matchesQuery;
    });
  }, [employees, stationFilter, peopleSearch]);

  // Calculate target employees based on scope in Main Modal
  const mainScopeEmployeeIds = React.useMemo(() => {
    if (scope === "everyone") {
      return unassignedEmployees.map((e) => e.id);
    }
    if (scope === "station") {
      return unassignedEmployees
        .filter((e) => {
          if (selectedStations.has(e.station)) return true;
          if (e.stations?.some((s) => selectedStations.has(s))) return true;
          return false;
        })
        .map((e) => e.id);
    }
    return Array.from(selectedPeopleIds);
  }, [scope, unassignedEmployees, selectedStations, selectedPeopleIds]);

  // Map of all employees belonging to each station (for preview and status counts)
  const stationEmployees = React.useMemo(() => {
    const map: Record<string, MockEmployee[]> = {};
    for (const st of availableStations) {
      map[st] = employees.filter((e) => {
        if (e.station === st) return true;
        if (e.stations?.includes(st)) return true;
        return false;
      });
    }
    return map;
  }, [availableStations, employees]);

  // Count of assignable (unassigned) employees per station
  const stationEmployeeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const st of availableStations) {
      counts[st] = unassignedEmployees.filter((e) => {
        if (e.station === st) return true;
        if (e.stations?.includes(st)) return true;
        return false;
      }).length;
    }
    return counts;
  }, [availableStations, unassignedEmployees]);

  if (!open || !course) return null;

  const registeredChapters = getChapterDefinitions(course.id);
  const chapterCount =
    courseDetail?.chapterCount ??
    courseDetail?.chapters?.length ??
    (course as unknown as { chapterCount?: number }).chapterCount ??
    (registeredChapters?.length || 1);

  const linkedSopsCount =
    courseDetail?.chapters?.filter((ch) => Boolean(ch.procedureId)).length ?? 0;

  const hasQuiz = Boolean(
    // 1. From course summary metadata (from explore table)
    (course as unknown as { hasQuiz?: boolean }).hasQuiz ||
    Boolean(
      (course as unknown as { quizCount?: number }).quizCount &&
      (course as unknown as { quizCount?: number }).quizCount! > 0,
    ) ||
    course.quizId === "attached-quiz" ||
    // 2. From real backend course detail with chapters & quizzes
    courseDetail?.hasQuiz ||
    Boolean(courseDetail?.quizCount && courseDetail.quizCount > 0) ||
    courseDetail?.chapters?.some(
      (ch) =>
        Boolean(ch.quizId) ||
        Boolean(
          ch.quiz &&
          (!Array.isArray(ch.quiz?.questions) || ch.quiz.questions.length > 0),
        ),
    ) ||
    // 3. From locally registered chapter definitions
    registeredChapters?.some((ch) => Boolean(ch.quizId || ch.quiz)) ||
    // 4. Standalone quiz lookup
    (course.quizId && Boolean(getQuizById(course.quizId)?.questions?.length)),
  );

  function toggleStation(st: string): void {
    setSelectedStations((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
  }

  function handleSelectAllStations(): void {
    setSelectedStations(new Set(availableStations));
  }

  function handleDeselectAllStations(): void {
    setSelectedStations(new Set());
  }

  function togglePerson(id: string): void {
    if (assignedEmployeeIds.has(id)) return; // Already assigned employees cannot be re-toggled
    setSelectedPeopleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Visible unassigned employee IDs for the select-all action
  const unassignedVisibleIds = filteredPeople
    .filter((e) => !assignedEmployeeIds.has(e.id))
    .map((e) => e.id);

  function handleSelectAllVisiblePeople(): void {
    const allSelected =
      unassignedVisibleIds.length > 0 &&
      unassignedVisibleIds.every((id) => selectedPeopleIds.has(id));

    setSelectedPeopleIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        unassignedVisibleIds.forEach((id) => next.delete(id));
      } else {
        unassignedVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function executeAssignment(targetIds: string[]): Promise<void> {
    if (!course || targetIds.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await assignCourse({
        courseId: course.id,
        employeeIds: targetIds,
        dueAt: dueAt && dueAt.trim() ? dueAt : undefined,
        scope,
      });

      if (response.success) {
        if (onAssigned) {
          onAssigned(response.data.assignedCount);
        }
        onClose();
      }
    } catch (err) {
      console.error("Failed to assign course:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      className="p-0 overflow-hidden w-full max-w-[720px] h-[640px] max-h-[90vh] rounded-[var(--radius-xl)] shadow-xl flex flex-col border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {view === "main" ? (
          <AssignMainModalView
            course={course}
            locale={locale}
            scope={scope}
            setScope={setScope}
            selectedStations={selectedStations}
            toggleStation={toggleStation}
            availableStations={availableStations}
            dueAt={dueAt}
            setDueAt={setDueAt}
            getPresetDate={getPresetDate}
            targetEmployeeCount={mainScopeEmployeeIds.length}
            selectedPeopleCount={selectedPeopleIds.size}
            chapterCount={chapterCount}
            linkedSopsCount={linkedSopsCount}
            hasQuiz={hasQuiz}
            canAssign={
              mainScopeEmployeeIds.length > 0 &&
              Boolean(dueAt && dueAt.trim()) &&
              !isSubmitting &&
              !isLoadingData
            }
            isSubmitting={isSubmitting}
            stationEmployeeCounts={stationEmployeeCounts}
            stationEmployees={stationEmployees}
            allEmployees={employees}
            onSelectAllStations={handleSelectAllStations}
            onDeselectAllStations={handleDeselectAllStations}
            onOpenPeopleView={() => {
              setScope("people");
              setView("people");
            }}
            onClose={onClose}
            onExecuteAssign={() => executeAssignment(mainScopeEmployeeIds)}
          />
        ) : (
          <AssignPeopleModalView
            course={course}
            locale={locale}
            filteredPeople={filteredPeople}
            assignedEmployeeIds={assignedEmployeeIds}
            selectedPeopleIds={selectedPeopleIds}
            togglePerson={togglePerson}
            onSelectAllVisible={handleSelectAllVisiblePeople}
            onClearSelected={() => setSelectedPeopleIds(new Set())}
            peopleSearch={peopleSearch}
            setPeopleSearch={setPeopleSearch}
            stationFilter={stationFilter}
            setStationFilter={setStationFilter}
            availableStations={availableStations}
            dueAt={dueAt}
            setDueAt={setDueAt}
            getPresetDate={getPresetDate}
            chapterCount={chapterCount}
            hasQuiz={hasQuiz}
            isSubmitting={isSubmitting}
            onBack={() => setView("main")}
            onClose={onClose}
            onExecuteAssign={() =>
              executeAssignment(Array.from(selectedPeopleIds))
            }
          />
        )}
      </div>
    </Modal>
  );
}
