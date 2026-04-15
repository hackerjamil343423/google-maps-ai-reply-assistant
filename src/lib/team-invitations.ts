import { env } from "@/lib/env";
import { sendInvitationEmail } from "@/lib/emails";

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
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    throw new TeamInvitationEmailError();
  }

  await sendInvitationEmail({
    toEmail: input.invitedEmail,
    inviterName: input.inviterName,
    workspaceName: input.workspaceName,
    roleLabel: input.roleLabel,
    businessName: input.businessName,
    token: input.token,
  });
}
