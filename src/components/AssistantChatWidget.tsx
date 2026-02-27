"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/lib/i18n/language-context";

type ThreadItem = {
  id: string;
  title: string;
  updatedAt: string;
};

type MessageItem = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type ChatLoadResponse = {
  authenticated: boolean;
  threadId: string | null;
  threads: ThreadItem[];
  messages: MessageItem[];
};

type SendMessageResponse = {
  threadId: string | null;
  message: MessageItem;
};

const QUICK_ACTIONS = [
  "How do I connect my Google Business Profile?",
  "Where can I change AI tone and prompt?",
  "How does subscription and usage work?",
];

function formatThreadDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AssistantChatWidget() {
  const { language } = useLanguage();
  const router = useRouter();
  const isRtl = language === "ar";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => Math.max(0, threads.length - (threadId ? 1 : 0)),
    [threadId, threads.length]
  );

  useEffect(() => {
    if (!open) return;
    void loadChat();
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "chat") return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, tab]);

  async function loadChat(nextThreadId?: string) {
    setLoading(true);
    setError("");
    try {
      const query = nextThreadId
        ? `?threadId=${encodeURIComponent(nextThreadId)}`
        : "";
      const res = await fetch(`/api/assistant/chat${query}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ChatLoadResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to load assistant chat.");
      }
      setAuthenticated(Boolean(json.authenticated));
      setThreadId(json.threadId);
      setThreads(json.threads || []);
      setMessages(json.messages || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assistant chat."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(rawMessage?: string) {
    const text = (rawMessage ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    setInput("");

    const optimisticUser: MessageItem = {
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId: threadId || undefined }),
      });

      const json = (await res.json()) as
        | (SendMessageResponse & { error?: string })
        | { error?: string };

      if (!res.ok || !("message" in json)) {
        throw new Error(
          (json as { error?: string }).error || "Failed to send message."
        );
      }

      setThreadId(json.threadId);
      setMessages((prev) => [...prev, json.message]);
      await loadChat(json.threadId || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed bottom-5 z-[80] h-14 w-14 rounded-full shadow-lg transition-all hover:scale-105 ${
          isRtl ? "left-5" : "right-5"
        }`}
        style={{
          background: "linear-gradient(135deg, #5F30EB, #00E0FF)",
          boxShadow: "0 10px 30px rgba(95, 48, 235, 0.35)",
        }}
        aria-label="Open assistant chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto"
          aria-hidden="true"
        >
          <path d="M7 10h10" />
          <path d="M7 14h6" />
          <path d="M21 12a9 9 0 1 1-3.2-6.9L21 3v6h-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`fixed bottom-24 z-[80] h-[72vh] max-h-[680px] w-[calc(100vw-24px)] max-w-[390px] rounded-3xl border border-[#E6E9F8] bg-[#F6F7FBF5] shadow-[0_14px_40px_rgba(4,4,4,0.12)] backdrop-blur-xl ${
            isRtl ? "left-3 md:left-5" : "right-3 md:right-5"
          }`}
        >
          <div className="flex h-full flex-col p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="relative inline-flex rounded-full bg-[#EDEDF3] p-1">
                <button
                  type="button"
                  onClick={() => setTab("chat")}
                  className={`rounded-full px-4 py-1.5 text-base font-semibold transition-colors ${
                    tab === "chat"
                      ? "bg-white text-[#2F2E46]"
                      : "text-[#63627B] hover:text-[#2F2E46]"
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setTab("history")}
                  className={`rounded-full px-4 py-1.5 text-base font-semibold transition-colors ${
                    tab === "history"
                      ? "bg-white text-[#2F2E46]"
                      : "text-[#63627B] hover:text-[#2F2E46]"
                  }`}
                >
                  History
                </button>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#FF4E7D] px-1.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-[#4E4E5E] hover:bg-[#ECECFF]"
                aria-label="Close assistant chat"
              >
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
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {tab === "history" ? (
              <div className="brand-scrollbar flex-1 space-y-2 overflow-y-auto rounded-2xl border border-[#E6E9F8] bg-white/70 p-3">
                {loading && (
                  <p className="text-sm text-[#6A6A82]">Loading history...</p>
                )}
                {!loading && threads.length === 0 && (
                  <p className="text-sm text-[#6A6A82]">No chat history yet.</p>
                )}
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setTab("chat");
                      void loadChat(thread.id);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                      thread.id === threadId
                        ? "border-[#5F30EB55] bg-[#EEF0FF]"
                        : "border-[#E6E9F8] bg-white hover:border-[#5F30EB33]"
                    }`}
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-[#2F2E46]">
                      {thread.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8A8AA0]">
                      {formatThreadDate(thread.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div
                  ref={scrollRef}
                  className="brand-scrollbar mb-3 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[#E6E9F8] bg-white/70 p-3"
                >
                  {messages.length === 0 ? (
                    <div className="space-y-4 pt-8 text-center">
                      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#5F30EB14] text-[#5F30EB]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 3v4" />
                          <path d="M8 7h8" />
                          <path d="M5 12h4" />
                          <path d="M15 12h4" />
                          <path d="M8 17h8" />
                          <path d="M12 17v4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-[#2F2E46]">Hello 👋</p>
                        <p className="text-[28px] font-bold text-[#2F2E46]">
                          How can I help you today?
                        </p>
                      </div>

                      <div className="mx-auto max-w-sm space-y-2 text-left">
                        {QUICK_ACTIONS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => void sendMessage(item)}
                            className="flex w-full items-center gap-2 rounded-xl border border-[#E6E9F8] bg-white px-3 py-2 text-left text-base text-[#3D3D56] hover:border-[#5F30EB44]"
                          >
                            <span>↗</span>
                            <span>{item}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((item, index) => (
                      <div
                        key={`${item.id || "local"}-${index}`}
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          item.role === "user"
                            ? `ml-auto ${
                                isRtl ? "text-right" : "text-left"
                              } bg-[#5F30EB] text-white`
                            : "bg-white text-[#32324A] border border-[#E6E9F8]"
                        }`}
                      >
                        {item.content}
                      </div>
                    ))
                  )}
                </div>

                <div className="mb-2 flex flex-wrap gap-2">
                  {["Domains", "VPS", "Emails", "Account", "Payments"].map(
                    (chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          setInput((prev) =>
                            prev ? `${prev} ${chip}` : `Tell me about ${chip}`
                          )
                        }
                        className="rounded-full border border-[#D8D8E8] bg-white px-3 py-1 text-sm text-[#5A5A74] hover:border-[#5F30EB55]"
                      >
                        {chip}
                      </button>
                    )
                  )}
                </div>

                {error && (
                  <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </p>
                )}

                {!authenticated && (
                  <p className="mb-2 rounded-xl border border-[#5F30EB22] bg-[#EEF0FF] px-3 py-2 text-xs text-[#4E4E5E]">
                    Sign in to unlock account-aware assistant answers.
                    <button
                      type="button"
                      onClick={() => router.push("/GetStarted?mode=login")}
                      className="ml-1 font-semibold text-[#5F30EB] underline"
                    >
                      Log in
                    </button>
                  </p>
                )}

                <div className="rounded-3xl border border-[#D9D9E7] bg-white p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder="Ask assistant anything..."
                      className="max-h-28 flex-1 resize-none bg-transparent text-base text-[#2F2E46] placeholder:text-[#9090A7] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={sending || !input.trim()}
                      className="grid h-11 w-11 place-items-center rounded-full bg-[#ECECF5] text-[#7A7A90] transition-colors hover:bg-[#5F30EB] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <svg
                          className="animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m5 12 7-7 7 7" />
                          <path d="M12 19V5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <p className="pt-2 text-center text-xs text-[#84849A]">
                  Assistant can make mistakes. Double-check important replies.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
