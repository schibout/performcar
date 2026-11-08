import { describe, expect, it } from "vitest";

import { buildCommunicationPrompt } from "@/components/assistant/communication-prompt";
import type { AssistantStreamEvent } from "@/lib/types/assistant";

import { parseSseFrames } from "../assistant";

describe("parseSseFrames", () => {
  it("emits complete frames and keeps a partial one for the next chunk", () => {
    const events: AssistantStreamEvent[] = [];
    const rest = parseSseFrames(
      'data: {"type":"conversation","id":"c1","title":"T"}\n\ndata: {"type":"delta","content":"Bon"}\r\n\r\ndata: {"type":"del',
      (event) => events.push(event),
    );
    expect(events).toEqual([
      { type: "conversation", id: "c1", title: "T" },
      { type: "delta", content: "Bon" },
    ]);
    expect(parseSseFrames(`${rest}ta","content":"jour"}\n\n`, (event) => events.push(event))).toBe(
      "",
    );
    expect(events.at(-1)).toEqual({ type: "delta", content: "jour" });
  });

  it("skips malformed frames and comments", () => {
    const events: AssistantStreamEvent[] = [];
    parseSseFrames(': ping\n\ndata: {oops\n\ndata: {"type":"done"}\n\n', (event) =>
      events.push(event),
    );
    expect(events).toEqual([{ type: "done" }]);
  });
});

describe("buildCommunicationPrompt", () => {
  it("builds a French prompt with reference, tone, channel and instructions", () => {
    expect(
      buildCommunicationPrompt({
        reference: " QUO-2026-001 ",
        type: "followUp",
        channel: "email",
        tone: "warm",
        instructions: "Mentionner le financement",
      }),
    ).toBe(
      "Rédige un email de relance pour un devis resté sans réponse pour le devis QUO-2026-001. Ton : chaleureux. Canal : email. Consignes : Mentionner le financement",
    );
  });
});
