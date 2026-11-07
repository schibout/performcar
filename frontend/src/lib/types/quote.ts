// Quote generator types, mirrored from the backend `app/schemas/quote.py`.

export const QUOTE_STATUSES = ["pending", "confirmed", "completed"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const VEHICLE_CONDITIONS = ["new", "used"] as const;
export type VehicleCondition = (typeof VEHICLE_CONDITIONS)[number];

export const FINANCING_TYPES = ["cash", "credit", "leasing_loa", "leasing_lld"] as const;
export type FinancingType = (typeof FINANCING_TYPES)[number];

// Durations offered by the financing step of the original quote generator.
export const FINANCING_DURATIONS = [12, 24, 36, 48, 60] as const;

export const QUOTE_PERIODS = ["all", "today", "week", "month"] as const;
export type QuotePeriod = (typeof QUOTE_PERIODS)[number];

export type QuoteSort = "date" | "customer" | "price";
export type SortOrder = "asc" | "desc";

export interface Dealership {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealershipListItem extends Dealership {
  user_count: number;
  quote_count: number;
}

export interface DealershipListResponse {
  items: DealershipListItem[];
  total: number;
}

export interface DealershipPayload {
  name?: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface CarVersion {
  id: string;
  name: string;
}

export interface CarModel {
  id: string;
  name: string;
  versions: CarVersion[];
}

export interface CarBrand {
  id: string;
  name: string;
  models: CarModel[];
}

export interface VehicleCatalog {
  brands: CarBrand[];
  colors: { id: string; name: string }[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  code: string;
}

export interface CatalogService {
  id: string;
  name: string;
  price: number;
  description: string | null;
  active: boolean;
  category: ServiceCategory;
}

export interface ServiceListResponse {
  items: CatalogService[];
  categories: ServiceCategory[];
}

export interface ServicePayload {
  name?: string;
  price?: number;
  category_id?: string;
  description?: string | null;
  active?: boolean;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  dealership_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerListItem extends Customer {
  quote_count: number;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
}

export interface CustomerPayload {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  email?: string | null;
}

export interface CustomerListParams {
  search?: string;
  skip?: number;
  limit?: number;
  dealership_id?: string;
}

export interface QuoteVehicle {
  brand: string;
  model: string;
  version: string | null;
  year: number;
  color: string;
  condition: VehicleCondition;
}

export interface QuoteFinancing {
  type: FinancingType;
  down_payment: number | null;
  duration_months: number | null;
  monthly_payment: number | null;
}

export interface QuoteServiceLine {
  service_id: string;
  name: string;
  description: string | null;
  category_name: string;
  category_code: string;
  price: number;
}

export interface QuoteAuthor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface Quote {
  id: string;
  reference_number: string;
  status: QuoteStatus;
  total_price: number;
  requested_date: string | null;
  created_at: string;
  updated_at: string;
  dealership: Dealership;
  created_by: QuoteAuthor | null;
  customer: Customer;
  vehicle: QuoteVehicle;
  financing: QuoteFinancing | null;
  services: QuoteServiceLine[];
}

export interface QuoteListResponse {
  items: Quote[];
  total: number;
}

export interface QuoteListParams {
  search?: string;
  status?: QuoteStatus;
  period?: QuotePeriod;
  sort?: QuoteSort;
  order?: SortOrder;
  skip?: number;
  limit?: number;
  dealership_id?: string;
}

export interface QuoteCustomerPayload {
  id?: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
}

export interface QuoteFinancingPayload {
  type: FinancingType;
  down_payment?: number;
  duration_months?: number | null;
}

export interface QuoteCreatePayload {
  vehicle: QuoteVehicle;
  customer: QuoteCustomerPayload;
  service_ids: string[];
  financing: QuoteFinancingPayload | null;
  requested_date: string | null;
}

export interface QuoteUpdatePayload extends Partial<QuoteCreatePayload> {
  status?: QuoteStatus;
}

export interface MonthlyQuoteStat {
  year: number;
  month: number;
  quotes: number;
  revenue: number;
}

export interface QuoteStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  revenue: number;
  average_value: number;
  conversion_rate: number;
  current_month: number;
  previous_month: number;
  monthly: MonthlyQuoteStat[];
  recent: Quote[];
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

// The two perimeters a quote screen can work in: the caller's dealership
// (`self.*` keys) or every dealership from the admin panel (admin keys).
export type QuoteScope = "self" | "admin";
