import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
export const defaultStorefront = {
  storeName: "Griper",
  announcement: "Good finds. Great prices. Every day.",
  supportEmail: "rememberfrxst@gmail.com",
  deliveryFee: 40,
  freeShippingThreshold: 499,
  downloadUrl: "",
  returnsHeadline: "Returns & exchanges",
  returnsPolicy:
    "Contact customer care with your order number for return or exchange eligibility and assistance.",
  shippingPolicy:
    "Delivery charges are shown at checkout. Contact customer care for help with your delivery.",
  privacyPolicy:
    "For questions about your account data or a deletion request, contact customer care.",
  termsOfService:
    "Prices, product availability and delivery charges are confirmed at checkout. Contact customer care for questions about your order.",
  aboutStore:
    "Discover our latest products, exclusive picks and everyday offers. Our customer care team is here to help.",
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
