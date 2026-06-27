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
  const [createOpen, setCreateOpen] = useState(false);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.isActive) ?? workspaces[0],
    [workspaces]
  );
  const ownerCount = useMemo(
    () => workspaces.filter((workspace) => workspace.role === "owner").length,
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
    if (!workspaceName) {
      setError("Workspace name is required.");
      return;
    }

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
      setCreateOpen(false);
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

  function openCreateDialog() {
    setError("");
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    if (creating) return;
    setName("");
    setCreateOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] px-4 py-8 text-[#101528] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
              Workspace control
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#070B18] sm:text-4xl">
              Workspaces
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#586276]">
              Select the active workspace, review your access, or create a new
              workspace when you need another company, team, or location group.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {activeWorkspace && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/analytics")}
                className="rounded-xl border border-[#D8DEEA] bg-white px-5 py-3 text-sm font-semibold text-[#172033] shadow-sm transition hover:border-[#AAB4C8] hover:bg-[#FAFBFD]"
              >
                Open dashboard
              </button>
            )}
            <button
              type="button"
              onClick={openCreateDialog}
              className="rounded-xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#5F30EB]/20 transition hover:bg-[#4F25C8]"
            >
              Create new workspace
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#E0E5EF] bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-[#667085]">Total workspaces</p>
            <p className="mt-2 text-3xl font-bold text-[#101528]">
              {loading ? "-" : workspaces.length}
            </p>
          </div>
          <div className="rounded-xl border border-[#E0E5EF] bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-[#667085]">Active workspace</p>
            <p className="mt-2 truncate text-lg font-semibold text-[#101528]">
              {activeWorkspace?.name ?? "None selected"}
            </p>
          </div>
          <div className="rounded-xl border border-[#E0E5EF] bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-[#667085]">Owned by you</p>
            <p className="mt-2 text-3xl font-bold text-[#101528]">
              {loading ? "-" : ownerCount}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#E0E5EF] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#E7EBF2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#101528]">
                Workspace directory
              </h2>
              <p className="mt-1 text-sm text-[#667085]">
                Open or switch between the workspaces connected to your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadWorkspaces()}
              className="rounded-lg border border-[#D8DEEA] px-3 py-2 text-sm font-semibold text-[#344054] transition hover:border-[#AAB4C8] hover:bg-[#FAFBFD]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="divide-y divide-[#EEF1F6]">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-4 px-5 py-5">
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-[#EDF0F6]" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 animate-pulse rounded bg-[#EDF0F6]" />
                    <div className="h-3 w-24 animate-pulse rounded bg-[#EDF0F6]" />
                  </div>
                </div>
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <h3 className="text-lg font-semibold text-[#101528]">
                No workspaces yet
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667085]">
                Create your first workspace to start onboarding locations, Google
                connections, and review automation settings.
              </p>
              <button
                type="button"
                onClick={openCreateDialog}
                className="mt-6 rounded-xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4F25C8]"
              >
                Create workspace
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF1F6]">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-base font-bold text-[#4F25C8]">
                      {workspace.name.trim().charAt(0).toUpperCase() || "W"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="max-w-full truncate text-base font-bold text-[#101528]">
                          {workspace.name}
                        </h3>
                        {workspace.isActive && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm capitalize text-[#667085]">
                        {workspace.role}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={switchingId === workspace.id}
                    onClick={() => void switchWorkspace(workspace.id)}
                    className="w-full rounded-xl border border-[#D8DEEA] px-4 py-2.5 text-sm font-semibold text-[#172033] transition hover:border-[#5F30EB] hover:text-[#5F30EB] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                  >
                    {switchingId === workspace.id
                      ? "Opening..."
                      : workspace.isActive
                        ? "Open dashboard"
                        : "Switch workspace"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101528]/45 px-4 py-6">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7EBF2] px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#101528]">
                  Create workspace
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Add a workspace for a new team, business, or location group.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close create workspace dialog"
                onClick={closeCreateDialog}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#F2F4F7] hover:text-[#101528]"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={(event) => void createWorkspace(event)} className="space-y-5 px-5 py-5">
              <label className="block">
                <span className="text-sm font-semibold text-[#1D2540]">
                  Workspace name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  placeholder="Example: Riyadh Branch"
                  autoFocus
                  className="mt-2 w-full rounded-xl border border-[#CBD2E1] px-4 py-3 text-base outline-none transition focus:border-[#5F30EB] focus:ring-4 focus:ring-[#5F30EB]/10"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  disabled={creating}
                  className="rounded-xl border border-[#D8DEEA] px-4 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#FAFBFD] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="rounded-xl bg-[#5F30EB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4F25C8] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creating ? "Creating..." : "Create workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
