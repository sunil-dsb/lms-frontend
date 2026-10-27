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
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCourseInput) => createCourse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        refetchType: "all",
      });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCourseInput }) =>
      updateCourse(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: [...COURSES_QUERY_KEY, variables.id],
      });
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
        refetchType: "all",
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
        refetchType: "all",
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
        refetchType: "all",
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
        refetchType: "all",
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
        refetchType: "all",
      });
      if (saved?.id) {
        queryClient.invalidateQueries({
          queryKey: [...COURSES_QUERY_KEY, saved.id],
        });
      }
    },
  });
}
