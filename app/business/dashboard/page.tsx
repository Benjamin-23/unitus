import type { Metadata } from "next";
import { MerchantDashboard } from "@/components/marketplace/merchant-dashboard";

export const metadata: Metadata = { title: "Partner dashboard · Unitus" };

export default function BusinessDashboardPage() {
  return <MerchantDashboard />;
}
