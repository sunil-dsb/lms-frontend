import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProcedures,
  fetchAssignedProcedures,
  fetchProcedureById,
  createProcedure,
  updateProcedure,
  archiveProcedure,
} from "./api";
import { listProcedures } from "@/lib/api";
import type {
  CreateProcedureInput,
  ProcedureFilterOptions,
  AssignedProceduresFilterOptions,
} from "./types";

export const PROCEDURES_QUERY_KEY = ["procedures"] as const;

export function useProcedures(
  options: ProcedureFilterOptions = {},
  isAdmin = false,
) {
  return useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, options, { isAdmin }],
    queryFn: () => fetchProcedures(options, isAdmin),
  });
}

export function useProcedure(id: string, isAdmin = false) {
  return useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, id, { isAdmin }],
    queryFn: () => fetchProcedureById(id, isAdmin),
    enabled: Boolean(id),
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProcedureInput) => createProcedure(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROCEDURES_QUERY_KEY,
        refetchType: "all",
      });
      queryClient.removeQueries({ queryKey: PROCEDURES_QUERY_KEY });
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CreateProcedureInput>;
    }) => updateProcedure(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROCEDURES_QUERY_KEY,
        refetchType: "all",
      });
      queryClient.removeQueries({ queryKey: PROCEDURES_QUERY_KEY });
    },
  });
}

export function useArchiveProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveProcedure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROCEDURES_QUERY_KEY,
        refetchType: "all",
      });
      queryClient.removeQueries({ queryKey: PROCEDURES_QUERY_KEY });
    },
  });
}

/** Employee-facing browse list. Routes through lib/api's
 *  listProcedures so the admin-only endpoint rejecting a regular
 *  employee (403) transparently falls back to the on-device store
 *  instead of erroring the screen. */
export function useBrowseProcedures() {
  return useQuery({
    queryKey: [...PROCEDURES_QUERY_KEY, "browse"],
    queryFn: () => listProcedures({}).then((r) => r.procedures),
  });
}

export const ASSIGNED_PROCEDURES_QUERY_KEY = [
  "procedures",
  "assigned",
] as const;

/** Employee-facing assigned procedures (GET /api/v1/procedures/assigned). */
export function useAssignedProcedures(
  options: AssignedProceduresFilterOptions = {},
) {
  return useQuery({
    queryKey: [...ASSIGNED_PROCEDURES_QUERY_KEY, options],
    queryFn: () => fetchAssignedProcedures(options),
  });
}
