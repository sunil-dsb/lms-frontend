import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  fetchProcedures,
  fetchAssignedProcedures,
  fetchProcedureById,
  createProcedure,
  updateProcedure,
  archiveProcedure,
} from "./api";
import { listProcedures } from "@/lib/api";
import { CATEGORIES_QUERY_KEY } from "@/services/categories/hooks";
import type { Category } from "@/lib/types";
import type {
  CreateProcedureInput,
  ProcedureFilterOptions,
  AssignedProceduresFilterOptions,
} from "./types";

export const PROCEDURES_QUERY_KEY = ["procedures"] as const;

/** The page's categories list through the shared TanStack entry — joins the
 *  mounted `useBackendCategories` fetch (a single GET /categories) and hands
 *  the promise to the procedures fetch, whose row→category resolver would
 *  otherwise fire a second, sequential GET /categories of its own. */
function sharedCategoriesPromise(
  queryClient: QueryClient,
): Promise<Category[]> {
  const cached = queryClient.getQueryData<Category[]>([
    ...CATEGORIES_QUERY_KEY,
    "backend",
  ]);
  if (cached && cached.length > 0) {
    return Promise.resolve(cached);
  }
  return queryClient.fetchQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "backend"],
    queryFn: async () => {
      const { fetchBackendCategories } =
        await import("@/services/categories/api");
      return fetchBackendCategories();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProcedures(
  options: ProcedureFilterOptions = {},
  isAdmin = false,
  enabled = true,
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [
      ...PROCEDURES_QUERY_KEY,
      options.search || "",
      options.status || "",
      options.page || 1,
      options.limit || 200,
      { isAdmin },
    ],
    queryFn: () =>
      fetchProcedures(
        options,
        isAdmin,
        undefined,
        sharedCategoriesPromise(queryClient),
      ),
    enabled,
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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...ASSIGNED_PROCEDURES_QUERY_KEY, options],
    queryFn: () =>
      fetchAssignedProcedures(
        options,
        undefined,
        sharedCategoriesPromise(queryClient),
      ),
    staleTime: 60 * 1000,
  });
}
