import { MESSAGES_COLLECTION, type MessageDocument } from "../../domain/contracts/message-document";
import type { NotificationStatusPayload } from "../../domain/contracts/notification-status-payload";
import { redis } from "../../infrastructure/cache/redis/client";
import { getMongoDb } from "../../infrastructure/database/mongo/client";
import { prisma } from "../../infrastructure/database/prisma/client";

const DESK_EVENTS_CHANNEL = "desk:events";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/// Atualiza o status de entrega da mensagem correspondente no Mongo e avisa
/// o Desk-API (mesmo canal desk:events que Desk-Worker/Desk-API usam) pra
/// repassar por WebSocket — sem isso o "tique azul" só aparece depois de um
/// refresh manual. Notification-Worker não tem o model Ticket no seu Prisma
/// (bounded context diferente), então manda messagingSessionId em vez de
/// ticketId; quem resolve o ticket/atendente é o subscriber do Desk-API.
export async function updateMessageStatus(payload: NotificationStatusPayload): Promise<void> {
  const db = await getMongoDb();
  const collection = db.collection<MessageDocument>(MESSAGES_COLLECTION);

  const filter = { externalMessageId: payload.externalMessageId };
  const update = { $set: { waStatus: payload.waStatus } };

  // findOneAndUpdate (driver v6, includeResultMetadata padrão false) devolve
  // o documento já atualizado direto — precisamos dele pra saber a sessão.
  let updated = await collection.findOneAndUpdate(filter, update);

  if (!updated) {
    await delay(1500);
    updated = await collection.findOneAndUpdate(filter, update);
  }

  if (!updated) {
    console.warn(
      `Nenhuma mensagem encontrada para externalMessageId=${payload.externalMessageId} (status=${payload.waStatus}) — ignorando.`,
    );
    return;
  }

  await redis.publish(
    DESK_EVENTS_CHANNEL,
    JSON.stringify({
      type: "message_status",
      messagingSessionId: updated.messagingSessionId,
      payload: { externalMessageId: payload.externalMessageId, waStatus: payload.waStatus },
    }),
  );

  if (payload.recipientUserId) {
    await backfillTargetBsuid(payload.externalMessageId, payload.recipientUserId);
  }
}

/// Um contato alcançado por disparo ativo de campanha (CSV de telefones) só
/// tem waId até a Meta confirmar a entrega — é o status webhook que traz o
/// bsuid dele pela primeira vez (ou corrige um bsuid desatualizado). Acha o
/// Target pelo wamid gravado em CampaignTarget.messageId no envio (ver
/// Campaign-Worker/process-campaign-send.ts) e atualiza o Target já
/// existente — nunca cria um contato novo/duplicado. Mensagens que não são
/// de campanha (conversa normal) simplesmente não têm CampaignTarget, então
/// isso vira um no-op silencioso pra elas.
async function backfillTargetBsuid(externalMessageId: string, recipientUserId: string): Promise<void> {
  const campaignTarget = await prisma.campaignTarget.findFirst({
    where: { messageId: externalMessageId },
    select: { targetId: true },
  });
  if (!campaignTarget) return;

  await prisma.target.update({
    where: { id: campaignTarget.targetId },
    data: { bsuid: recipientUserId },
  });
}
