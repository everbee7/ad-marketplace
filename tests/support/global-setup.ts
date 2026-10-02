import { MongoMemoryReplSet } from "mongodb-memory-server";

// One in-memory replica set for the whole Vitest run. Each test file gets its own database (setup.ts).

let server: MongoMemoryReplSet | undefined;

export async function setup() {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.TEST_MONGO_BASE_URI = server.getUri();
}

export async function teardown() {
  await server?.stop();
}
