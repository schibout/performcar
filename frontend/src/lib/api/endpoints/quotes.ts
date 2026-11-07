import api from "@/lib/api/api";
import { pruneParams } from "@/lib/api/endpoints/admin";
import type {
  CatalogService,
  Customer,
  CustomerListParams,
  CustomerListResponse,
  CustomerPayload,
  Dealership,
  DealershipListResponse,
  DealershipPayload,
  MessageResponse,
  Quote,
  QuoteCreatePayload,
  QuoteListParams,
  QuoteListResponse,
  QuoteScope,
  QuoteStats,
  QuoteUpdatePayload,
  ServiceListResponse,
  ServicePayload,
  VehicleCatalog,
} from "@/lib/types/quote";

// Dealer endpoints live at the API root, admin ones under /admin. The quote and
// customer screens are shared, so they pick their base from the scope.
const base = (scope: QuoteScope) => (scope === "admin" ? "/admin" : "");

export const quotesApi = {
  list: (scope: QuoteScope, params?: QuoteListParams): Promise<QuoteListResponse> =>
    api.get<QuoteListResponse, QuoteListResponse>(`${base(scope)}/quotes`, {
      params: pruneParams(params),
    }),

  stats: (scope: QuoteScope, dealershipId?: string): Promise<QuoteStats> =>
    api.get<QuoteStats, QuoteStats>(`${base(scope)}/quotes/stats`, {
      params: pruneParams({ dealership_id: dealershipId }),
    }),

  get: (scope: QuoteScope, id: string): Promise<Quote> =>
    api.get<Quote, Quote>(`${base(scope)}/quotes/${id}`),

  create: (payload: QuoteCreatePayload): Promise<Quote> =>
    api.post<Quote, Quote>("/quotes", payload),

  update: (scope: QuoteScope, id: string, payload: QuoteUpdatePayload): Promise<Quote> =>
    api.patch<Quote, Quote>(`${base(scope)}/quotes/${id}`, payload),

  remove: (scope: QuoteScope, id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`${base(scope)}/quotes/${id}`),
};

export const customersApi = {
  list: (scope: QuoteScope, params?: CustomerListParams): Promise<CustomerListResponse> =>
    api.get<CustomerListResponse, CustomerListResponse>(`${base(scope)}/customers`, {
      params: pruneParams(params),
    }),

  create: (payload: CustomerPayload): Promise<Customer> =>
    api.post<Customer, Customer>("/customers", payload),

  update: (scope: QuoteScope, id: string, payload: CustomerPayload): Promise<Customer> =>
    api.patch<Customer, Customer>(`${base(scope)}/customers/${id}`, payload),

  remove: (scope: QuoteScope, id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`${base(scope)}/customers/${id}`),
};

export const catalogApi = {
  vehicles: (scope: QuoteScope): Promise<VehicleCatalog> =>
    api.get<VehicleCatalog, VehicleCatalog>(
      scope === "admin" ? "/admin/catalog/vehicles" : "/catalog/vehicles",
    ),

  services: (scope: QuoteScope): Promise<ServiceListResponse> =>
    api.get<ServiceListResponse, ServiceListResponse>(
      scope === "admin" ? "/admin/catalog/services" : "/catalog/services",
    ),

  createService: (payload: ServicePayload): Promise<CatalogService> =>
    api.post<CatalogService, CatalogService>("/admin/catalog/services", payload),

  updateService: (id: string, payload: ServicePayload): Promise<CatalogService> =>
    api.patch<CatalogService, CatalogService>(`/admin/catalog/services/${id}`, payload),

  removeService: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/catalog/services/${id}`),
};

export const dealershipsApi = {
  mine: (): Promise<Dealership> => api.get<Dealership, Dealership>("/dealership"),

  updateMine: (payload: DealershipPayload): Promise<Dealership> =>
    api.patch<Dealership, Dealership>("/dealership", payload),

  list: (): Promise<DealershipListResponse> =>
    api.get<DealershipListResponse, DealershipListResponse>("/admin/dealerships"),

  create: (payload: DealershipPayload): Promise<Dealership> =>
    api.post<Dealership, Dealership>("/admin/dealerships", payload),

  update: (id: string, payload: DealershipPayload): Promise<Dealership> =>
    api.patch<Dealership, Dealership>(`/admin/dealerships/${id}`, payload),

  remove: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/dealerships/${id}`),
};
