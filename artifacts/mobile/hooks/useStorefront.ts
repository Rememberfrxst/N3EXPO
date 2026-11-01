import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
export const defaultStorefront = {
  storeName: "Griper",
  announcement: "Good finds. Great prices. Every day.",
  supportEmail: "rememberfrxst@gmail.com",
  deliveryFee: 40,
  freeShippingThreshold: 499,
  downloadUrl: "",
};
export function useStorefront() {
  return (
    useQuery({
      queryKey: ["storefront"],
      queryFn: () =>
        apiRequest<typeof defaultStorefront>("/storefront", { auth: false }),
      staleTime: 0,
      refetchInterval: 60000,
    }).data || defaultStorefront
  );
}
