"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type InviteDetails = {
  email: string;
  role: string;
  businessName: string | null;
  inviterName: string | null;
  workspaceName: string;
  isExpired: boolean;
  isAccepted: boolean;
  requiresMatchingEmail: boolean;
  signedIn: boolean;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const authRedirect = useMemo(
    () => `/GetStarted?mode=login&redirect=${encodeURIComponent(`/invite/${token}`)}`,
    [token]
  );
  const signupRedirect = useMemo(
    () => `/GetStarted?mode=signup&redirect=${encodeURIComponent(`/invite/${token}`)}`,
    [token]
  );

  useEffect(() => {
    let ignore = false;

    async function loadInvitation() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/team/invitations/${token}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | (InviteDetails & { error?: string })
          | null;

        if (!res.ok) {
          throw new Error(json?.error || "Invitation not found.");
        }

        if (!ignore) {
          setDetails(json);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "Failed to load invitation."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInvitation();
    return () => {
      ignore = true;
    };
  }, [token]);

  async function acceptInvitation() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error || "Failed to accept invitation.");
      }
      router.push("/dashboard/settings?section=team");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation."
      );
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F4FF] px-4">
        <p className="text-sm text-[#6A6A82]">Loading invitation...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F4FF] px-4 py-8">
      <section className="w-full max-w-xl rounded-[32px] border border-[#D8DAF3] bg-white p-8 shadow-[0_28px_80px_rgba(69,47,146,0.12)]">
        <h1 className="text-2xl font-semibold text-[#12152A]">
          Team invitation
        </h1>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {details && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#E6E9F8] bg-[#FBFBFF] p-5">
              <p className="text-sm text-[#4F4F63]">
                You were invited to join{" "}
                <span className="font-semibold text-[#12152A]">
                  {details.workspaceName}
                </span>
                .
              </p>
              <div className="mt-4 space-y-2 text-sm text-[#4F4F63]">
                <p>
                  <span className="font-medium text-[#12152A]">Email:</span>{" "}
                  {details.email}
                </p>
                <p>
                  <span className="font-medium text-[#12152A]">Role:</span>{" "}
                  {details.role}
                </p>
                <p>
                  <span className="font-medium text-[#12152A]">Invited by:</span>{" "}
                  {details.inviterName || "A teammate"}
                </p>
                <p>
                  <span className="font-medium text-[#12152A]">Business:</span>{" "}
                  {details.businessName || "Workspace-wide access"}
                </p>
              </div>
            </div>

            {details.isAccepted ? (
              <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                This invitation has already been accepted.
              </p>
            ) : details.isExpired ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                This invitation has expired. Ask your workspace owner to send a new one.
              </p>
            ) : !details.signedIn ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={authRedirect}
                  className="rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white"
                >
                  Log in to accept
                </Link>
                <Link
                  href={signupRedirect}
                  className="rounded-2xl border border-[#D8DAF3] px-5 py-3 text-sm font-medium text-[#12152A]"
                >
                  Create account
                </Link>
              </div>
            ) : details.requiresMatchingEmail ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                You are signed in with a different email. Log in with {details.email} to accept this invitation.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void acceptInvitation()}
                disabled={accepting}
                className="rounded-2xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {accepting ? "Accepting..." : "Accept invitation"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
