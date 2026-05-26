/**
 * Email HTML templates for Wakkelni.
 *
 * All templates support English ("en") and Arabic ("ar") via the `lang`
 * parameter. Arabic emails render RTL with correct direction attributes.
 *
 * Brand colors:
 *   Primary   #5F30EB  (purple)
 *   Light bg  #F6F4FF
 *   Text      #1A1A2E
 */

export type EmailLang = "en" | "ar";

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

function getBaseUrl() {
  return (
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL)) ||
    "https://wakkelni.com"
  );
}

function logoUrl() {
  return `${getBaseUrl()}/assets/brand/wakkelni-logo.png`;
}

function emailShell(body: string, lang: EmailLang): string {
  const isRtl = lang === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const fontStack = isRtl
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "Arial, Helvetica, sans-serif";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wakkelni</title>
</head>
<body style="margin:0;padding:0;background-color:#F0ECFF;font-family:${fontStack};" dir="${dir}">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F0ECFF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(95,48,235,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5F30EB 0%,#7C3AED 100%);padding:28px 40px 24px;">
              <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                  <td ${isRtl ? 'align="right"' : 'align="left"'}>
                    <img src="${logoUrl()}" alt="Wakkelni" width="140" height="auto"
                      style="display:block;max-width:140px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Decorative accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#A78BFA,#5F30EB,#C4B5FD);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;" dir="${dir}">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #EDE9FF;background:#FAFAFE;" dir="${dir}">
              <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:12px;color:#888888;line-height:1.7;text-align:${isRtl ? "right" : "left"};">
                      ${isRtl
                        ? "تلقيت هذا البريد الإلكتروني لأنك تمتلك حسابًا على منصة وكلني.<br />إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة بأمان."
                        : "You received this email because you have an account on Wakkelni.<br />If you did not request this, you can safely ignore this message."}
                    </p>
                    <p style="margin:0;font-size:11px;color:#BBBBBB;text-align:${isRtl ? "right" : "left"};">
                      © ${new Date().getFullYear()} Wakkelni. ${isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(label: string, href: string, isRtl = false): string {
  return `<a href="${href}"
    style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#5F30EB,#7C3AED);color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:${isRtl ? "0" : "0.2px"};box-shadow:0 4px 12px rgba(95,48,235,0.3);"
  >${escapeHtml(label)}</a>`;
}

function outlineButton(label: string, href: string): string {
  return `<a href="${href}"
    style="display:inline-block;padding:13px 30px;border:2px solid #5F30EB;color:#5F30EB;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600;"
  >${escapeHtml(label)}</a>`;
}

function fallbackLink(href: string, isRtl: boolean): string {
  return `<p style="margin:24px 0 0;font-size:13px;color:#888888;text-align:${isRtl ? "right" : "left"};">
    ${isRtl ? "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:" : "If the button does not work, copy and paste this link into your browser:"}
    <br /><a href="${href}" style="color:#5F30EB;word-break:break-all;">${href}</a>
  </p>`;
}

function infoBox(title: string, items: string[], isRtl: boolean, color = "#F6F4FF", titleColor = "#5F30EB"): string {
  const listItems = items
    .map(
      (item) =>
        `<li style="padding:3px 0;font-size:14px;color:#333333;line-height:1.8;">${item}</li>`
    )
    .join("");

  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;background:${color};border-radius:14px;width:100%;border:1px solid rgba(95,48,235,0.08);">
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${titleColor};text-transform:uppercase;letter-spacing:0.8px;text-align:${isRtl ? "right" : "left"};">${escapeHtml(title)}</p>
        <ul style="margin:0;padding-${isRtl ? "right" : "left"}:18px;" dir="${isRtl ? "rtl" : "ltr"}">
          ${listItems}
        </ul>
      </td>
    </tr>
  </table>`;
}

function detailRow(label: string, value: string, color = "#040404"): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #F0ECFF;">
      <span style="font-size:12px;color:#999999;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(label)}</span>
      <span style="font-size:15px;font-weight:600;color:${color};">${escapeHtml(value)}</span>
    </td>
  </tr>`;
}

function detailTable(rows: string[]): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;border:1px solid #EDE9FF;border-radius:14px;width:100%;overflow:hidden;">
    <tr>
      <td style="padding:20px 28px;">
        <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
          ${rows.join("")}
        </table>
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

const welcomeCopy = {
  en: {
    subject: "Welcome to Wakkelni",
    heading: "Welcome to Wakkelni! 🎉",
    body: (name: string) =>
      `Hi ${escapeHtml(name)}, your account is ready. Connect your Google Business Profile, set your AI tone, and start managing review replies across all your locations.`,
    boxTitle: "What you can do",
    items: [
      "Connect your Google Business locations",
      "Let AI reply to reviews in your brand voice",
      "Invite your team and assign roles",
      "Monitor all locations from one dashboard",
    ],
    cta: "Go to Dashboard",
  },
  ar: {
    subject: "مرحبًا بك في وكلني",
    heading: "مرحبًا بك في وكلني! 🎉",
    body: (name: string) =>
      `مرحبًا ${escapeHtml(name)}، حسابك جاهز الآن. قم بربط ملف أعمالك على Google، وحدد أسلوب الردود بالذكاء الاصطناعي، وابدأ في إدارة ردود التقييمات عبر جميع مواقعك.`,
    boxTitle: "ما يمكنك فعله",
    items: [
      "ربط مواقع أعمالك على Google",
      "دع الذكاء الاصطناعي يرد على التقييمات بأسلوب علامتك التجارية",
      "دعوة فريقك وتعيين الأدوار",
      "متابعة جميع المواقع من لوحة تحكم واحدة",
    ],
    cta: "الذهاب إلى لوحة التحكم",
  },
};

export function buildWelcomeEmailHtml(input: {
  name: string;
  dashboardUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const isRtl = lang === "ar";
  const t = welcomeCopy[lang];

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1A1A2E;line-height:1.3;text-align:${isRtl ? "right" : "left"};">
      ${t.heading}
    </h1>
    <p style="margin:0 0 28px;font-size:16px;color:#555555;line-height:1.8;text-align:${isRtl ? "right" : "left"};">
      ${t.body(input.name)}
    </p>

    ${infoBox(t.boxTitle, t.items, isRtl)}

    <p style="margin:0 0 24px;text-align:${isRtl ? "right" : "left"};">
      ${primaryButton(t.cta, input.dashboardUrl, isRtl)}
    </p>
  `;

  return emailShell(body, lang);
}

export function buildWelcomeEmailText(input: {
  name: string;
  dashboardUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  if (lang === "ar") {
    return [
      `مرحبًا بك في وكلني، ${input.name}!`,
      "",
      "حسابك جاهز الآن. قم بربط ملف أعمالك على Google وابدأ في إدارة ردود التقييمات.",
      "",
      "ابدأ الآن: " + input.dashboardUrl,
    ].join("\n");
  }
  return [
    `Welcome to Wakkelni, ${input.name}!`,
    "",
    "Your account is ready. Connect your Google Business Profile and start managing review replies.",
    "",
    "Get started: " + input.dashboardUrl,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Trial expiry email
// ---------------------------------------------------------------------------

const trialExpiryCopy = {
  en: {
    subject: (date: string) => `Your Wakkelni trial ends on ${date}`,
    heading: (date: string) => `Your trial ends on ${escapeHtml(date)}`,
    body: (name: string, workspace: string) =>
      `Hi ${escapeHtml(name)}, the free trial for <strong>${escapeHtml(workspace)}</strong> is coming to an end. Upgrade now to keep your AI replies, team access, and all connected locations running without interruption.`,
    boxTitle: "What happens after the trial",
    items: [
      "Automatic AI replies will be paused",
      "Your data and settings are kept for 30 days",
      "Team members will lose access to the workspace",
    ],
    cta: "Upgrade Now",
    ctaOutline: "View Plans",
  },
  ar: {
    subject: (date: string) => `تجربتك المجانية في وكلني تنتهي في ${date}`,
    heading: (date: string) => `تجربتك المجانية تنتهي في ${escapeHtml(date)}`,
    body: (name: string, workspace: string) =>
      `مرحبًا ${escapeHtml(name)}، تقترب نهاية التجربة المجانية لـ <strong>${escapeHtml(workspace)}</strong>. قم بالترقية الآن للحفاظ على ردود الذكاء الاصطناعي وصلاحيات الفريق وجميع المواقع المتصلة.`,
    boxTitle: "ماذا يحدث بعد انتهاء التجربة",
    items: [
      "سيتم إيقاف الردود التلقائية للذكاء الاصطناعي",
      "ستُحفظ بياناتك وإعداداتك لمدة 30 يومًا",
      "سيفقد أعضاء الفريق صلاحية الوصول إلى مساحة العمل",
    ],
    cta: "قم بالترقية الآن",
    ctaOutline: "عرض الخطط",
  },
};

export function buildTrialExpiryEmailHtml(input: {
  name: string;
  workspaceName: string;
  trialEndsAt: Date;
  upgradeUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const isRtl = lang === "ar";
  const t = trialExpiryCopy[lang];
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  const formattedDate = input.trialEndsAt.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1A1A2E;line-height:1.3;text-align:${isRtl ? "right" : "left"};">
      ${t.heading(formattedDate)}
    </h1>
    <p style="margin:0 0 28px;font-size:16px;color:#555555;line-height:1.8;text-align:${isRtl ? "right" : "left"};">
      ${t.body(input.name, input.workspaceName)}
    </p>

    ${infoBox(t.boxTitle, t.items, isRtl)}

    <p style="margin:0 0 16px;text-align:${isRtl ? "right" : "left"};">
      ${primaryButton(t.cta, input.upgradeUrl, isRtl)}
    </p>
    <p style="margin:0 0 0;text-align:${isRtl ? "right" : "left"};">
      ${outlineButton(t.ctaOutline, input.upgradeUrl)}
    </p>
  `;

  return emailShell(body, lang);
}

export function buildTrialExpiryEmailText(input: {
  name: string;
  workspaceName: string;
  trialEndsAt: Date;
  upgradeUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  const formattedDate = input.trialEndsAt.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (lang === "ar") {
    return [
      `تجربتك المجانية في وكلني تنتهي في ${formattedDate}`,
      "",
      `مرحبًا ${input.name}، تقترب نهاية التجربة المجانية لـ ${input.workspaceName}.`,
      "قم بالترقية الآن للحفاظ على خدمات الذكاء الاصطناعي وصلاحيات الفريق.",
      "",
      "رابط الترقية: " + input.upgradeUrl,
    ].join("\n");
  }
  return [
    `Your Wakkelni trial ends on ${formattedDate}`,
    "",
    `Hi ${input.name}, the free trial for ${input.workspaceName} is coming to an end.`,
    "Upgrade now to keep AI replies, team access, and all connected locations running.",
    "",
    "Upgrade here: " + input.upgradeUrl,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Renewal failed email
// ---------------------------------------------------------------------------

const renewalFailedCopy = {
  en: {
    subject: (workspace: string) => `Action required: subscription renewal failed for ${workspace}`,
    heading: "Subscription renewal failed",
    body: (name: string, plan: string, workspace: string) =>
      `Hi ${escapeHtml(name)}, we were unable to renew your <strong>${escapeHtml(plan)}</strong> subscription for <strong>${escapeHtml(workspace)}</strong>. Your account is on hold. Please update your payment details to restore access.`,
    boxTitle: "What this means",
    items: [
      "AI replies and posting have been paused",
      "Your data and settings are preserved",
      "Access is restored immediately after payment",
    ],
    cta: "Update Payment Details",
  },
  ar: {
    subject: (workspace: string) => `إجراء مطلوب: فشل تجديد الاشتراك لـ ${workspace}`,
    heading: "فشل تجديد الاشتراك",
    body: (name: string, plan: string, workspace: string) =>
      `مرحبًا ${escapeHtml(name)}، لم نتمكن من تجديد اشتراك <strong>${escapeHtml(plan)}</strong> الخاص بـ <strong>${escapeHtml(workspace)}</strong>. تم تعليق حسابك. يرجى تحديث بيانات الدفع لاستعادة الوصول.`,
    boxTitle: "ماذا يعني هذا",
    items: [
      "تم إيقاف الردود التلقائية للذكاء الاصطناعي",
      "بياناتك وإعداداتك محفوظة",
      "سيتم استعادة الوصول فور إتمام الدفع",
    ],
    cta: "تحديث بيانات الدفع",
  },
};

export function buildRenewalFailedEmailHtml(input: {
  name: string;
  workspaceName: string;
  plan: string;
  upgradeUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const isRtl = lang === "ar";
  const t = renewalFailedCopy[lang];

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1A1A2E;line-height:1.3;text-align:${isRtl ? "right" : "left"};">
      ${t.heading}
    </h1>
    <p style="margin:0 0 28px;font-size:16px;color:#555555;line-height:1.8;text-align:${isRtl ? "right" : "left"};">
      ${t.body(input.name, input.plan, input.workspaceName)}
    </p>

    ${infoBox(t.boxTitle, t.items, isRtl, "#FFF5F5", "#C53030")}

    <p style="margin:0 0 16px;text-align:${isRtl ? "right" : "left"};">
      ${primaryButton(t.cta, input.upgradeUrl, isRtl)}
    </p>
  `;

  return emailShell(body, lang);
}

export function buildRenewalFailedEmailText(input: {
  name: string;
  workspaceName: string;
  plan: string;
  upgradeUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  if (lang === "ar") {
    return [
      `فشل تجديد الاشتراك - ${input.workspaceName}`,
      "",
      `مرحبًا ${input.name}، لم نتمكن من تجديد اشتراك ${input.plan} الخاص بـ ${input.workspaceName}.`,
      "يرجى تحديث بيانات الدفع لاستعادة الوصول.",
      "",
      "رابط تحديث الدفع: " + input.upgradeUrl,
    ].join("\n");
  }
  return [
    `Subscription renewal failed - ${input.workspaceName}`,
    "",
    `Hi ${input.name}, we were unable to renew your ${input.plan} subscription for ${input.workspaceName}.`,
    "Please update your payment details to restore access.",
    "",
    "Update payment here: " + input.upgradeUrl,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Cancellation scheduled email
// ---------------------------------------------------------------------------

function formatAccessUntil(date: Date | null | undefined, lang: EmailLang): string {
  if (!date) {
    return lang === "ar" ? "نهاية فترتك الحالية" : "the end of your current period";
  }
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const cancellationCopy = {
  en: {
    subject: (plan: string, date: string) => `Your ${plan} subscription ends on ${date}`,
    heading: (date: string) => `Your subscription will end on ${escapeHtml(date)}`,
    body: (name: string, plan: string, workspace: string, date: string) =>
      `Hi ${escapeHtml(name)}, we've scheduled the cancellation of your <strong>${escapeHtml(plan)}</strong> subscription for <strong>${escapeHtml(workspace)}</strong>. You'll keep full access until ${escapeHtml(date)}.`,
    boxTitle: "What happens next",
    items: (date: string) => [
      `Full access to AI replies and Google Business features continues until ${date}`,
      "No further charges will be made",
      "Your data and settings are preserved",
      "You can re-subscribe any time from your billing settings",
    ],
    cta: "Go to Billing Settings",
  },
  ar: {
    subject: (plan: string, date: string) => `اشتراكك في ${plan} ينتهي في ${date}`,
    heading: (date: string) => `اشتراكك سينتهي في ${escapeHtml(date)}`,
    body: (name: string, plan: string, workspace: string, date: string) =>
      `مرحبًا ${escapeHtml(name)}، لقد قمنا بجدولة إلغاء اشتراك <strong>${escapeHtml(plan)}</strong> الخاص بـ <strong>${escapeHtml(workspace)}</strong>. ستحتفظ بالوصول الكامل حتى ${escapeHtml(date)}.`,
    boxTitle: "ماذا سيحدث بعد ذلك",
    items: (date: string) => [
      `الوصول الكامل لردود الذكاء الاصطناعي وميزات Google Business يستمر حتى ${date}`,
      "لن يتم خصم أي رسوم إضافية",
      "بياناتك وإعداداتك محفوظة",
      "يمكنك إعادة الاشتراك في أي وقت من إعدادات الفوترة",
    ],
    cta: "الذهاب إلى إعدادات الفوترة",
  },
};

export function buildCancellationScheduledEmailHtml(input: {
  name: string;
  workspaceName: string;
  plan: string;
  accessUntil: Date | null;
  billingUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const isRtl = lang === "ar";
  const t = cancellationCopy[lang];
  const accessDate = formatAccessUntil(input.accessUntil, lang);

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1A1A2E;line-height:1.3;text-align:${isRtl ? "right" : "left"};">
      ${t.heading(accessDate)}
    </h1>
    <p style="margin:0 0 28px;font-size:16px;color:#555555;line-height:1.8;text-align:${isRtl ? "right" : "left"};">
      ${t.body(input.name, input.plan, input.workspaceName, accessDate)}
    </p>

    ${infoBox(t.boxTitle, t.items(accessDate), isRtl)}

    <p style="margin:0 0 16px;text-align:${isRtl ? "right" : "left"};">
      ${primaryButton(t.cta, input.billingUrl, isRtl)}
    </p>
  `;

  return emailShell(body, lang);
}

export function buildCancellationScheduledEmailText(input: {
  name: string;
  workspaceName: string;
  plan: string;
  accessUntil: Date | null;
  billingUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const accessDate = formatAccessUntil(input.accessUntil, lang);

  if (lang === "ar") {
    return [
      `اشتراك ${input.plan} سينتهي في ${accessDate}`,
      "",
      `مرحبًا ${input.name}، تم جدولة إلغاء اشتراك ${input.plan} الخاص بـ ${input.workspaceName}.`,
      `ستحتفظ بالوصول الكامل حتى ${accessDate}. لن يتم خصم أي رسوم إضافية.`,
      "",
      `هل غيّرت رأيك؟ أعد الاشتراك هنا: ${input.billingUrl}`,
    ].join("\n");
  }
  return [
    `Your ${input.plan} subscription will end on ${accessDate}`,
    "",
    `Hi ${input.name}, we've scheduled the cancellation of your ${input.plan} subscription for ${input.workspaceName}.`,
    `You'll keep full access until ${accessDate}. No further charges will be made.`,
    "",
    `Change your mind? Re-subscribe here: ${input.billingUrl}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Downgrade ready email
// ---------------------------------------------------------------------------

const downgradeCopy = {
  en: {
    subject: (toPlan: string) => `Activate your ${toPlan} subscription`,
    heading: (toPlan: string) => `Your ${escapeHtml(toPlan)} plan is ready to activate`,
    body: (name: string, fromPlan: string, workspace: string, toPlan: string) =>
      `Hi ${escapeHtml(name)}, your <strong>${escapeHtml(fromPlan)}</strong> subscription for <strong>${escapeHtml(workspace)}</strong> has ended. To continue with the <strong>${escapeHtml(toPlan)}</strong> plan, complete your new subscription below.`,
    labels: { previous: "Previous plan", newPlan: "New plan", accessEnded: "Access ended" },
    cta: (toPlan: string) => `Activate ${toPlan}`,
  },
  ar: {
    subject: (toPlan: string) => `قم بتفعيل اشتراك ${toPlan}`,
    heading: (toPlan: string) => `خطة ${escapeHtml(toPlan)} جاهزة للتفعيل`,
    body: (name: string, fromPlan: string, workspace: string, toPlan: string) =>
      `مرحبًا ${escapeHtml(name)}، انتهى اشتراك <strong>${escapeHtml(fromPlan)}</strong> الخاص بـ <strong>${escapeHtml(workspace)}</strong>. لمتابعة خطة <strong>${escapeHtml(toPlan)}</strong>، أكمل اشتراكك الجديد أدناه.`,
    labels: { previous: "الخطة السابقة", newPlan: "الخطة الجديدة", accessEnded: "انتهى الوصول في" },
    cta: (toPlan: string) => `تفعيل ${toPlan}`,
  },
};

export function buildDowngradeReadyEmailHtml(input: {
  name: string;
  workspaceName: string;
  fromPlan: string;
  toPlan: string;
  accessUntil: Date | null;
  checkoutUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const isRtl = lang === "ar";
  const t = downgradeCopy[lang];
  const accessDate = formatAccessUntil(input.accessUntil, lang);

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1A1A2E;line-height:1.3;text-align:${isRtl ? "right" : "left"};">
      ${t.heading(input.toPlan)}
    </h1>
    <p style="margin:0 0 28px;font-size:16px;color:#555555;line-height:1.8;text-align:${isRtl ? "right" : "left"};">
      ${t.body(input.name, input.fromPlan, input.workspaceName, input.toPlan)}
    </p>

    ${detailTable([
      detailRow(t.labels.previous, input.fromPlan),
      detailRow(t.labels.newPlan, input.toPlan, "#5F30EB"),
      detailRow(t.labels.accessEnded, accessDate),
    ])}

    <p style="margin:0 0 16px;text-align:${isRtl ? "right" : "left"};">
      ${primaryButton(t.cta(input.toPlan), input.checkoutUrl, isRtl)}
    </p>

    ${fallbackLink(input.checkoutUrl, isRtl)}
  `;

  return emailShell(body, lang);
}

export function buildDowngradeReadyEmailText(input: {
  name: string;
  workspaceName: string;
  fromPlan: string;
  toPlan: string;
  accessUntil: Date | null;
  checkoutUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  if (lang === "ar") {
    return [
      `خطة ${input.toPlan} جاهزة للتفعيل`,
      "",
      `مرحبًا ${input.name}، انتهى اشتراك ${input.fromPlan} الخاص بـ ${input.workspaceName}.`,
      `لمتابعة خطة ${input.toPlan}، أكمل اشتراكك الجديد هنا:`,
      "",
      input.checkoutUrl,
    ].join("\n");
  }
  return [
    `Your ${input.toPlan} subscription is ready to activate`,
    "",
    `Hi ${input.name}, your ${input.fromPlan} subscription for ${input.workspaceName} has ended.`,
    `To continue with the ${input.toPlan} plan, complete your new subscription here:`,
    "",
    input.checkoutUrl,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Team invitation email
// ---------------------------------------------------------------------------

const invitationCopy = {
  en: {
    subject: (inviter: string, workspace: string) =>
      `${inviter} invited you to ${workspace} on Wakkelni`,
    heading: (workspace: string) => `You've been invited to join ${escapeHtml(workspace)}`,
    body: (inviter: string) =>
      `${escapeHtml(inviter)} has invited you to collaborate on Wakkelni. Review the details below and accept to get started.`,
    labels: { workspace: "Workspace", invitedBy: "Invited by", role: "Your role", scope: "Access scope" },
    cta: "Accept Invitation",
    expiry: "This invitation expires in 7 days. If you were not expecting this, you can safely ignore this email.",
    allLocations: "All locations in the workspace",
  },
  ar: {
    subject: (inviter: string, workspace: string) =>
      `${inviter} دعاك للانضمام إلى ${workspace} على وكلني`,
    heading: (workspace: string) => `لقد تمت دعوتك للانضمام إلى ${escapeHtml(workspace)}`,
    body: (inviter: string) =>
      `دعاك ${escapeHtml(inviter)} للتعاون على منصة وكلني. راجع التفاصيل أدناه واقبل الدعوة للبدء.`,
    labels: { workspace: "مساحة العمل", invitedBy: "الدعوة من", role: "دورك", scope: "نطاق الوصول" },
    cta: "قبول الدعوة",
    expiry: "تنتهي صلاحية هذه الدعوة خلال 7 أيام. إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني.",
    allLocations: "جميع المواقع في مساحة العمل",
  },
};

export function buildInvitationEmailHtml(input: {
  inviterName: string;
  workspaceName: string;
  roleLabel: string;
  businessName?: string | null;
  invitationUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const isRtl = lang === "ar";
  const t = invitationCopy[lang];
  const scopeText = input.businessName ?? t.allLocations;

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1A1A2E;line-height:1.3;text-align:${isRtl ? "right" : "left"};">
      ${t.heading(input.workspaceName)}
    </h1>
    <p style="margin:0 0 28px;font-size:16px;color:#555555;line-height:1.8;text-align:${isRtl ? "right" : "left"};">
      ${t.body(input.inviterName)}
    </p>

    ${detailTable([
      detailRow(t.labels.workspace, input.workspaceName),
      detailRow(t.labels.invitedBy, input.inviterName),
      detailRow(t.labels.role, input.roleLabel, "#5F30EB"),
      detailRow(t.labels.scope, scopeText),
    ])}

    <p style="margin:0 0 24px;text-align:${isRtl ? "right" : "left"};">
      ${primaryButton(t.cta, input.invitationUrl, isRtl)}
    </p>

    <p style="margin:0 0 0;font-size:13px;color:#888888;line-height:1.7;text-align:${isRtl ? "right" : "left"};">
      ${t.expiry}
    </p>

    ${fallbackLink(input.invitationUrl, isRtl)}
  `;

  return emailShell(body, lang);
}

export function buildInvitationEmailText(input: {
  inviterName: string;
  workspaceName: string;
  roleLabel: string;
  businessName?: string | null;
  invitationUrl: string;
  lang?: EmailLang;
}): string {
  const lang = input.lang ?? "en";
  const scopeText = input.businessName ?? (lang === "ar" ? "جميع المواقع في مساحة العمل" : "All locations in the workspace");

  if (lang === "ar") {
    return [
      `لقد تمت دعوتك للانضمام إلى ${input.workspaceName} على وكلني.`,
      "",
      `من: ${input.inviterName}`,
      `الدور: ${input.roleLabel}`,
      `نطاق الوصول: ${scopeText}`,
      "",
      `اقبل دعوتك هنا (تنتهي خلال 7 أيام): ${input.invitationUrl}`,
    ].join("\n");
  }
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
