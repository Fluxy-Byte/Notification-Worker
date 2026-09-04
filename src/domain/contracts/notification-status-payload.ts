export interface NotificationStatusPayload {
  whatsappChannelId: string;
  externalMessageId: string;
  waStatus: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  /// BSUID do destinatário (contacts[].user_id / statuses[].recipient_user_id
  /// no webhook da Meta) — usado pra atualizar Target.bsuid quando o contato
  /// foi alcançado por disparo ativo de campanha (só telefone, sem bsuid
  /// ainda) ou quando o bsuid salvo ficou desatualizado.
  recipientUserId?: string;
}
