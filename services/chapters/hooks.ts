"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchChapters,
  fetchChapterById,
  deleteChapter,
  reorderChapters,
} from "./api";
import type { ChapterOrderItem } from "./types";
import { COURSES_QUERY_KEY } from "../courses/hooks";

export const CHAPTERS_QUERY_KEY = ["chapters"] as const;

export function useChapters(courseId?: string) {
  return useQuery({
    queryKey: [...CHAPTERS_QUERY_KEY, { courseId }],
    queryFn: () => fetchChapters(courseId),
    enabled: Boolean(courseId),
  });
}

export function useChapter(id: string, courseId?: string) {
  return useQuery({
    queryKey: [...CHAPTERS_QUERY_KEY, { id, courseId }],
    queryFn: () => fetchChapterById(id, courseId),
    enabled: Boolean(id),
  });
}

export function useDeleteChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; courseId?: string }) =>
      deleteChapter(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHAPTERS_QUERY_KEY,
        refetchType: "all",
      });
      if (variables.courseId) {
        queryClient.invalidateQueries({
          queryKey: [...COURSES_QUERY_KEY, variables.courseId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        refetchType: "all",
      });
    },
  });
}

export function useReorderChapters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      orders,
    }: {
      courseId: string;
      orders: ChapterOrderItem[];
    }) => reorderChapters(courseId, orders),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: CHAPTERS_QUERY_KEY,
        refetchType: "all",
      });
      if (variables.courseId) {
        queryClient.invalidateQueries({
          queryKey: [...COURSES_QUERY_KEY, variables.courseId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: COURSES_QUERY_KEY,
        refetchType: "all",
      });
    },
  });
}
