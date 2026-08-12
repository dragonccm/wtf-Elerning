import { MongoClient } from "mongodb";
import type { User } from "@prisma/client";

let client: MongoClient | undefined;
let connected = false;
let connecting: Promise<boolean> | undefined;
let lastAttemptAt = 0;

const RETRY_INTERVAL_MS = 30_000;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  if (connected && client) return true;
  if (connecting) return connecting;
  if (Date.now() - lastAttemptAt < RETRY_INTERVAL_MS) return false;

  lastAttemptAt = Date.now();
  connecting = (async () => {
    try {
      const nextClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
      await nextClient.connect();
      await nextClient.db(process.env.MONGODB_DB || "wtf_elearnings").command({ ping: 1 });
      client = nextClient;
      connected = true;
      return true;
    } catch (error) {
      connected = false;
      console.warn("Mongo identity bridge unavailable", error instanceof Error ? error.message : error);
      await client?.close().catch(() => undefined);
      client = undefined;
      return false;
    } finally {
      connecting = undefined;
    }
  })();
  return connecting;
}

export async function syncIdentity(user: Pick<User, "id" | "email" | "name" | "role" | "avatarUrl">) {
  if (!(await connectMongo()) || !client) return;
  try {
    await client.db(process.env.MONGODB_DB || "wtf_elearnings").collection("identityUsers").updateOne(
      { email: user.email.toLowerCase() },
      {
        $set: {
          prismaUserId: user.id,
          email: user.email.toLowerCase(),
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl ?? null,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  } catch (error) {
    console.warn("Mongo identity sync failed", error instanceof Error ? error.message : error);
  }
}
