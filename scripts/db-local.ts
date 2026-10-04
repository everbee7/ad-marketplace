// `npm run db:local`: a real mongod on localhost:27017 with data persisted in .data/mongo.
// No install or account needed (ADR-0005). mongodb-memory-server downloads the binary on first run.

import { mkdirSync } from "node:fs";
import path from "node:path";

import { MongoMemoryReplSet } from "mongodb-memory-server";

const dbPath = path.join(process.cwd(), ".data", "mongo");
const port = Number(process.env.DB_LOCAL_PORT ?? 27017);

async function main() {
  mkdirSync(dbPath, { recursive: true });
  // A single-node replica set, so transactions work like on Atlas.
  const server = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: "rs0", storageEngine: "wiredTiger" },
    instanceOpts: [{ port, dbPath }],
  });
  const uri = server.getUri("flashd");
  console.info(`Local MongoDB ready: ${uri}`);
  console.info(`Use MONGODB_URI=mongodb://127.0.0.1:${port}/flashd?replicaSet=rs0 in .env.local`);
  console.info("Press Ctrl+C to stop. Data persists in .data/mongo.");

  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
