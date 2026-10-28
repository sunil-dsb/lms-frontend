import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCourses,
  fetchCourseById,
  createCourse,
  updateCourse,
  archiveCourse,
  unarchiveCourse,
  deleteCourse,
  saveCourse,
  assignCourseApi,
  type SaveCourseInput,
} from "./api";
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CoursesFilterOptions,
} from "./types";

export const COURSES_QUERY_KEY = ["courses"] as const;

export function useCourses(options: CoursesFilterOptions = {}) {
  return useQuery({
    queryKey: [...COURSES_QUERY_KEY, options],
    queryFn: () => fetchCourses(options),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: [...COURSES_QUERY_KEY, id],
    queryFn: () => fetchCourseById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCourseInput) => createCourse(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        exact: true,
      });
      if (created?.id) {
        queryClient.setQueryData([...COURSES_QUERY_KEY, created.id], created);
      }
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCourseInput }) =>
      updateCourse(id, input),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        exact: true,
      });
      const effectiveId = updated?.id || variables.id;
      if (effectiveId && updated) {
        queryClient.setQueryData([...COURSES_QUERY_KEY, effectiveId], updated);
      }
    },
  });
}

export function useArchiveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
      });
    },
  });
}

export function useUnarchiveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unarchiveCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
      });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
      });
    },
  });
}

export function useAssignCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      employeeIds,
      mode,
    }: {
      courseId: string;
      employeeIds: string[];
      mode?: "add" | "replace";
    }) => assignCourseApi(courseId, employeeIds, mode),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: [...COURSES_QUERY_KEY, variables.courseId],
      });
    },
  });
}

export function useSaveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveCourseInput) => saveCourse(input),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        exact: true,
      });
      if (saved?.id) {
        queryClient.setQueryData([...COURSES_QUERY_KEY, saved.id], saved);
      }
    },
  });
}
