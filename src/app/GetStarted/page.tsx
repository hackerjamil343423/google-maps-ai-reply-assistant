"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";

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

function GetStartedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const isLogin = mode === "login";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("Passwords do not match.");
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
          setError(res.error.message ?? "Invalid email or password.");
          return;
        }
      } else {
        const res = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (res.error) {
          setError(res.error.message ?? "Failed to create your account.");
          return;
        }
        // New users go through onboarding
        router.push("/onboarding");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Authentication failed. Please try again.");
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
        setError(res.error.message ?? "Google sign-in failed. Please try again.");
        return;
      }

      const redirectUrl = res.data?.url ?? res.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen h-screen overflow-y-auto flex items-center justify-center text-[#040404] px-4 pt-24 pb-12"
      style={{
        background: "#F6F4FF",
        boxShadow: "inset 0px -4.65px 116.24px 24.41px #EFEFEF14",
        backdropFilter: "blur(89px)",
      }}
    >
      <div className="w-full max-w-5xl">
        <div
          className="backdrop-blur-[60px] border border-[#5F30EB33] rounded-2xl shadow-lg overflow-hidden"
          style={{ background: "rgba(255,255,255,0.82)" }}
        >
          <div className="flex flex-col md:flex-row">
            {/* Left Panel */}
            <div className="w-full md:w-1/2 p-10 flex flex-col items-center justify-center text-center gap-6">
              <div className="w-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Wakkelni Stars Logo"
                  className="h-10 w-auto object-contain"
                  src="/assets/brand/wakkelni-logo.png"
                />
              </div>
              <p className="text-[#5F30EB] text-lg">Connect With AI</p>
              <p className="text-[#6A6A82] text-sm max-w-xs leading-relaxed">
                {isLogin
                  ? "Welcome back. Log in to manage your AI-powered review replies."
                  : "Join thousands of businesses using AI to respond to reviews faster and smarter."}
              </p>
            </div>

            {/* Right Panel — Form */}
            <div className="w-full md:w-1/2 p-10">
              <h2 className="text-2xl font-semibold mb-6 text-center text-[#040404]">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>

              <form id="auth-form" className="space-y-5" onSubmit={handleSubmit}>
                {/* Name — signup only */}
                {!isLogin && (
                  <input
                    placeholder="Enter your full name"
                    required
                    className="w-full px-5 py-4 rounded-lg text-[#4F4F63] focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(255,255,255,0.13)",
                    }}
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                )}

                {/* Email */}
                <input
                  placeholder="Enter your email"
                  required
                  className="w-full px-5 py-4 rounded-lg text-[#4F4F63] focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(255,255,255,0.13)",
                  }}
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />

                {/* Password */}
                <div className="relative">
                  <input
                    placeholder="Enter your password"
                    required
                    className="w-full px-5 py-4 pr-12 rounded-lg text-[#4F4F63] focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(255,255,255,0.13)",
                    }}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A6A82] hover:text-[#4F4F63] cursor-pointer"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                {/* Confirm Password — signup only */}
                {!isLogin && (
                  <div className="relative">
                    <input
                      placeholder="Confirm your password"
                      required
                      className="w-full px-5 py-4 pr-12 rounded-lg text-[#4F4F63] focus:outline-none focus:ring-2 focus:ring-[#5F30EB]/50 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.9)",
                        border: "1px solid rgba(255,255,255,0.13)",
                      }}
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A6A82] hover:text-[#4F4F63] cursor-pointer"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                )}

                {/* Forgot Password — login only */}
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-sm text-[#6A6A82] hover:text-[#5F30EB] transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </form>

              {/* Error message */}
              {error && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="flex items-center justify-center gap-3 py-4 w-full mt-4 rounded-lg border text-[#4F4F63] hover:opacity-90 transition-opacity"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,255,255,0.13)",
                }}
              >
                <GoogleIcon />
                <span>
                  {googleLoading
                    ? "Redirecting..."
                    : isLogin
                      ? "or Continue with Gmail"
                      : "Sign up with Gmail"}
                </span>
              </button>

              {/* Submit */}
              <button
                type="submit"
                form="auth-form"
                disabled={loading}
                className="w-full mt-4 py-4 rounded-full font-semibold text-black transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,255,233,0.67), rgba(0,255,233,0.13))",
                }}
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
                    {isLogin ? "Logging in..." : "Creating account..."}
                  </span>
                ) : isLogin ? (
                  "Log In"
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Switch mode */}
              <div className="mt-8 text-center">
                {isLogin ? (
                  <p className="text-[#6A6A82]">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="text-[#5F30EB] hover:underline font-medium cursor-pointer"
                    >
                      Sign up.
                    </button>
                  </p>
                ) : (
                  <p className="text-[#6A6A82]">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="text-[#5F30EB] hover:underline font-medium cursor-pointer"
                    >
                      Log in.
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <>
      {/* Fixed Header — logo only, no nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#5F30EB20]"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Wakkelni Stars Logo"
                className="h-10 w-auto object-contain"
                src="/assets/brand/wakkelni-logo.png"
              />
            </div>
          </Link>
        </div>
      </header>

      <Suspense fallback={null}>
        <GetStartedContent />
      </Suspense>
    </>
  );
}


