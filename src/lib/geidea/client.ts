import crypto from "crypto";

import type {
  GeideaApiEnvelope,
  GeideaCallback,
  GeideaSession,
  GeideaSubscription,
} from "./types";

const GEIDEA_BASE = "https://api.ksamerchant.geidea.net";

function getCredentials() {
  const publicKey = process.env.GEIDEA_MERCHANT_PUBLIC_KEY;
  const apiPassword = process.env.GEIDEA_API_PASSWORD;

  if (!publicKey || !apiPassword) {
    throw new Error("GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD must be set");
  }

  return { publicKey, apiPassword };
}

function authHeaders(): HeadersInit {
  const { publicKey, apiPassword } = getCredentials();
  const token = Buffer.from(`${publicKey}:${apiPassword}`).toString("base64");

  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

export class GeideaProviderError extends Error {
  responseCode?: string;
  detailedResponseCode?: string;

  constructor(message: string, envelope: GeideaApiEnvelope = {}) {
    super(message);
    this.name = "GeideaProviderError";
    this.responseCode = envelope.responseCode;
    this.detailedResponseCode = envelope.detailedResponseCode;
  }
}

export function isGeideaSubscriptionNotEnabledError(error: unknown) {
  return (
    error instanceof GeideaProviderError &&
    error.responseCode === "710" &&
    error.detailedResponseCode === "009"
  );
}

export function isGeideaDuplicateCustomerError(error: unknown) {
  return (
    error instanceof GeideaProviderError &&
    error.responseCode === "250" &&
    error.detailedResponseCode === "006"
  );
}

function hmacBase64(message: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

function timingSafeEqualText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function generateSignature(input: {
  amount?: number | string | null;
  currency?: string | null;
  merchantReferenceId?: string | null;
  timestamp: string;
}) {
  const { publicKey, apiPassword } = getCredentials();
  const amount = formatAmountForSignature(input.amount);
  const currency = input.currency ?? "";
  const merchantReferenceId = input.merchantReferenceId ?? "";
  return hmacBase64(
    `${publicKey}${amount}${currency}${merchantReferenceId}${input.timestamp}`,
    apiPassword
  );
}

function generateSubscriptionSignature(input: {
  amount?: number | string | null;
  currency?: string | null;
  timestamp: string;
}) {
  const { publicKey, apiPassword } = getCredentials();
  const amount = formatAmountForSignature(input.amount);
  const currency = input.currency ?? "";
  return hmacBase64(
    `${publicKey}${amount}${currency}${input.timestamp}`,
    apiPassword
  );
}

function formatAmountForSignature(value: number | string | null | undefined) {
  if (value == null || value === "") return "";
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
}

export function validateCallbackSignature(callback: GeideaCallback) {
  const signature = callback.signature;
  if (!signature) return false;

  const { publicKey, apiPassword } = getCredentials();
  const secret = process.env.GEIDEA_CALLBACK_SECRET ?? apiPassword;
  const timestamp = callback.timeStamp ?? callback.timestamp ?? "";
  const order = callback.order;
  const amount = callback.amount ?? order?.amount;
  const rawAmount = amount == null ? "" : String(amount);
  const signedAmount = formatAmountForSignature(amount);
  const currency = callback.currency ?? order?.currency ?? "";
  const orderId = callback.orderId ?? order?.orderId ?? order?.id ?? "";
  const status = callback.status ?? order?.status ?? callback.detailedStatus ?? order?.detailedStatus ?? "";
  const merchantReferenceId =
    callback.merchantReferenceId ?? order?.merchantReferenceId ?? "";
  const subscriptionAmount =
    (callback.subscription as { recurringPaymentAmount?: number | string } | undefined)
      ?.recurringPaymentAmount ??
    (order?.subscription as { recurringPaymentAmount?: number | string } | undefined)
      ?.recurringPaymentAmount ??
    rawAmount;
  const subscriptionId =
    callback.subscriptionId ??
    callback.subscription?.subscriptionId ??
    order?.subscription?.subscriptionId ??
    "";
  const subscriptionStatus =
    callback.subscription?.status ?? order?.subscription?.status ?? callback.status ?? order?.status ?? "";

  const candidates = [
    `${publicKey}${rawAmount}${currency}${orderId}${status}${merchantReferenceId}${timestamp}`,
    `${publicKey}${signedAmount}${currency}${orderId}${status}${merchantReferenceId}${timestamp}`,
    `${publicKey}${rawAmount}${currency}${merchantReferenceId}${timestamp}`,
    `${publicKey}${signedAmount}${currency}${merchantReferenceId}${timestamp}`,
    `${publicKey}${orderId}${timestamp}`,
    `${publicKey}${subscriptionId}${subscriptionStatus}${timestamp}`,
    `${publicKey}${subscriptionAmount}${subscriptionId}${subscriptionStatus}`,
    `${publicKey}${formatAmountForSignature(subscriptionAmount)}${subscriptionId}${subscriptionStatus}`,
  ].map((message) => hmacBase64(message, secret));

  return candidates.some((candidate) => timingSafeEqualText(candidate, signature));
}

async function geideaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GEIDEA_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    throw new Error(`Geidea API failed: ${res.status} ${text}`);
  }

  if (
    json &&
    typeof json === "object" &&
    "responseCode" in json &&
    (json as GeideaApiEnvelope).responseCode !== "000"
  ) {
    const envelope = json as GeideaApiEnvelope;
    throw new GeideaProviderError(
      envelope.detailedResponseMessage ||
        envelope.responseMessage ||
        `Geidea provider rejected the request (${envelope.responseCode})`,
      envelope
    );
  }

  return json as T;
}

export async function createSubscription(input: {
  amount: number;
  currency: string;
  cycleInterval: "month" | "year";
  cycleFrequency: number;
  customerId?: string | null;
  customer?: {
    name: string;
    email?: string | null;
    phoneCountryCode?: string | null;
    phone?: string | null;
    number?: string | null;
  };
  merchantReferenceId: string;
}): Promise<GeideaSubscription> {
  const timestamp = new Date().toISOString();
  const body = {
    recurringPaymentAmount: input.amount,
    currency: input.currency,
    cycleInterval: input.cycleInterval,
    cycleFrequency: input.cycleFrequency,
    typeOfPayment: "RecurringPayment",
    isFirstPmtPBL: false,
    AmountVariability: "FIXED",
    merchantReferenceId: input.merchantReferenceId,
    ...(input.customerId
      ? { customerId: input.customerId }
      : { customerRequest: input.customer }),
    timestamp,
    signature: generateSubscriptionSignature({
      amount: input.amount,
      currency: input.currency,
      timestamp,
    }),
  };

  const data = await geideaFetch<
    (GeideaSubscription & { id?: string }) | { subscription: GeideaSubscription & { id?: string } }
  >(
    "/subscriptions/api/v1/direct/subscription",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  const subscription = "subscription" in data ? data.subscription : data;

  return {
    ...subscription,
    subscriptionId: subscription.subscriptionId ?? subscription.id ?? "",
  };
}

export async function createSession(input: {
  amount: number;
  currency: string;
  merchantReferenceId: string;
  subscriptionId: string;
  callbackUrl: string;
  returnUrl?: string;
}): Promise<GeideaSession> {
  const timestamp = new Date().toISOString();
  const body = {
    amount: input.amount,
    currency: input.currency,
    merchantReferenceId: input.merchantReferenceId,
    subscriptionId: input.subscriptionId,
    callbackUrl: input.callbackUrl,
    returnUrl: input.returnUrl,
    paymentOperation: "Pay",
    cardOnFile: true,
    timeStamp: timestamp,
    signature: generateSignature({
      amount: input.amount,
      currency: input.currency,
      merchantReferenceId: input.merchantReferenceId,
      timestamp,
    }),
  };

  const data = await geideaFetch<
    (GeideaSession & { sessionId?: string }) | { session: GeideaSession & { sessionId?: string } }
  >(
    "/payment-intent/api/v2/direct/session-subscription",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  const session = "session" in data ? data.session : data;

  return {
    ...session,
    id: session.id ?? session.sessionId ?? "",
  };
}

export async function createPaymentSession(input: {
  amount: number;
  currency: string;
  merchantReferenceId: string;
  callbackUrl: string;
  returnUrl?: string;
}): Promise<GeideaSession> {
  const timestamp = new Date().toISOString();
  const body = {
    amount: input.amount,
    currency: input.currency,
    merchantReferenceId: input.merchantReferenceId,
    callbackUrl: input.callbackUrl,
    returnUrl: input.returnUrl,
    paymentOperation: "Pay",
    timeStamp: timestamp,
    signature: generateSignature({
      amount: input.amount,
      currency: input.currency,
      merchantReferenceId: input.merchantReferenceId,
      timestamp,
    }),
  };

  const data = await geideaFetch<
    (GeideaSession & { sessionId?: string }) | { session: GeideaSession & { sessionId?: string } }
  >(
    "/payment-intent/api/v2/direct/session",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  const session = "session" in data ? data.session : data;

  return {
    ...session,
    id: session.id ?? session.sessionId ?? "",
  };
}

export async function getSubscription(
  subscriptionId: string
): Promise<GeideaSubscription> {
  const data = await geideaFetch<GeideaSubscription & { id?: string }>(
    `/subscriptions/api/v1/direct/subscription/${encodeURIComponent(subscriptionId)}`
  );

  return {
    ...data,
    subscriptionId: data.subscriptionId ?? data.id ?? subscriptionId,
  };
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await geideaFetch(
    `/subscriptions/api/v1/direct/subscription/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export async function getOrder(orderId: string) {
  return geideaFetch(
    `/pgw/api/v1/direct/order?OrderId=${encodeURIComponent(orderId)}`
  );
}
