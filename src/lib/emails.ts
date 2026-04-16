import { Resend } from "resend";

import { env } from "@/lib/env";
import {
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
  return env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";
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
}) {
  if (!isEmailConfigured()) return; // silently skip if Resend is not configured

  const dashboardUrl = `${getBaseUrl()}/dashboard`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject: "Welcome to Wakkelni",
    html: buildWelcomeEmailHtml({ name: input.name, dashboardUrl }),
    text: buildWelcomeEmailText({ name: input.name, dashboardUrl }),
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
}) {
  if (!isEmailConfigured()) return;

  const upgradeUrl = `${getBaseUrl()}/settings/billing`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject: `Your Wakkelni trial ends on ${input.trialEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    html: buildTrialExpiryEmailHtml({ ...input, upgradeUrl }),
    text: buildTrialExpiryEmailText({ ...input, upgradeUrl }),
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
}) {
  if (!isEmailConfigured()) return;

  const upgradeUrl = `${getBaseUrl()}/dashboard/settings?section=billing`;

  await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject: `Action required: subscription renewal failed for ${input.workspaceName}`,
    html: buildRenewalFailedEmailHtml({ ...input, upgradeUrl }),
    text: buildRenewalFailedEmailText({ ...input, upgradeUrl }),
  });
}

// ---------------------------------------------------------------------------
// Team invitation email - replaces the inline version in team-invitations.ts
// ---------------------------------------------------------------------------

export async function sendInvitationEmail(input: {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  roleLabel: "Viewer" | "Editor" | "Manager";
  businessName?: string | null;
  token: string;
}) {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL).");
  }

  const invitationUrl = `${getBaseUrl()}/invite/${input.token}`;

  const result = await resend!.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.toEmail,
    subject: `${input.inviterName} invited you to ${input.workspaceName} on Wakkelni`,
    html: buildInvitationEmailHtml({ ...input, invitationUrl }),
    text: buildInvitationEmailText({ ...input, invitationUrl }),
  });

  if ("error" in result && result.error) {
    throw new Error(result.error.message ?? "Resend failed to deliver the invitation.");
  }
}
