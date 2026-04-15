/**
 * Email HTML templates for Wakkelni.
 *
 * All templates share a common shell (emailShell) that renders a centered
 * 600-px white card on a light background. Brand colors:
 *   Primary   #5F30EB  (purple)
 *   Light bg  #F6F4FF
 *   Text      #040404
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wakkelni</title>
</head>
<body style="margin:0;padding:0;background-color:#F6F4FF;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F4FF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5F30EB;padding:32px 40px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Wakkelni</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #EEE;">
              <p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">
                You received this email because you have an account on Wakkelni.<br />
                If you did not request this, you can safely ignore this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(label: string, href: string): string {
  return `<a href="${href}"
    style="display:inline-block;padding:13px 28px;background-color:#5F30EB;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.1px;"
  >${escapeHtml(label)}</a>`;
}

function outlineButton(label: string, href: string): string {
  return `<a href="${href}"
    style="display:inline-block;padding:13px 28px;border:2px solid #5F30EB;color:#5F30EB;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.1px;"
  >${escapeHtml(label)}</a>`;
}

function fallbackLink(href: string): string {
  return `<p style="margin:24px 0 0;font-size:13px;color:#888888;">
    If the button does not work, copy and paste this link into your browser:<br />
    <a href="${href}" style="color:#5F30EB;word-break:break-all;">${href}</a>
  </p>`;
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

export function buildWelcomeEmailHtml(input: {
  name: string;
  dashboardUrl: string;
}): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#040404;line-height:1.3;">
      Welcome to Wakkelni
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
      Hi ${escapeHtml(input.name)}, your account is ready. You can now connect your Google Business Profile, configure your AI tone, and start managing replies across all your locations.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;background:#F6F4FF;border-radius:12px;width:100%;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#5F30EB;text-transform:uppercase;letter-spacing:0.8px;">What you can do</p>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#333333;line-height:2;">
            <li>Connect your Google Business locations</li>
            <li>Let AI reply to reviews in your brand voice</li>
            <li>Invite your team and assign roles</li>
            <li>Monitor all locations from one dashboard</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;">
      ${primaryButton("Go to dashboard", input.dashboardUrl)}
    </p>
  `;

  return emailShell(body);
}

export function buildWelcomeEmailText(input: {
  name: string;
  dashboardUrl: string;
}): string {
  return [
    `Welcome to Wakkelni, ${input.name}!`,
    "",
    "Your account is ready. You can now connect your Google Business Profile, configure your AI tone, and start managing replies across all your locations.",
    "",
    "Get started: " + input.dashboardUrl,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Trial expiry email
// ---------------------------------------------------------------------------

export function buildTrialExpiryEmailHtml(input: {
  name: string;
  workspaceName: string;
  trialEndsAt: Date;
  upgradeUrl: string;
}): string {
  const formattedDate = input.trialEndsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#040404;line-height:1.3;">
      Your trial ends on ${escapeHtml(formattedDate)}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
      Hi ${escapeHtml(input.name)}, the free trial for <strong>${escapeHtml(input.workspaceName)}</strong> is coming to an end. Upgrade now to keep your AI replies, team access, and all connected locations running without interruption.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;background:#F6F4FF;border-radius:12px;width:100%;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#5F30EB;text-transform:uppercase;letter-spacing:0.8px;">What happens after the trial</p>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#333333;line-height:2;">
            <li>Automatic AI replies will be paused</li>
            <li>Your data and settings are kept for 30 days</li>
            <li>Team members will lose access to the workspace</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;">
      ${primaryButton("Upgrade now", input.upgradeUrl)}
    </p>
    <p style="margin:0 0 0;">
      ${outlineButton("View plans", input.upgradeUrl)}
    </p>
  `;

  return emailShell(body);
}

export function buildTrialExpiryEmailText(input: {
  name: string;
  workspaceName: string;
  trialEndsAt: Date;
  upgradeUrl: string;
}): string {
  const formattedDate = input.trialEndsAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    `Your Wakkelni trial ends on ${formattedDate}`,
    "",
    `Hi ${input.name}, the free trial for ${input.workspaceName} is coming to an end.`,
    "Upgrade now to keep your AI replies, team access, and all connected locations running without interruption.",
    "",
    "Upgrade here: " + input.upgradeUrl,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Team invitation email
// ---------------------------------------------------------------------------

export function buildInvitationEmailHtml(input: {
  inviterName: string;
  workspaceName: string;
  roleLabel: string;
  businessName?: string | null;
  invitationUrl: string;
}): string {
  const scopeText = input.businessName
    ? input.businessName
    : "All locations in the workspace";

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#040404;line-height:1.3;">
      You have been invited to join ${escapeHtml(input.workspaceName)}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
      ${escapeHtml(input.inviterName)} has invited you to collaborate on Wakkelni. Review the details below and accept to get started.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #EEEEEE;border-radius:12px;width:100%;">
      <tr>
        <td style="padding:24px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                <span style="font-size:13px;color:#888888;display:block;margin-bottom:2px;">Workspace</span>
                <span style="font-size:15px;font-weight:600;color:#040404;">${escapeHtml(input.workspaceName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                <span style="font-size:13px;color:#888888;display:block;margin-bottom:2px;">Invited by</span>
                <span style="font-size:15px;font-weight:600;color:#040404;">${escapeHtml(input.inviterName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #F0F0F0;">
                <span style="font-size:13px;color:#888888;display:block;margin-bottom:2px;">Your role</span>
                <span style="font-size:15px;font-weight:600;color:#5F30EB;">${escapeHtml(input.roleLabel)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:13px;color:#888888;display:block;margin-bottom:2px;">Access scope</span>
                <span style="font-size:15px;font-weight:600;color:#040404;">${escapeHtml(scopeText)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;">
      ${primaryButton("Accept invitation", input.invitationUrl)}
    </p>

    <p style="margin:0 0 0;font-size:13px;color:#888888;line-height:1.6;">
      This invitation expires in 7 days. If you were not expecting this, you can safely ignore this email.
    </p>

    ${fallbackLink(input.invitationUrl)}
  `;

  return emailShell(body);
}

export function buildInvitationEmailText(input: {
  inviterName: string;
  workspaceName: string;
  roleLabel: string;
  businessName?: string | null;
  invitationUrl: string;
}): string {
  const scopeText = input.businessName
    ? input.businessName
    : "All locations in the workspace";

  return [
    `You have been invited to join ${input.workspaceName} on Wakkelni.`,
    "",
    `Invited by: ${input.inviterName}`,
    `Role: ${input.roleLabel}`,
    `Access scope: ${scopeText}`,
    "",
    `Accept your invitation here (expires in 7 days): ${input.invitationUrl}`,
  ].join("\n");
}
