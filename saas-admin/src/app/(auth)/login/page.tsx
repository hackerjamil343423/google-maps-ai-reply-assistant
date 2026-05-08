"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { adminAuthClient } from "@/lib/auth/admin-auth-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await adminAuthClient.signIn.email({
        email,
        password,
      });

      if (res.error) {
        setError(res.error.message ?? "Invalid credentials");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[28px] border border-[#E6E1FA] bg-white p-8 shadow-[0_8px_32px_rgba(95,48,235,0.12)]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5F30EB] text-xl font-bold text-white">
            SA
          </div>
          <h1 className="text-2xl font-bold text-[#040404]">SaaS Admin</h1>
          <p className="mt-1 text-sm text-[#9490A8]">
            Sign in to manage your platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#040404]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-3 text-sm text-[#040404] outline-none transition-colors placeholder:text-[#9490A8] focus:border-[#5F30EB] focus:bg-white"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#040404]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E6E1FA] bg-[#F8F7FF] px-4 py-3 text-sm text-[#040404] outline-none transition-colors placeholder:text-[#9490A8] focus:border-[#5F30EB] focus:bg-white"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-[#5F30EB] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(95,48,235,0.24)] transition-colors hover:bg-[#4A1FD4] disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
