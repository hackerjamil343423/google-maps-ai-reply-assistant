/**
 * Run with: npx tsx scripts/test-email.ts
 * Sends English and Arabic test emails to the provided address.
 */

import { Resend } from "resend";
import {
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
  buildTrialExpiryEmailHtml,
  buildTrialExpiryEmailText,
  buildInvitationEmailHtml,
  buildInvitationEmailText,
} from "../src/lib/email-templates";

const RESEND_API_KEY = "re_hJvgWMfb_JeJAS8k2NTLxXekS7JMv5Fqv";
const FROM_EMAIL = "team@wakkelni.ai";
const TO_EMAIL = "wakklni2025@gmail.com";
const APP_URL = "https://wakkelni.com";

const resend = new Resend(RESEND_API_KEY);

async function send(subject: string, html: string, text: string) {
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject,
    html,
    text,
  });
  if ("error" in result && result.error) {
    console.error(`  ✗ Failed: ${result.error.message}`);
  } else {
    console.log(`  ✓ Sent (id: ${(result as { data?: { id?: string } }).data?.id ?? "unknown"})`);
  }
}

async function main() {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const upgradeUrl = `${APP_URL}/dashboard/settings?section=billing`;
  const invitationUrl = `${APP_URL}/invite/test-token-123`;
  const trialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

  console.log(`\nSending test emails to ${TO_EMAIL}...\n`);

  // --- Welcome EN
  console.log("1. Welcome (English)");
  await send(
    "Welcome to Wakkelni",
    buildWelcomeEmailHtml({ name: "Ahmed", dashboardUrl, lang: "en" }),
    buildWelcomeEmailText({ name: "Ahmed", dashboardUrl, lang: "en" }),
  );

  // --- Welcome AR
  console.log("2. Welcome (Arabic)");
  await send(
    "مرحبًا بك في وكلني",
    buildWelcomeEmailHtml({ name: "أحمد", dashboardUrl, lang: "ar" }),
    buildWelcomeEmailText({ name: "أحمد", dashboardUrl, lang: "ar" }),
  );

  // --- Trial Expiry EN
  console.log("3. Trial Expiry (English)");
  await send(
    `Your Wakkelni trial ends soon`,
    buildTrialExpiryEmailHtml({ name: "Ahmed", workspaceName: "My Cafe", trialEndsAt, upgradeUrl, lang: "en" }),
    buildTrialExpiryEmailText({ name: "Ahmed", workspaceName: "My Cafe", trialEndsAt, upgradeUrl, lang: "en" }),
  );

  // --- Trial Expiry AR
  console.log("4. Trial Expiry (Arabic)");
  await send(
    "تجربتك المجانية في وكلني تنتهي قريبًا",
    buildTrialExpiryEmailHtml({ name: "أحمد", workspaceName: "مقهى أحمد", trialEndsAt, upgradeUrl, lang: "ar" }),
    buildTrialExpiryEmailText({ name: "أحمد", workspaceName: "مقهى أحمد", trialEndsAt, upgradeUrl, lang: "ar" }),
  );

  // --- Invitation EN
  console.log("5. Team Invitation (English)");
  await send(
    "You've been invited to join My Cafe on Wakkelni",
    buildInvitationEmailHtml({ inviterName: "Ahmed", workspaceName: "My Cafe", roleLabel: "Manager", invitationUrl, lang: "en" }),
    buildInvitationEmailText({ inviterName: "Ahmed", workspaceName: "My Cafe", roleLabel: "Manager", invitationUrl, lang: "en" }),
  );

  // --- Invitation AR
  console.log("6. Team Invitation (Arabic)");
  await send(
    "لقد تمت دعوتك للانضمام إلى مقهى أحمد على وكلني",
    buildInvitationEmailHtml({ inviterName: "أحمد", workspaceName: "مقهى أحمد", roleLabel: "Manager", invitationUrl, lang: "ar" }),
    buildInvitationEmailText({ inviterName: "أحمد", workspaceName: "مقهى أحمد", roleLabel: "Manager", invitationUrl, lang: "ar" }),
  );

  console.log("\nDone! Check your inbox.\n");
}

main().catch(console.error);
