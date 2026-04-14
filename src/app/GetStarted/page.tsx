"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/lib/i18n/language-context";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="block text-sm font-medium text-[#2E3150]">{label}</span>
      {children}
    </label>
  );
}

function GetStartedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const isLogin = mode === "login";

  const copy = isArabic
    ? {
        badge: "إدارة مراجعاتك بالذكاء الاصطناعي",
        sideTitleLogin: "أدر كل مراجعاتك من مساحة عمل واحدة وهادئة.",
        sideTitleSignup: "ابدأ بتحويل المراجعات الجديدة إلى ثقة ونمو.",
        sideBodyLogin:
          "سجّل الدخول لإنشاء ردود ذكية، ومتابعة الانطباع العام، والحفاظ على نشاط ملف نشاطك التجاري على Google دون إدارة كل شيء يدويًا.",
        sideBodySignup:
          "أنشئ حسابك لربط نشاطك التجاري، وأتمتة الردود، والحفاظ على جودة موحّدة في الرد على المراجعات عبر جميع الفروع.",
        benefitOne: "رد بسرعة أكبر باستخدام ذكاء اصطناعي مخصص لمراجعات الأنشطة التجارية",
        benefitTwo: "حافظ على نبرة موحّدة ومتسقة في جميع الردود",
        benefitThree: "تابع الأداء من لوحة تحكم واحدة",
        builtForTitle: "مصمم خصيصًا لإدارة مراجعات Google",
        builtForBody: "جهد يدوي أقل، وردود أسرع، وإدارة أوضح لسمعة نشاطك التجاري.",
        formTitleLogin: "مرحبًا بعودتك",
        formTitleSignup: "أنشئ حسابك",
        formBodyLogin: "استخدم بريدك الإلكتروني وكلمة المرور للوصول إلى لوحة التحكم.",
        formBodySignup: "أكمل إعداد مساحة العمل ثم تابع إلى خطوة التهيئة.",
        fullName: "الاسم الكامل",
        fullNamePlaceholder: "أدخل اسمك الكامل",
        email: "البريد الإلكتروني",
        emailPlaceholder: "أدخل بريدك الإلكتروني",
        password: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        confirmPassword: "تأكيد كلمة المرور",
        confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
        hidePassword: "إخفاء كلمة المرور",
        showPassword: "إظهار كلمة المرور",
        forgotPassword: "هل نسيت كلمة المرور؟",
        submitLogin: "تسجيل الدخول",
        submitSignup: "إنشاء الحساب",
        loadingLogin: "جارٍ تسجيل الدخول...",
        loadingSignup: "جارٍ إنشاء الحساب...",
        continueWith: "أو المتابعة عبر",
        continueWithGoogle: "المتابعة عبر Gmail",
        signupWithGoogle: "إنشاء حساب عبر Gmail",
        redirecting: "جارٍ التحويل...",
        noAccount: "ليس لديك حساب؟",
        haveAccount: "لديك حساب بالفعل؟",
        signUp: "إنشاء حساب.",
        logIn: "تسجيل الدخول.",
        passwordMismatch: "كلمتا المرور غير متطابقتين.",
        invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        signupFailed: "فشل إنشاء حسابك.",
        authFailed: "فشلت عملية تسجيل الدخول. يرجى المحاولة مرة أخرى.",
        googleFailed: "فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.",
      }
    : {
        badge: "AI review workflow",
        sideTitleLogin: "Manage every review from one calm workspace.",
        sideTitleSignup: "Start turning new reviews into trust and growth.",
        sideBodyLogin:
          "Sign in to generate replies, monitor sentiment, and keep your Google Business profile active without handling everything manually.",
        sideBodySignup:
          "Create your account to connect your business, automate replies, and keep review response quality consistent across every location.",
        benefitOne: "Reply faster with AI tuned for business reviews",
        benefitTwo: "Keep your tone consistent across all responses",
        benefitThree: "Track performance from one dashboard",
        builtForTitle: "Built for Google review operations",
        builtForBody: "Less manual work. Faster replies. Cleaner reputation management.",
        formTitleLogin: "Welcome back",
        formTitleSignup: "Create your account",
        formBodyLogin: "Use your email and password to access your dashboard.",
        formBodySignup: "Set up your workspace and continue to onboarding.",
        fullName: "Full name",
        fullNamePlaceholder: "Enter your full name",
        email: "Email address",
        emailPlaceholder: "Enter your email",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        confirmPassword: "Confirm password",
        confirmPasswordPlaceholder: "Confirm your password",
        hidePassword: "Hide password",
        showPassword: "Show password",
        forgotPassword: "Forgot Password?",
        submitLogin: "Log In",
        submitSignup: "Create Account",
        loadingLogin: "Logging in...",
        loadingSignup: "Creating account...",
        continueWith: "Or continue with",
        continueWithGoogle: "Continue with Gmail",
        signupWithGoogle: "Sign up with Gmail",
        redirecting: "Redirecting...",
        noAccount: "Don't have an account?",
        haveAccount: "Already have an account?",
        signUp: "Sign up.",
        logIn: "Log in.",
        passwordMismatch: "Passwords do not match.",
        invalidCredentials: "Invalid email or password.",
        signupFailed: "Failed to create your account.",
        authFailed: "Authentication failed. Please try again.",
        googleFailed: "Google sign-in failed. Please try again.",
      };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClassName =
    "w-full rounded-2xl border border-[#D9DBF4] bg-white px-4 py-3.5 text-[15px] text-[#111425] placeholder:text-[#9AA0B5] shadow-[0_1px_2px_rgba(17,20,37,0.04)] outline-none transition focus:border-[#5F30EB] focus:ring-4 focus:ring-[#5F30EB]/10";
  const toggleButtonPosition = isArabic ? "left-4" : "right-4";
  const inputPadding = isArabic ? "pl-12 pr-4" : "pr-12 pl-4";

  function switchMode() {
    const nextMode = isLogin ? "signup" : "login";
    router.replace(`/GetStarted?mode=${nextMode}`);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isLogin && password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await authClient.signIn.email({
          email,
          password,
        });
        if (res.error) {
          setError(res.error.message ?? copy.invalidCredentials);
          return;
        }
      } else {
        const res = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (res.error) {
          setError(res.error.message ?? copy.signupFailed);
          return;
        }
        router.push("/onboarding");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(copy.authFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setError("");
    setGoogleLoading(true);
    try {
      const res = (await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      })) as unknown as {
        error?: { message?: string };
        data?: { url?: string } | null;
        url?: string;
      };

      if (res.error) {
        setError(res.error.message ?? copy.googleFailed);
        return;
      }

      const redirectUrl = res.data?.url ?? res.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch {
      setError(copy.googleFailed);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#F6F4FF] px-4 pb-10 pt-28 text-[#040404] sm:px-6 lg:px-8"
      data-no-auto-translate="true"
      translate="no"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#00E0FF]/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[#5F30EB]/12 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-6rem] h-[20rem] w-[20rem] rounded-full bg-white/80 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-[32px] border border-[#D8DAF3] bg-white/82 shadow-[0_28px_80px_rgba(69,47,146,0.16)] backdrop-blur-xl">
          <div className={`grid min-h-[720px] lg:grid-cols-[1.02fr_0.98fr] ${isArabic ? "lg:[direction:rtl]" : ""}`}>
            <aside className="relative flex flex-col justify-between overflow-hidden border-b border-[#ECEEFB] bg-[linear-gradient(180deg,#F8F7FF_0%,#EEF8FF_100%)] p-8 sm:p-10 lg:min-h-[720px] lg:border-b-0 lg:border-r">
              <div className="absolute inset-0 opacity-70">
                <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-[#5F30EB]/10 blur-2xl" />
                <div className="absolute bottom-12 right-10 h-28 w-28 rounded-full bg-[#00E0FF]/20 blur-2xl" />
              </div>

              <div className="relative space-y-8">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D7DBF8] bg-white/80 px-4 py-2 text-sm font-medium text-[#4C35A3] shadow-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#00CFE8]" />
                  {copy.badge}
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-md text-3xl font-semibold leading-tight text-[#12152A] sm:text-4xl">
                    {isLogin ? copy.sideTitleLogin : copy.sideTitleSignup}
                  </h1>
                  <p className="max-w-lg text-[15px] leading-7 text-[#5B607C] sm:text-base">
                    {isLogin ? copy.sideBodyLogin : copy.sideBodySignup}
                  </p>
                </div>

                <div className="grid gap-3">
                  {[copy.benefitOne, copy.benefitTwo, copy.benefitThree].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/72 px-4 py-3 shadow-[0_10px_24px_rgba(95,48,235,0.08)]"
                    >
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5F30EB] text-xs text-white">
                        ✓
                      </span>
                      <p className="text-sm leading-6 text-[#303550]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-8 rounded-[28px] border border-[#D9DDF6] bg-white/85 p-5 shadow-[0_14px_32px_rgba(17,20,37,0.08)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5F30EB_0%,#00D7F2_100%)] text-lg font-semibold text-white">
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#12152A]">{copy.builtForTitle}</p>
                    <p className="mt-1 text-sm text-[#626782]">{copy.builtForBody}</p>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex items-center justify-center bg-white/70 p-6 sm:p-10 lg:p-12">
              <div className="w-full max-w-md">
                <div className="mb-8 space-y-3">
                  <div className={`flex ${isArabic ? "justify-center lg:justify-end" : "justify-center lg:justify-start"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Wakkelni Stars Logo"
                      className="h-12 w-auto object-contain"
                      src="/assets/brand/wakkelni-logo.png"
                    />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight text-[#12152A]">
                      {isLogin ? copy.formTitleLogin : copy.formTitleSignup}
                    </h2>
                    <p className="text-sm leading-6 text-[#66708A]">
                      {isLogin ? copy.formBodyLogin : copy.formBodySignup}
                    </p>
                  </div>
                </div>

                <form id="auth-form" className="space-y-4" onSubmit={handleSubmit}>
                  {!isLogin && (
                    <Field htmlFor="name" label={copy.fullName}>
                      <input
                        id="name"
                        placeholder={copy.fullNamePlaceholder}
                        required
                        className={inputClassName}
                        type="text"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                      />
                    </Field>
                  )}

                  <Field htmlFor="email" label={copy.email}>
                    <input
                      id="email"
                      placeholder={copy.emailPlaceholder}
                      required
                      className={inputClassName}
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </Field>

                  <Field htmlFor="password" label={copy.password}>
                    <div className="relative">
                      <input
                        id="password"
                        placeholder={copy.passwordPlaceholder}
                        required
                        className={`${inputClassName} ${inputPadding}`}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        className={`absolute ${toggleButtonPosition} top-1/2 -translate-y-1/2 text-[#7A8098] transition hover:text-[#303550]`}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                  </Field>

                  {!isLogin && (
                    <Field htmlFor="confirmPassword" label={copy.confirmPassword}>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          placeholder={copy.confirmPasswordPlaceholder}
                          required
                          className={`${inputClassName} ${inputPadding}`}
                          type={showConfirm ? "text" : "password"}
                          name="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className={`absolute ${toggleButtonPosition} top-1/2 -translate-y-1/2 text-[#7A8098] transition hover:text-[#303550]`}
                          onClick={() => setShowConfirm((v) => !v)}
                          aria-label={showConfirm ? copy.hidePassword : copy.showPassword}
                        >
                          <EyeIcon open={showConfirm} />
                        </button>
                      </div>
                    </Field>
                  )}

                  {isLogin && (
                    <div className={isArabic ? "text-left" : "text-right"}>
                      <button
                        type="button"
                        className="text-sm font-medium text-[#5F30EB] transition hover:text-[#4723B4]"
                      >
                        {copy.forgotPassword}
                      </button>
                    </div>
                  )}
                </form>

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  form="auth-form"
                  disabled={loading}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#00E4F0_0%,#76F0D5_100%)] px-5 py-4 text-base font-semibold text-[#0D1320] shadow-[0_16px_34px_rgba(0,224,255,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_40px_rgba(0,224,255,0.34)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      {isLogin ? copy.loadingLogin : copy.loadingSignup}
                    </span>
                  ) : isLogin ? (
                    copy.submitLogin
                  ) : (
                    copy.submitSignup
                  )}
                </button>

                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#E3E6F4]" />
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#8A90A8]">{copy.continueWith}</span>
                  <div className="h-px flex-1 bg-[#E3E6F4]" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#D9DBF4] bg-white px-5 py-4 text-[15px] font-medium text-[#252941] shadow-[0_6px_18px_rgba(17,20,37,0.06)] transition hover:border-[#C9CCEC] hover:bg-[#FAFBFF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon />
                  <span>
                    {googleLoading
                      ? copy.redirecting
                      : isLogin
                        ? copy.continueWithGoogle
                        : copy.signupWithGoogle}
                  </span>
                </button>

                <div className="mt-8 text-center text-sm text-[#66708A]">
                  {isLogin ? (
                    <p>
                      {copy.noAccount}{" "}
                      <button
                        type="button"
                        onClick={switchMode}
                        className="font-semibold text-[#5F30EB] transition hover:text-[#4723B4]"
                      >
                        {copy.signUp}
                      </button>
                    </p>
                  ) : (
                    <p>
                      {copy.haveAccount}{" "}
                      <button
                        type="button"
                        onClick={switchMode}
                        className="font-semibold text-[#5F30EB] transition hover:text-[#4723B4]"
                      >
                        {copy.logIn}
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function GetStartedPage() {
  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50 border-b border-[#5F30EB14] bg-white/88"
        style={{ backdropFilter: "blur(18px)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Wakkelni Stars Logo"
              className="h-10 w-auto object-contain"
              src="/assets/brand/wakkelni-logo.png"
            />
          </Link>
        </div>
      </header>

      <Suspense fallback={null}>
        <GetStartedContent />
      </Suspense>
    </>
  );
}
