import { Suspense } from "react";
import type { Metadata } from "next";
import { PayPalLogin } from "@/components/auth/paypal-login";

export const metadata: Metadata = { title: "Sign up · Unitus" };

export default function Page() {
  return (
    <Suspense>
      <PayPalLogin mode="signup" />
    </Suspense>
  );
}
