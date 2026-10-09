import { connection } from "next/server";
import { createClientToken, PAYPAL_ENV, paypalErrorResponse } from "@/lib/paypal/server";

// Browser-safe token for the PayPal v6 Web SDK.
export async function GET() {
  // A fresh token per request, never one baked in at build time.
  await connection();
  try {
    return Response.json({ clientToken: await createClientToken(), environment: PAYPAL_ENV });
  } catch (error) {
    return paypalErrorResponse(error);
  }
}
