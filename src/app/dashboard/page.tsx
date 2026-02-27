"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

export default function DashboardPage() {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  function handleConnect() {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1500);
  }

  return (
    <DashboardShell activeHref="/dashboard">
      <div className="h-full">
        <div
          className="rounded-3xl border border-[#ffffff]/20 p-6 md:p-10 min-h-[70vh] max-h-[calc(100vh-150px)] backdrop-blur-[80px] overflow-y-auto"
          style={{
            background: "rgba(11,9,10,0.2)",
            boxShadow: "0 -4px 100px 21px #efefef14 inset",
          }}
        >
          <h2 className="text-xl md:text-2xl font-medium mb-6">
            Connect Your Google Business Profile
          </h2>

          <div
            className="flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-[#1f1f1f] p-2"
            style={{ background: "rgba(11,9,10,0.2)" }}
          >
            <input
              readOnly={connected}
              placeholder={
                connected
                  ? "✓ Business profile connected successfully!"
                  : "No business profiles found in your Google account."
              }
              className={`flex-1 px-4 py-3 outline-none bg-transparent ${
                connected ? "text-[#00FFE9]" : "text-gray-300"
              }`}
              type="text"
            />
            <button
              onClick={handleConnect}
              disabled={connecting || connected}
              className="px-6 py-3 rounded-xl font-medium transition-all text-black disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,255,233,0.67), rgba(0,255,233,0.2))",
                boxShadow: "0px 4.65px 9.3px 1.16px #F4F4FE40 inset",
              }}
            >
              {connecting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Connecting…
                </span>
              ) : connected ? (
                "Connected ✓"
              ) : (
                "Connect Business Profile"
              )}
            </button>
          </div>

          {!connected && (
            <div className="mt-8 space-y-4">
              <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                To get started, connect your Google Business Profile so our AI
                can automatically reply to your customer reviews.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {[
                  { step: "1", title: "Connect", desc: "Link your Google Business Profile to Five Star Reply." },
                  { step: "2", title: "Configure", desc: "Set your AI tone, filters, and approval preferences." },
                  { step: "3", title: "Automate", desc: "Let AI reply to reviews 24/7 in your brand voice." },
                ].map((s) => (
                  <div key={s.step} className="rounded-2xl border border-[#ffffff15] p-5"
                    style={{ background: "rgba(11,9,10,0.3)" }}>
                    <div className="w-8 h-8 rounded-full bg-[#00FFE920] border border-[#00FFE940] flex items-center justify-center text-[#00FFE9] font-bold text-sm mb-3">
                      {s.step}
                    </div>
                    <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connected && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-3 text-[#00FFE9]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="text-sm font-medium">
                  Google Business Profile connected. Head to{" "}
                  <Link href="/dashboard/overview" className="underline hover:text-white transition-colors">
                    Overview
                  </Link>{" "}
                  to start managing replies.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Reviews", value: "0", icon: "⭐" },
                  { label: "Replied", value: "0", icon: "✅" },
                  { label: "Pending", value: "0", icon: "⏳" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[#ffffff15] p-5 flex flex-col gap-2"
                    style={{ background: "rgba(11,9,10,0.3)" }}>
                    <span className="text-2xl">{stat.icon}</span>
                    <span className="text-3xl font-bold text-white">{stat.value}</span>
                    <span className="text-gray-400 text-sm">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
