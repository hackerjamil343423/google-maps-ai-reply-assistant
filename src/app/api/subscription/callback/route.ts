// This endpoint is no longer used. Stripe webhook events arrive at
// /api/subscription/webhook — configure that URL in the Stripe dashboard.
export async function POST() {
  return new Response("Gone", { status: 410 });
}
