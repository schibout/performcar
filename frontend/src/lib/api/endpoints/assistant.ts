import { env } from "@/env";
import api from "@/lib/api/api";
import type {
  AssistantChatPayload,
  AssistantConversationDetail,
  AssistantConversationListResponse,
  AssistantKind,
  AssistantStreamEvent,
} from "@/lib/types/assistant";
import type { MessageResponse } from "@/lib/types/quote";

/** A refusal of the chat request before the stream started (401/403/422/503…). */
export class AssistantChatError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(code ?? `HTTP ${status}`);
    this.name = "AssistantChatError";
  }
}

const postChat = (payload: AssistantChatPayload, signal?: AbortSignal) =>
  fetch(`${env.NEXT_PUBLIC_API_PREFIX}/assistant/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      // Same CSRF header the axios client sends on every request.
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
    signal,
  });

const readErrorCode = async (response: Response): Promise<string | null> => {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    for (const candidate of [body.error, body.detail, body.message]) {
      if (typeof candidate === "string" && candidate) return candidate;
    }
  } catch {
    // Non-JSON body: only the status is meaningful.
  }
  return null;
};

/** Parses complete `data: <json>` frames out of an SSE buffer; returns the unparsed tail. */
export const parseSseFrames = (
  buffer: string,
  onEvent: (event: AssistantStreamEvent) => void,
): string => {
  const frames = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = frames.pop() ?? "";
  for (const frame of frames) {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      onEvent(JSON.parse(data) as AssistantStreamEvent);
    } catch {
      // Ignore a malformed frame rather than killing the whole answer.
    }
  }
  return rest;
};

export const assistantApi = {
  list: (kind: AssistantKind): Promise<AssistantConversationListResponse> =>
    api.get<AssistantConversationListResponse, AssistantConversationListResponse>(
      "/assistant/conversations",
      { params: { kind } },
    ),

  get: (id: string): Promise<AssistantConversationDetail> =>
    api.get<AssistantConversationDetail, AssistantConversationDetail>(
      `/assistant/conversations/${id}`,
    ),

  remove: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/assistant/conversations/${id}`),

  /**
   * Streams a chat turn. axios cannot stream, so this is the one raw fetch of the
   * feature; abort it through `signal`. Resolves when the stream ends.
   */
  streamChat: async (
    payload: AssistantChatPayload,
    onEvent: (event: AssistantStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    let response = await postChat(payload, signal);
    if (response.status === 401) {
      // An expired access token: any axios call runs the app's refresh-and-retry
      // flow (and logs out if the refresh fails), then the chat is retried once.
      await api.get("/users/me").catch(() => undefined);
      response = await postChat(payload, signal);
    }
    if (!response.ok || !response.body) {
      throw new AssistantChatError(response.status, await readErrorCode(response));
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = parseSseFrames(buffer + value, onEvent);
    }
    parseSseFrames(`${buffer}\n\n`, onEvent);
  },
};
