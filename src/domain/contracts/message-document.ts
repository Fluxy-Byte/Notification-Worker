/// Contrato da collection `messages` no Mongo (banco compartilhado). Espelho
/// exato de Agent-Api/src/domain/contracts/message-document.ts — mudanças
/// precisam ser replicadas manualmente nos dois lados.
export interface MessageDocument {
  _id?: unknown;
  organizationId: string;
  targetId: string;
  whatsappChannelId: string;
  messagingSessionId: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: "CUSTOMER" | "AGENT_AI" | "ATTENDANT" | "SYSTEM";
  messageType: "TEXT" | "AUDIO" | "IMAGE" | "DOCUMENT" | "STICKER";
  externalMessageId?: string;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  waStatus?: "sent" | "delivered" | "read" | "failed";
  createdAt: Date;
}

export const MESSAGES_COLLECTION = "messages";
