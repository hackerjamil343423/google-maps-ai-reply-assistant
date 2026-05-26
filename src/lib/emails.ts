import { Resend } from "resend";

import { env } from "@/lib/env";
export type { EmailLang } from "@/lib/email-templates";

import {
  type EmailLang,
  buildCancellationScheduledEmailHtml,
  buildCancellationScheduledEmailText,
  buildDowngradeReadyEmailHtml,
  buildDowngradeReadyEmailText,
  buildInvitationEmailHtml,
  buildInvitationEmailText,
  buildRenewalFailedEmailHtml,
  buildRenewalFailedEmailText,
  buildTrialExpiryEmailHtml,
  buildTrialExpiryEmailText,
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
} from "@/lib/email-templates";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function getBaseUrl() {
  return env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "https://stars.wakkelni.ai";
}

function isEmailConfigured() {
  return resend !== null && !!env.RESEND_FROM_EMAIL;
}

// ---------------------------------------------------------------------------
// Welcome email - sent immediately after account creation
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(input: {
  toEmail: string;
  name: string;
  lang?: EmailLang;
}) {
  if (!isEmailConfigured()) return;

  const lang = input.lang ?? "en";
  const dashboardUrl = `${getBaseUrl()}/dashboard`;
  const subject = lang === "ar" ? "مرحبًا بك في وكلني" : "Welcome to Wakkelni";

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject,
    html: buildWelcomeEmailHtml({ name: input.name, dashboardUrl, lang }),
    text: buildWelcomeEmailText({ name: input.name, dashboardUrl, lang }),
  });
}

// ---------------------------------------------------------------------------
// Trial expiry email - call this from a cron job
// ---------------------------------------------------------------------------

export async function sendTrialExpiryEmail(input: {
  toEmail: string;
  name: string;
  workspaceName: string;
  trialEndsAt: Date;
  lang?: EmailLang;
}) {
  if (!isEmailConfigured()) return;

  const lang = input.lang ?? "en";
  const upgradeUrl = `${getBaseUrl()}/settings/billing`;
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  const dateStr = input.trialEndsAt.toLocaleDateString(locale, { month: "long", day: "numeric" });
  const subject =
    lang === "ar"
      ? `تجربتك المجانية في وكلني تنتهي في ${dateStr}`
      : `Your Wakkelni trial ends on ${dateStr}`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject,
    html: buildTrialExpiryEmailHtml({ ...input, upgradeUrl, lang }),
    text: buildTrialExpiryEmailText({ ...input, upgradeUrl, lang }),
  });
}

// ---------------------------------------------------------------------------
// Renewal failed email - sent by the webhook handler
// ---------------------------------------------------------------------------

export async function sendRenewalFailedEmail(input: {
  toEmail: string;
  name: string;
  workspaceName: string;
  plan: string;
  lang?: EmailLang;
}) {
  if (!isEmailConfigured()) return;

  const lang = input.lang ?? "en";
  const upgradeUrl = `${getBaseUrl()}/dashboard/settings?section=billing`;
  const subject =
    lang === "ar"
      ? `إجراء مطلوب: فشل تجديد الاشتراك لـ ${input.workspaceName}`
      : `Action required: subscription renewal failed for ${input.workspaceName}`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject,
    html: buildRenewalFailedEmailHtml({ ...input, upgradeUrl, lang }),
    text: buildRenewalFailedEmailText({ ...input, upgradeUrl, lang }),
  });
}

// ---------------------------------------------------------------------------
// Cancellation scheduled email - sent when a user cancels their subscription
// ---------------------------------------------------------------------------

export async function sendCancellationScheduledEmail(input: {
  toEmail: string;
  name: string;
  workspaceName: string;
  plan: string;
  accessUntil: Date | null;
  lang?: EmailLang;
}) {
  if (!isEmailConfigured()) return;

  const lang = input.lang ?? "en";
  const billingUrl = `${getBaseUrl()}/dashboard/settings?section=billing`;
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  const accessDate = input.accessUntil
    ? input.accessUntil.toLocaleDateString(locale, { month: "long", day: "numeric" })
    : lang === "ar"
    ? "نهاية فترتك الحالية"
    : "the end of your current period";

  const subject =
    lang === "ar"
      ? `اشتراكك في ${input.plan} ينتهي في ${accessDate}`
      : `Your ${input.plan} subscription ends on ${accessDate}`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject,
    html: buildCancellationScheduledEmailHtml({ ...input, billingUrl, lang }),
    text: buildCancellationScheduledEmailText({ ...input, billingUrl, lang }),
  });
}

// ---------------------------------------------------------------------------
// Downgrade ready email
// ---------------------------------------------------------------------------

export async function sendDowngradeReadyEmail(input: {
  toEmail: string;
  name: string;
  workspaceName: string;
  fromPlan: string;
  toPlan: string;
  accessUntil: Date | null;
  checkoutUrl: string;
  lang?: EmailLang;
}) {
  if (!isEmailConfigured()) return;

  const lang = input.lang ?? "en";
  const subject =
    lang === "ar"
      ? `قم بتفعيل اشتراك ${input.toPlan}`
      : `Activate your ${input.toPlan} subscription`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject,
    html: buildDowngradeReadyEmailHtml({ ...input, lang }),
    text: buildDowngradeReadyEmailText({ ...input, lang }),
  });
}

// ---------------------------------------------------------------------------
// Team invitation email
// ---------------------------------------------------------------------------

export async function sendInvitationEmail(input: {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  roleLabel: "Viewer" | "Editor" | "Manager";
  businessName?: string | null;
  token: string;
  lang?: EmailLang;
}) {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL).");
  }

  const lang = input.lang ?? "en";
  const invitationUrl = `${getBaseUrl()}/invite/${input.token}`;
  const subject =
    lang === "ar"
      ? `${input.inviterName} دعاك للانضمام إلى ${input.workspaceName} على وكلني`
      : `${input.inviterName} invited you to ${input.workspaceName} on Wakkelni`;

  const result = await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject,
    html: buildInvitationEmailHtml({ ...input, invitationUrl, lang }),
    text: buildInvitationEmailText({ ...input, invitationUrl, lang }),
  });

  if ("error" in result && result.error) {
    throw new Error(result.error.message ?? "Resend failed to deliver the invitation.");
  }
}
