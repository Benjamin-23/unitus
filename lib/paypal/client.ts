"use client";

// Loads the PayPal v6 Web SDK once and shares one SDK instance across the page.

type PaymentSessionCallbacks = {
  onApprove: (data: { orderId: string }) => Promise<void> | void;
  onCancel?: (data: { orderId?: string }) => void;
  onError?: (error: { code?: string; message: string }) => void;
  savePayment?: boolean;
};

export type PayPalSession = {
  start: (options: { presentationMode: "auto" | "popup" | "modal" | "redirect" }, order: Promise<{ orderId: string }>) => Promise<void>;
};

export type PayPalSdkInstance = {
  findEligibleMethods: (options: { currencyCode: string; paymentFlow?: string }) => Promise<{ isEligible: (method: string) => boolean }>;
  createPayPalOneTimePaymentSession: (callbacks: PaymentSessionCallbacks) => PayPalSession;
};

declare global {
  interface Window {
    paypal?: {
      createInstance: (options: { clientToken: string; components: string[]; pageType?: string; locale?: string }) => Promise<PayPalSdkInstance>;
    };
  }
}

let instancePromise: Promise<PayPalSdkInstance> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.paypal) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load PayPal. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

export function getPayPalSdk() {
  instancePromise ??= (async () => {
    const res = await fetch("/api/paypal/client-token");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "PayPal is unavailable right now.");
    const host = data.environment === "production" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";
    await loadScript(`${host}/web-sdk/v6/core`);
    return window.paypal!.createInstance({ clientToken: data.clientToken, components: ["paypal-payments"], pageType: "checkout" });
  })().catch((error) => {
    // Let the next attempt retry from scratch.
    instancePromise = null;
    throw error;
  });
  return instancePromise;
}
