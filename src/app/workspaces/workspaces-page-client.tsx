"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type WorkspaceEntry = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

export default function WorkspacesPageClient() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.isActive),
    [workspaces]
  );

  async function loadWorkspaces() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { workspaces?: WorkspaceEntry[]; error?: string }
        | null;
      if (!res.ok) throw new Error(json?.error || "Failed to load workspaces.");
      setWorkspaces(json?.workspaces ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const workspaceName = name.trim();
    if (!workspaceName) return;

    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      });
      const json = (await res.json().catch(() => null)) as
        | { workspace?: WorkspaceEntry; error?: string }
        | null;
      if (!res.ok || !json?.workspace) {
        throw new Error(json?.error || "Failed to create workspace.");
      }
      setName("");
      await loadWorkspaces();
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace.");
    } finally {
      setCreating(false);
    }
  }

  async function switchWorkspace(workspaceId: string) {
    setSwitchingId(workspaceId);
    setError("");
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Failed to switch workspace.");
      setWorkspaces((current) =>
        current.map((workspace) => ({
          ...workspace,
          isActive: workspace.id === workspaceId,
        }))
      );
      router.push("/dashboard/analytics");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch workspace.");
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FB] px-4 py-8 text-[#111425]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
            <p className="mt-2 text-sm text-[#66708A]">
              Create, select, and manage the workspaces connected to your account.
            </p>
          </div>
          {activeWorkspace && (
            <button
              type="button"
              onClick={() => router.push("/dashboard/analytics")}
              className="rounded-xl bg-[#111425] px-4 py-2.5 text-sm font-medium text-white"
            >
              Open dashboard
            </button>
          )}
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-[#E2E6F0] bg-white">
            <div className="border-b border-[#E2E6F0] px-5 py-4">
              <h2 className="text-base font-semibold">Your workspaces</h2>
            </div>
            {loading ? (
              <p className="px-5 py-8 text-sm text-[#66708A]">Loading workspaces...</p>
            ) : workspaces.length === 0 ? (
              <div className="px-5 py-10">
                <h3 className="text-lg font-semibold">No workspace yet</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#66708A]">
                  Create your first workspace to continue onboarding and connect your Google Business Profile.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF1F6]">
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{workspace.name}</h3>
                        {workspace.isActive && (
                          <span className="rounded-full bg-[#EAF8EF] px-2 py-1 text-xs font-medium text-[#167A3E]">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs capitalize text-[#66708A]">{workspace.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void switchWorkspace(workspace.id)}
                      disabled={switchingId === workspace.id}
                      className="rounded-xl border border-[#D8DDE8] px-3 py-2 text-sm font-medium text-[#111425] disabled:opacity-60"
                    >
                      {switchingId === workspace.id
                        ? "Opening..."
                        : workspace.isActive
                          ? "Open"
                          : "Switch"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => void createWorkspace(event)}
            className="h-fit rounded-lg border border-[#E2E6F0] bg-white p-5"
          >
            <h2 className="text-base font-semibold">Create workspace</h2>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-[#33384F]">Workspace name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="Example: Riyadh Branch"
                className="mt-2 w-full rounded-xl border border-[#D8DDE8] px-3 py-2.5 text-sm outline-none focus:border-[#5F30EB] focus:ring-4 focus:ring-[#5F30EB]/10"
              />
            </label>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="mt-4 w-full rounded-xl bg-[#5F30EB] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
