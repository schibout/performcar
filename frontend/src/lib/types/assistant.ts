export type AssistantKind = "assistant" | "communication";

export interface AssistantConversation {
  id: string;
  title: string;
  kind: AssistantKind;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AssistantConversationDetail extends AssistantConversation {
  messages: AssistantMessage[];
}

export interface AssistantConversationListResponse {
  data: AssistantConversation[];
}

export interface AssistantChatPayload {
  conversation_id?: string | null;
  message: string;
  kind?: AssistantKind;
  page?: string;
}

// One `data:` frame of the POST /assistant/chat event stream.
export type AssistantStreamEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "delta"; content: string }
  | { type: "tool"; name: string }
  | { type: "error"; code: string }
  | { type: "done" };
