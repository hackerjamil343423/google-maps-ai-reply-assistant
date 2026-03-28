import { env } from "@/lib/env";

const MINIMAX_API_BASE = "https://api.minimax.io/v1";

export interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MiniMaxChatCompletion {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function createMiniMaxChatCompletion({
  model = "MiniMax-M2.7",
  messages,
  temperature = 0.1,
  max_tokens,
}: {
  model?: string;
  messages: MiniMaxMessage[];
  temperature?: number;
  max_tokens?: number;
}): Promise<MiniMaxChatCompletion> {
  const apiKey = env.MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured");
  }

  const response = await fetch(`${MINIMAX_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<MiniMaxChatCompletion>;
}
