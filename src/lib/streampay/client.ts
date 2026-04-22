const STREAM_BASE = "https://stream-app-service.streampay.sa/api/v2";

function getAuthHeader(): HeadersInit {
  const key = process.env.STREAM_API_KEY;
  const secret = process.env.STREAM_API_SECRET;
  if (!key || !secret) {
    throw new Error("STREAM_API_KEY and STREAM_API_SECRET must be set");
  }
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return {
    "x-api-key": token,
    "Content-Type": "application/json",
  };
}

export type StreamConsumer = {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  external_id: string | null;
};

export type StreamPaymentLink = {
  id: string;
  url: string;
  status: string;
  amount: string;
  currency: string;
};

export type StreamPayment = {
  id: string;
  amount: string;
  currency: string;
  current_status: string;
  payed_at: string | null;
};

export type StreamInvoice = {
  id: string;
  total_amount: string;
  currency: string;
  status: string;
  subcription_id: string | null;
};

export async function createConsumer(data: {
  name: string;
  email?: string;
  phone_number?: string;
  external_id: string;
}): Promise<StreamConsumer> {
  const res = await fetch(`${STREAM_BASE}/consumers`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.text();
    // If duplicate consumer, fetch the existing one by external_id
    if (res.status === 422 || body.includes("DUPLICATE_CONSUMER")) {
      const existing = await findConsumerByExternalId(data.external_id);
      if (existing) return existing;
    }
    throw new Error(`StreamPay createConsumer failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<StreamConsumer>;
}

export async function findConsumerByExternalId(
  externalId: string
): Promise<StreamConsumer | null> {
  const res = await fetch(
    `${STREAM_BASE}/consumers?external_id=${encodeURIComponent(externalId)}`,
    { headers: getAuthHeader() }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { data?: StreamConsumer[]; results?: StreamConsumer[] };
  const list: StreamConsumer[] = data.data ?? data.results ?? (Array.isArray(data) ? (data as StreamConsumer[]) : []);
  return list.find((c) => c.external_id === externalId) ?? null;
}

export async function createPaymentLink(data: {
  name: string;
  product_id: string;
  organization_consumer_id: string;
  success_redirect_url: string;
  failure_redirect_url: string;
  custom_metadata?: Record<string, string>;
}): Promise<StreamPaymentLink> {
  const body = {
    name: data.name,
    currency: "SAR",
    items: [{ product_id: data.product_id, quantity: 1 }],
    organization_consumer_id: data.organization_consumer_id,
    max_number_of_payments: 1,
    success_redirect_url: data.success_redirect_url,
    failure_redirect_url: data.failure_redirect_url,
    contact_information_type: "EMAIL",
    ...(data.custom_metadata ? { custom_metadata: data.custom_metadata } : {}),
  };

  const res = await fetch(`${STREAM_BASE}/payment_links`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay createPaymentLink failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<StreamPaymentLink>;
}

export async function getPayment(paymentId: string): Promise<StreamPayment> {
  const res = await fetch(`${STREAM_BASE}/payments/${paymentId}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay getPayment failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<StreamPayment>;
}

export async function getInvoice(invoiceId: string): Promise<StreamInvoice> {
  const res = await fetch(`${STREAM_BASE}/invoices/${invoiceId}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay getInvoice failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<StreamInvoice>;
}

export type StreamSubscription = {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  recurring_interval: string | null;
  recurring_interval_count: number | null;
  auto_cancel_cycles: number | null;
  organization_consumer_id: string;
};

/**
 * Get full subscription details from StreamPay.
 */
export async function getSubscription(subscriptionId: string): Promise<StreamSubscription> {
  const res = await fetch(`${STREAM_BASE}/subscriptions/${subscriptionId}`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay getSubscription failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<StreamSubscription>;
}

/**
 * Cancel a StreamPay subscription immediately.
 *
 * StreamPay has no native "cancel at period end" — cancellation is always immediate.
 * We implement the "cancel at period end" UX ourselves: server.ts allows access
 * while status="canceled" but currentPeriodEnd is still in the future.
 *
 * Pass cancelOngoingInvoices: false (default) to preserve the current paid invoice
 * without voiding it. StreamPay fires SUBSCRIPTION_CANCELED webhook after this call.
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: { cancelOngoingInvoices?: boolean } = {}
): Promise<void> {
  const res = await fetch(`${STREAM_BASE}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ cancel_ongoing_invoices: options.cancelOngoingInvoices ?? false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`StreamPay cancelSubscription failed: ${res.status} ${text}`);
  }
}
