import { Resend } from "resend";

import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export class TeamInvitationEmailError extends Error {
  constructor(message = "Team invitation email is not configured.") {
    super(message);
    this.name = "TeamInvitationEmailError";
  }
}

function getBaseUrl() {
  return env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export function buildInvitationUrl(token: string) {
  return `${getBaseUrl()}/invite/${token}`;
}

export async function sendTeamInvitationEmail(input: {
  token: string;
  invitedEmail: string;
  inviterName: string;
  workspaceName: string;
  businessName?: string | null;
  roleLabel: "Viewer" | "Editor" | "Manager";
}) {
  if (!resend || !env.RESEND_FROM_EMAIL) {
    throw new TeamInvitationEmailError();
  }

  const invitationUrl = buildInvitationUrl(input.token);
  const scopeLine = input.businessName
    ? `Business context: ${input.businessName}`
    : "Business context: Workspace-wide access";

  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.invitedEmail,
    subject: `${input.inviterName} invited you to ${input.workspaceName} on Wakkelni`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <p>You were invited to join <strong>${escapeHtml(input.workspaceName)}</strong> on Wakkelni.</p>
        <p><strong>Invited by:</strong> ${escapeHtml(input.inviterName)}<br />
        <strong>Role:</strong> ${escapeHtml(input.roleLabel)}<br />
        <strong>${escapeHtml(scopeLine)}</strong></p>
        <p>
          <a href="${invitationUrl}" style="display:inline-block;padding:12px 18px;background:#5F30EB;color:#ffffff;text-decoration:none;border-radius:12px">
            Review invitation
          </a>
        </p>
        <p>If the button does not work, open this link:<br />
          <a href="${invitationUrl}">${invitationUrl}</a>
        </p>
      </div>
    `,
    text: [
      `You were invited to join ${input.workspaceName} on Wakkelni.`,
      `Invited by: ${input.inviterName}`,
      `Role: ${input.roleLabel}`,
      scopeLine,
      `Open this invitation: ${invitationUrl}`,
    ].join("\n"),
  });

  if ("error" in result && result.error) {
    throw new Error(result.error.message || "Resend failed to deliver the invitation.");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
