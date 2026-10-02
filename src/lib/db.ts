import "server-only";

import dns from "node:dns";

import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type Db } from "mongodb";
import mongoose from "mongoose";

import { env } from "@/env";

// One MongoClient per process, shared by Better Auth (native driver) and Mongoose (ARCHITECTURE §1).
// Cached on globalThis so dev hot reloads don't open new pools.

type Cache = { client: MongoClient; ready?: Promise<void> };
const g = globalThis as typeof globalThis & { __flashdMongo?: Cache };

mongoose.set("strictQuery", true);

/**
 * Dev machines sometimes list a local resolver that refuses SRV queries (querySrv ECONNREFUSED for
 * mongodb+srv URIs). Outside production, append public resolvers as a fallback.
 */
function devSrvDnsFallback(uri: string) {
  if (env.NODE_ENV === "production" || !uri.startsWith("mongodb+srv://")) return;
  for (const resolver of [dns, dns.promises]) {
    const servers = resolver.getServers();
    if (!servers.includes("1.1.1.1")) resolver.setServers([...servers, "1.1.1.1", "8.8.8.8"]);
  }
}

export function getMongoClient(): MongoClient {
  if (!g.__flashdMongo) {
    devSrvDnsFallback(env.MONGODB_URI);
    const client = new MongoClient(env.MONGODB_URI, {
      appName: "flashd",
      maxIdleTimeMS: 5_000,
    });
    attachDatabasePool(client);
    g.__flashdMongo = { client };
  }
  return g.__flashdMongo.client;
}

/** Native db handle (database name from the connection string). Usable before connect: the driver connects lazily. */
export function getDb(): Db {
  return getMongoClient().db();
}

/** Connects the shared client and binds Mongoose to it. Call before any model query. */
export function connectDb(): Promise<void> {
  const client = getMongoClient();
  const cache = g.__flashdMongo!;
  cache.ready ??= (async () => {
    await client.connect();
    if (mongoose.connection.readyState !== 1) {
      mongoose.connection.setClient(client);
    }
  })().catch((err: unknown) => {
    cache.ready = undefined;
    throw err;
  });
  return cache.ready;
}

/** Test helper: drop the cached client so a new MONGODB_URI is picked up. */
export async function disconnectDb(): Promise<void> {
  const cache = g.__flashdMongo;
  g.__flashdMongo = undefined;
  if (cache) await cache.client.close();
}
