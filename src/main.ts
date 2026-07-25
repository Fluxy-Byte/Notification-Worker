import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { prisma } from "./infrastructure/database/prisma/client";
import { redis } from "./infrastructure/cache/redis/client";
import { getRabbitChannel } from "./infrastructure/queue/rabbitmq/connection";
import { pingMongo } from "./infrastructure/database/mongo/client";
import { startNotificationStatusConsumer } from "./presentation/workers/notification-status-consumer";

async function main() {
  await prisma.$connect();
  const channel = await getRabbitChannel();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const [dbOk, redisOk, mongoOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redis.ping().then(() => true).catch(() => false),
      pingMongo(),
    ]);

    res.json({ status: "ok", service: "notification-worker", db: dbOk, redis: redisOk, mongo: mongoOk });
  });

  app.listen(env.PORT, () => {
    console.log(`Notification-Worker listening on port ${env.PORT}`);
  });

  await startNotificationStatusConsumer(channel);
}

main().catch((error) => {
  console.error("Fatal error during Notification-Worker bootstrap:", error);
  process.exit(1);
});
