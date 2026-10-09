"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPayPalSdk, type PayPalSession } from "@/lib/paypal/client";
import type { OrderPurpose } from "@/lib/paypal/orders";

export type CaptureResult = {
  status: string;
  captureId?: string;
  amount?: string;
  payerEmail?: string;
  paypalSaved: boolean;
};

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string };
    }
  }
}

async function createOrder(purpose: OrderPurpose) {
  const res = await fetch("/api/paypal/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(purpose),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not start the payment.");
  return { orderId: data.id as string };
}

/**
 * PayPal's own button (v6 Web SDK). The order is created and captured on our
 * server; the browser only says what is being paid for.
 */
export function PayPalPayButton({
  purpose,
  savePayment = false,
  disabled,
  onCaptured,
}: {
  purpose: OrderPurpose;
  /** Also save the buyer's PayPal for future automatic charges. */
  savePayment?: boolean;
  disabled?: boolean;
  onCaptured: (result: CaptureResult) => void;
}) {
  const buttonRef = useRef<HTMLElement>(null);
  const sessionRef = useRef<PayPalSession | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "ineligible" | "paying">("loading");
  const [error, setError] = useState<string | null>(null);

  // Keep the latest props for the PayPal callbacks without re-creating the session.
  const latest = useRef({ purpose, onCaptured });
  useEffect(() => {
    latest.current = { purpose, onCaptured };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = await getPayPalSdk();
        const methods = await sdk.findEligibleMethods({
          currencyCode: "USD",
          ...(savePayment ? { paymentFlow: "VAULT_WITH_PAYMENT" } : {}),
        });
        if (cancelled) return;
        if (!methods.isEligible("paypal")) {
          setState("ineligible");
          return;
        }
        sessionRef.current = sdk.createPayPalOneTimePaymentSession({
          savePayment,
          async onApprove({ orderId }) {
            setState("paying");
            try {
              const res = await fetch(`/api/paypal/orders/${orderId}/capture`, { method: "POST" });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "The payment couldn't be completed.");
              latest.current.onCaptured(data);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setState("ready");
            }
          },
          onCancel: () => setState("ready"),
          onError: (e) => {
            setError(e.message || "PayPal reported a problem. Please try again.");
            setState("ready");
          },
        });
        setState("ready");
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setState("ineligible");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [savePayment]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || state !== "ready") return;
    const onClick = async () => {
      if (disabled || !sessionRef.current) return;
      setError(null);
      try {
        // Pass the promise straight away (don't await it first) so the popup keeps the click's user activation.
        await sessionRef.current.start({ presentationMode: "auto" }, createOrder(latest.current.purpose));
      } catch (e) {
        setError((e as Error).message);
      }
    };
    button.addEventListener("click", onClick);
    return () => button.removeEventListener("click", onClick);
  }, [state, disabled]);

  return (
    <div className="flex flex-col gap-2">
      {state === "loading" && (
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Loading PayPal…
        </div>
      )}
      {state === "paying" && (
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Confirming your payment…
        </div>
      )}
      <paypal-button
        ref={buttonRef}
        type="pay"
        className="paypal-gold"
        hidden={state !== "ready"}
        aria-disabled={disabled}
        style={{ width: "100%", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : undefined }}
      />
      {state === "ineligible" && !error && (
        <p className="text-sm text-muted-foreground">PayPal isn&apos;t available for this payment from your location.</p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
