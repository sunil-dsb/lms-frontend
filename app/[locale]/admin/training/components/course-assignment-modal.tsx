"use client";

import * as React from "react";
import type { Procedure, TrainingAssignment } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { getQuizById } from "@/lib/api";
import { listLinkedSops, type MockEmployee } from "@/lib/mock-training";
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

  // API Data States (simulating real async API response hydration)
  const [employees, setEmployees] = React.useState<MockEmployee[]>([]);
  const [existingAssignments, setExistingAssignments] = React.useState<
    TrainingAssignment[]
  >([]);
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

  // Available unique stations from employees (excluding any invalid station like "Saucier")
  const availableStations = React.useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((e) => e.station)
          .filter((st) => Boolean(st) && st.toLowerCase() !== "saucier"),
      ),
    );
  }, [employees]);

  // Load API data whenever modal opens
  React.useEffect(() => {
    if (!open || !course) return;

    let isMounted = true;
    setIsLoadingData(true);

    Promise.all([fetchAssignableEmployees(), fetchCourseAssignments(course.id)])
      .then(([empRes, assignRes]) => {
        if (!isMounted) return;
        if (empRes.success) {
          setEmployees(empRes.data);
          const stations = Array.from(
            new Set(
              empRes.data
                .map((e) => e.station)
                .filter((st) => Boolean(st) && st.toLowerCase() !== "saucier"),
            ),
          );
          setSelectedStations(new Set(stations));
        }
        if (assignRes.success) {
          setExistingAssignments(assignRes.data);
        }
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
  // (Both unassigned and already assigned in the same unified employee block)
  const filteredPeople = React.useMemo(() => {
    return employees.filter((e) => {
      const matchesStation =
        stationFilter === "all" || e.station === stationFilter;
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
        .filter((e) => selectedStations.has(e.station))
        .map((e) => e.id);
    }
    return Array.from(selectedPeopleIds);
  }, [scope, unassignedEmployees, selectedStations, selectedPeopleIds]);

  if (!open || !course) return null;

  const linkedSops = listLinkedSops(course);
  const chapterCount = linkedSops.length > 0 ? linkedSops.length + 1 : 1;
  const hasQuiz = Boolean(
    course.quizId && getQuizById(course.quizId)?.questions?.length,
  );

  function toggleStation(st: string): void {
    setSelectedStations((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
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
            targetEmployeeCount={mainScopeEmployeeIds.length}
            chapterCount={chapterCount}
            linkedSopsCount={linkedSops.length}
            hasQuiz={hasQuiz}
            canAssign={
              mainScopeEmployeeIds.length > 0 && !isSubmitting && !isLoadingData
            }
            isSubmitting={isSubmitting}
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
