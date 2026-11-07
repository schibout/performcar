import type { Dealership, DealershipPayload } from "@/lib/types/quote";

export interface DealershipFormValues {
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const dealershipToValues = (dealership?: Dealership | null): DealershipFormValues => ({
  name: dealership?.name ?? "",
  logo_url: dealership?.logo_url ?? "",
  address: dealership?.address ?? "",
  phone: dealership?.phone ?? "",
  email: dealership?.email ?? "",
});

export const valuesToPayload = (values: DealershipFormValues): DealershipPayload => ({
  name: values.name.trim(),
  logo_url: values.logo_url?.trim() || null,
  address: values.address?.trim() || null,
  phone: values.phone?.trim() || null,
  email: values.email?.trim() || null,
});
