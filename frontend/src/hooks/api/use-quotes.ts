import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePermissions } from "@/hooks/use-permissions";
import { catalogApi, customersApi, dealershipsApi, quotesApi } from "@/lib/api/endpoints/quotes";
import { Permission } from "@/lib/types/permissions";
import type {
  CustomerListParams,
  CustomerPayload,
  DealershipPayload,
  QuoteCreatePayload,
  QuoteListParams,
  QuoteScope,
  QuoteUpdatePayload,
  ServicePayload,
} from "@/lib/types/quote";

export const quoteKeys = {
  all: ["quotes"] as const,
  list: (scope: QuoteScope, params?: QuoteListParams) =>
    ["quotes", scope, "list", params ?? {}] as const,
  stats: (scope: QuoteScope, dealershipId?: string) =>
    ["quotes", scope, "stats", dealershipId ?? ""] as const,
  detail: (scope: QuoteScope, id: string) => ["quotes", scope, "detail", id] as const,
};

export const customerKeys = {
  all: ["customers"] as const,
  list: (scope: QuoteScope, params?: CustomerListParams) =>
    ["customers", scope, "list", params ?? {}] as const,
};

export const catalogKeys = {
  vehicles: (scope: QuoteScope) => ["catalog", scope, "vehicles"] as const,
  services: (scope: QuoteScope) => ["catalog", scope, "services"] as const,
  all: ["catalog"] as const,
};

export const dealershipKeys = {
  mine: ["dealership", "mine"] as const,
  list: ["dealership", "list"] as const,
  all: ["dealership"] as const,
};

// The permission each scope needs before a read request is even sent.
const READ_KEYS: Record<
  QuoteScope,
  { quotes: Permission; customers: Permission; catalog: Permission }
> = {
  self: {
    quotes: Permission.SelfQuotesRead,
    customers: Permission.SelfCustomersRead,
    catalog: Permission.SelfCatalogRead,
  },
  admin: {
    quotes: Permission.QuotesRead,
    customers: Permission.CustomersRead,
    catalog: Permission.CatalogRead,
  },
};

const useCan = (permission: Permission): boolean => usePermissions().has(permission);

// --- Quotes -----------------------------------------------------------------------

export const useQuotes = (scope: QuoteScope, params?: QuoteListParams) => {
  const enabled = useCan(READ_KEYS[scope].quotes);
  return useQuery({
    queryKey: quoteKeys.list(scope, params),
    queryFn: () => quotesApi.list(scope, params),
    placeholderData: keepPreviousData,
    enabled,
  });
};

export const useQuoteStats = (scope: QuoteScope, dealershipId?: string) => {
  const enabled = useCan(READ_KEYS[scope].quotes);
  return useQuery({
    queryKey: quoteKeys.stats(scope, dealershipId),
    queryFn: () => quotesApi.stats(scope, dealershipId),
    enabled,
  });
};

export const useQuote = (scope: QuoteScope, id: string | undefined) => {
  const canRead = useCan(READ_KEYS[scope].quotes);
  return useQuery({
    queryKey: quoteKeys.detail(scope, id ?? "invalid"),
    queryFn: () => {
      if (!id) throw new Error("Quote ID is required");
      return quotesApi.get(scope, id);
    },
    enabled: Boolean(id) && canRead,
    retry: false,
  });
};

export const useCreateQuote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuoteCreatePayload) => quotesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
};

export const useUpdateQuote = (scope: QuoteScope, id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuoteUpdatePayload) => quotesApi.update(scope, id, payload),
    onSuccess: (quote) => {
      queryClient.setQueryData(quoteKeys.detail(scope, id), quote);
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
};

export const useDeleteQuote = (scope: QuoteScope) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotesApi.remove(scope, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
};

// --- Customers --------------------------------------------------------------------

export const useCustomers = (scope: QuoteScope, params?: CustomerListParams, enabled = true) => {
  const canRead = useCan(READ_KEYS[scope].customers);
  return useQuery({
    queryKey: customerKeys.list(scope, params),
    queryFn: () => customersApi.list(scope, params),
    placeholderData: keepPreviousData,
    enabled: canRead && enabled,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CustomerPayload) => customersApi.create(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
};

export const useUpdateCustomer = (scope: QuoteScope) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) =>
      customersApi.update(scope, id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
    },
  });
};

export const useDeleteCustomer = (scope: QuoteScope) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.remove(scope, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
};

// --- Catalog ----------------------------------------------------------------------

export const useVehicleCatalog = (scope: QuoteScope) => {
  const enabled = useCan(READ_KEYS[scope].catalog);
  return useQuery({
    queryKey: catalogKeys.vehicles(scope),
    queryFn: () => catalogApi.vehicles(scope),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
};

export const useCatalogServices = (scope: QuoteScope) => {
  const enabled = useCan(READ_KEYS[scope].catalog);
  return useQuery({
    queryKey: catalogKeys.services(scope),
    queryFn: () => catalogApi.services(scope),
    enabled,
  });
};

export const useSaveService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ServicePayload }) =>
      id ? catalogApi.updateService(id, payload) : catalogApi.createService(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogApi.removeService(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: catalogKeys.all }),
  });
};

// --- Dealerships ------------------------------------------------------------------

export const useMyDealership = () => {
  const enabled = useCan(Permission.SelfDealershipRead);
  return useQuery({
    queryKey: dealershipKeys.mine,
    queryFn: () => dealershipsApi.mine(),
    enabled,
    retry: false,
  });
};

export const useUpdateMyDealership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DealershipPayload) => dealershipsApi.updateMine(payload),
    onSuccess: (dealership) => {
      queryClient.setQueryData(dealershipKeys.mine, dealership);
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
    },
  });
};

export const useDealerships = (enabled = true) => {
  const canRead = useCan(Permission.DealershipsRead);
  return useQuery({
    queryKey: dealershipKeys.list,
    queryFn: () => dealershipsApi.list(),
    enabled: canRead && enabled,
  });
};

export const useSaveDealership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: DealershipPayload }) =>
      id ? dealershipsApi.update(id, payload) : dealershipsApi.create(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: dealershipKeys.all }),
  });
};

export const useDeleteDealership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealershipsApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: dealershipKeys.all }),
  });
};
