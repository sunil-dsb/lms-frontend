"use client";

import * as React from "react";
import type { Procedure, TrainingAssignment } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getQuizById, isQuizQuestionAuthored } from "@/lib/api";
import type { MockEmployee } from "@/lib/mock-training";
import type { CourseAssignmentRow } from "@/services/courses/types";
import { getChapterDefinitions } from "@/lib/course-chapters-data";
import { fetchCourseById } from "@/services/courses/api";
import type { BackendCourse } from "@/services/courses/types";
import { fetchStations } from "@/services/stations/api";
import { fetchLocations } from "@/services/locations/api";
import { fetchJobs } from "@/services/jobs/api";
import {
  assignCourse,
  unassignCourse,
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
  const [stationList, setStationList] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [locationsList, setLocationsList] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [jobsList, setJobsList] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
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
  const [selectedLocations, setSelectedLocations] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedJobs, setSelectedJobs] = React.useState<Set<string>>(
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
  const [isRequired, setIsRequired] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningEmployeeId, setUnassigningEmployeeId] = React.useState<
    string | null
  >(null);
  const [confirmUnassignPerson, setConfirmUnassignPerson] = React.useState<{
    employeeId: string;
    name: string;
  } | null>(null);

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
      fetchLocations().catch(() => ({ locations: [] })),
      fetchJobs().catch(() => ({ jobs: [] })),
    ])
      .then(([empRes, assignRes, detailRes, stationsRes, locRes, jobsRes]) => {
        if (!isMounted) return;
        if (empRes.success) {
          setEmployees(empRes.data);
        }
        if (assignRes.success) {
          setExistingAssignments(assignRes.data);
        }
        if (detailRes) {
          setCourseDetail(detailRes);
          if (detailRes.locationIds && Array.isArray(detailRes.locationIds)) {
            setSelectedLocations(new Set(detailRes.locationIds));
          }
          if (detailRes.jobIds && Array.isArray(detailRes.jobIds)) {
            setSelectedJobs(new Set(detailRes.jobIds));
          }
        }

        const rawStations = stationsRes?.stations || [];
        setStationList(rawStations);
        const realStations = rawStations
          .map((s) => s.name.trim())
          .filter(Boolean);
        setDbStations(realStations);

        const rawLocs = locRes?.locations || [];
        setLocationsList(rawLocs);
        setJobsList(jobsRes?.jobs || []);

        // If there is only 1 location, select it by default
        if (rawLocs.length === 1) {
          setSelectedLocations(new Set([rawLocs[0].id]));
        } else if (
          detailRes?.locationIds &&
          Array.isArray(detailRes.locationIds) &&
          detailRes.locationIds.length > 0
        ) {
          setSelectedLocations(new Set(detailRes.locationIds));
        }

        // Pre-select only stations that have unassigned employees (not already fully assigned)
        const assignedIds = new Set(
          assignRes.success ? assignRes.data.map((a) => a.employeeId) : [],
        );
        const assignableStations = new Set<string>();
        const empList = empRes.success ? empRes.data : [];
        for (const st of realStations) {
          const emps = empList.filter(
            (e) => e.station === st || e.stations?.includes(st),
          );
          const hasUnassigned = emps.some((e) => !assignedIds.has(e.id));
          if (hasUnassigned) {
            assignableStations.add(st);
          }
        }
        setSelectedStations(assignableStations);
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    // Reset interaction state
    setView("main");
    setScope("everyone");
    setSelectedPeopleIds(new Set());
    setSelectedLocations(new Set());
    setSelectedJobs(new Set());
    setPeopleSearch("");
    setStationFilter("all");
    setDueAt(defaultDueDate());
    setIsRequired(false);
    setCourseDetail(null);
    setDbStations([]);
    setIsSubmitting(false);
    setUnassigningEmployeeId(null);

    return () => {
      isMounted = false;
    };
  }, [open, course?.id]);

  const assignedEmployeeIds = React.useMemo(() => {
    return new Set(existingAssignments.map((a) => a.employeeId));
  }, [existingAssignments]);
  const requiredEmployeeIds = React.useMemo(
    () =>
      new Set(
        existingAssignments
          .filter((assignment) => assignment.isRequired)
          .map((assignment) => assignment.employeeId),
      ),
    [existingAssignments],
  );

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
      const stationEmpIds = unassignedEmployees
        .filter((e) => {
          // 1. Location filter (active when multiple locations exist)
          if (
            locationsList.length > 1 &&
            selectedLocations.size > 0 &&
            (!e.locationId || !selectedLocations.has(e.locationId))
          ) {
            return false;
          }

          const hasJobFilter = selectedJobs.size > 0;
          const hasStationFilter = selectedStations.size > 0;

          // If no job or station filter is specified, match all employees in the location
          if (!hasJobFilter && !hasStationFilter) {
            return true;
          }

          const matchesJob =
            hasJobFilter && e.jobIds?.some((j) => selectedJobs.has(j));
          const matchesStation =
            hasStationFilter &&
            (selectedStations.has(e.station) ||
              e.stations?.some((s) => selectedStations.has(s)));

          return Boolean(matchesJob || matchesStation);
        })
        .map((e) => e.id);
      // Combine station employees with any individually selected employees
      return Array.from(
        new Set([...stationEmpIds, ...Array.from(selectedPeopleIds)]),
      );
    }
    return Array.from(selectedPeopleIds);
  }, [
    scope,
    unassignedEmployees,
    selectedStations,
    selectedLocations,
    selectedJobs,
    selectedPeopleIds,
    locationsList,
  ]);

  function toggleLocation(id: string): void {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleJob(id: string): void {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  const registeredChapters = React.useMemo(
    () => (course ? getChapterDefinitions(course.id) : []),
    [course],
  );
  const chapterCount =
    courseDetail?.chapterCount ??
    courseDetail?.chapters?.length ??
    (course as unknown as { chapterCount?: number })?.chapterCount ??
    (registeredChapters?.length || 1);

  const linkedSopsCount =
    courseDetail?.chapters?.filter((ch) => Boolean(ch.procedureId)).length ?? 0;

  const hasQuiz = Boolean(
    // 1. From course summary metadata (from explore table)
    (course as unknown as { hasQuiz?: boolean })?.hasQuiz ||
    Boolean(
      Number((course as unknown as { quizCount?: number })?.quizCount ?? 0) > 0,
    ) ||
    course?.quizId === "attached-quiz" ||
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
    (course?.quizId && Boolean(getQuizById(course.quizId)?.questions?.length)),
  );

  // Check whether every chapter has at least one valid authored quiz question
  const chaptersWithoutQuestions = React.useMemo(() => {
    const chapters = courseDetail?.chapters ?? [];
    if (chapters.length > 0) {
      return chapters.filter((ch) => {
        const authored = (ch.quiz?.questions ?? []).filter(
          isQuizQuestionAuthored,
        );
        if (authored.length > 0) return false;
        if (ch.quizId) {
          const loadedQuiz = getQuizById(ch.quizId);
          if (
            (loadedQuiz?.questions ?? []).filter(isQuizQuestionAuthored)
              .length > 0
          ) {
            return false;
          }
        }
        return true;
      });
    }

    if (registeredChapters && registeredChapters.length > 0) {
      return registeredChapters.filter((ch) => {
        const authored = (ch.quiz?.questions ?? []).filter(
          isQuizQuestionAuthored,
        );
        if (authored.length > 0) return false;
        if (ch.quizId) {
          const loadedQuiz = getQuizById(ch.quizId);
          if (
            (loadedQuiz?.questions ?? []).filter(isQuizQuestionAuthored)
              .length > 0
          ) {
            return false;
          }
        }
        return true;
      });
    }

    if (!hasQuiz) {
      return [{ number: 1, titleEn: "Chapter 1", titleEs: "Capítulo 1" }];
    }

    return [];
  }, [courseDetail?.chapters, registeredChapters, hasQuiz]);

  const hasMissingQuizQuestions = chaptersWithoutQuestions.length > 0;

  const isEs = locale === "es";
  if (!open || !course) return null;

  function toggleStation(st: string): void {
    const totalEmps = (stationEmployees[st] || []).length;
    const unassignedCount = stationEmployeeCounts[st] ?? 0;
    if (totalEmps > 0 && unassignedCount === 0) return; // Already fully assigned
    setSelectedStations((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
  }

  function handleSelectAllStations(): void {
    const assignable = availableStations.filter(
      (st) => (stationEmployeeCounts[st] ?? 0) > 0,
    );
    setSelectedStations(new Set(assignable));
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
    if (!course || isSubmitting) return;

    const selectedStationIds =
      scope === "station" && selectedStations.size > 0
        ? stationList
            .filter(
              (s) =>
                selectedStations.has(s.name) ||
                selectedStations.has(s.name.trim()) ||
                selectedStations.has(s.id),
            )
            .map((s) => s.id)
        : undefined;

    const selectedLocationIds =
      scope === "station" && selectedLocations.size > 0
        ? Array.from(selectedLocations)
        : undefined;

    const selectedJobIds =
      scope === "station" && selectedJobs.size > 0
        ? Array.from(selectedJobs)
        : undefined;

    if (
      targetIds.length === 0 &&
      (!selectedStationIds || selectedStationIds.length === 0) &&
      (!selectedLocationIds || selectedLocationIds.length === 0) &&
      (!selectedJobIds || selectedJobIds.length === 0)
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await assignCourse({
        courseId: course.id,
        employeeIds: targetIds,
        stationIds: selectedStationIds,
        locationIds: selectedLocationIds,
        jobIds: selectedJobIds,
        dueAt: dueAt && dueAt.trim() ? dueAt : undefined,
        scope,
        isRequired,
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

  async function handleUnassignPerson(employeeId: string): Promise<void> {
    if (!course || unassigningEmployeeId) return;

    setUnassigningEmployeeId(employeeId);
    try {
      const response = await unassignCourse({
        courseId: course.id,
        employeeIds: [employeeId],
      });

      if (response.success) {
        setExistingAssignments((prev) =>
          prev.filter((a) => a.employeeId !== employeeId),
        );
        if (onAssigned) {
          onAssigned(response.data.remainingCount);
        }
      }
    } catch (err) {
      console.error("Failed to unassign employee:", err);
    } finally {
      setUnassigningEmployeeId(null);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        className="p-0 overflow-hidden w-full max-w-[720px] h-[92vh] sm:h-[640px] max-h-[94vh] rounded-[var(--radius-xl)] shadow-xl flex flex-col border border-[var(--color-line)] bg-[var(--color-surface)]"
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
              isRequired={isRequired}
              setIsRequired={setIsRequired}
              getPresetDate={getPresetDate}
              targetEmployeeCount={mainScopeEmployeeIds.length}
              existingAssignedCount={existingAssignments.length}
              selectedPeopleCount={selectedPeopleIds.size}
              chapterCount={chapterCount}
              linkedSopsCount={linkedSopsCount}
              hasQuiz={hasQuiz}
              hasMissingQuizQuestions={hasMissingQuizQuestions}
              missingChapterNumbers={chaptersWithoutQuestions.map(
                (c) => c.number,
              )}
              isLoadingData={isLoadingData}
              canAssign={
                (mainScopeEmployeeIds.length > 0 ||
                  (scope === "station" && selectedStations.size > 0)) &&
                Boolean(dueAt && dueAt.trim()) &&
                !hasMissingQuizQuestions &&
                !isSubmitting &&
                !isLoadingData
              }
              isSubmitting={isSubmitting}
              stationEmployeeCounts={stationEmployeeCounts}
              stationEmployees={stationEmployees}
              allEmployees={employees}
              locationsList={locationsList}
              selectedLocations={selectedLocations}
              toggleLocation={toggleLocation}
              jobsList={jobsList}
              selectedJobs={selectedJobs}
              toggleJob={toggleJob}
              onSelectAllStations={handleSelectAllStations}
              onDeselectAllStations={handleDeselectAllStations}
              onOpenPeopleView={() => {
                if (scope === "everyone" || selectedPeopleIds.size === 0) {
                  setSelectedPeopleIds(new Set(mainScopeEmployeeIds));
                }
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
              requiredEmployeeIds={requiredEmployeeIds}
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
              isRequired={isRequired}
              setIsRequired={setIsRequired}
              getPresetDate={getPresetDate}
              chapterCount={chapterCount}
              hasQuiz={hasQuiz}
              isSubmitting={isSubmitting}
              onBack={() => setView("main")}
              onClose={onClose}
              onExecuteAssign={() =>
                executeAssignment(Array.from(selectedPeopleIds))
              }
              onUnassignPerson={(employeeId, name) => {
                setConfirmUnassignPerson({ employeeId, name: name || "" });
              }}
              unassigningEmployeeId={unassigningEmployeeId}
            />
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={confirmUnassignPerson !== null}
        title={isEs ? "Desasignar empleado" : "Unassign employee"}
        description={
          confirmUnassignPerson
            ? isEs
              ? `¿Seguro que deseas desasignar a ${confirmUnassignPerson.name}? Se eliminará su progreso actual.`
              : `Are you sure you want to unassign ${confirmUnassignPerson.name}? Their current training progress will be removed.`
            : ""
        }
        confirmLabel={isEs ? "Desasignar" : "Unassign"}
        cancelLabel={isEs ? "Cancelar" : "Cancel"}
        isLoading={unassigningEmployeeId !== null}
        onConfirm={async () => {
          if (!confirmUnassignPerson) return;
          await handleUnassignPerson(confirmUnassignPerson.employeeId);
          setConfirmUnassignPerson(null);
        }}
        onClose={() => {
          if (!unassigningEmployeeId) {
            setConfirmUnassignPerson(null);
          }
        }}
      />
    </>
  );
}
