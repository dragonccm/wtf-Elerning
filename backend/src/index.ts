import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth.js";
import { dailyRoutes } from "./routes/daily.js";
import { learnRoutes } from "./routes/learn.js";
import { meRoutes } from "./routes/me.js";
import { progressRoutes } from "./routes/progress.js";
import { connectMongo } from "./lib/mongo.js";

const PORT = Number(process.env.PORT || process.env.API_PORT || 8000);
const HOST = process.env.API_HOST || "0.0.0.0";

const app = Fastify({ logger: true });
await connectMongo();

await app.register(cors, {
  origin: process.env.WEB_ORIGIN || "http://localhost:3000",
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.AUTH_SECRET || "wtf-elearning-dev-secret-change-in-production",
});

app.get("/health", async () => ({ ok: true, service: "wtf-elearning-api", mongo: await connectMongo() }));

await app.register(authRoutes);
await app.register(meRoutes);
await app.register(dailyRoutes);
await app.register(learnRoutes);
await app.register(progressRoutes);

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`API running at http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
