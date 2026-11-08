export const MESSAGE_TYPES = ["send", "followUp", "thanks", "reminder", "free"] as const;
export const CHANNELS = ["email", "sms"] as const;
export const TONES = ["professional", "warm", "premium"] as const;

export interface CommunicationRequest {
  reference: string;
  type: (typeof MESSAGE_TYPES)[number];
  channel: (typeof CHANNELS)[number];
  tone: (typeof TONES)[number];
  instructions: string;
}

// The prompt is always French: it addresses the assistant, not the UI reader.
const CHANNEL_FR: Record<CommunicationRequest["channel"], string> = { email: "email", sms: "SMS" };
const TONE_FR: Record<CommunicationRequest["tone"], string> = {
  professional: "professionnel",
  warm: "chaleureux",
  premium: "premium",
};
const PURPOSE_FR: Record<CommunicationRequest["type"], string> = {
  send: "d'envoi du devis au client",
  followUp: "de relance pour un devis resté sans réponse",
  thanks: "de remerciement après la signature du devis",
  reminder: "de rappel de rendez-vous",
  free: "à destination du client",
};

export const buildCommunicationPrompt = (request: CommunicationRequest): string => {
  const reference = request.reference.trim();
  const instructions = request.instructions.trim();
  const channel = CHANNEL_FR[request.channel];
  return [
    `Rédige un ${channel} ${PURPOSE_FR[request.type]}${reference ? ` pour le devis ${reference}` : ""}.`,
    `Ton : ${TONE_FR[request.tone]}.`,
    `Canal : ${channel}.`,
    instructions ? `Consignes : ${instructions}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};
