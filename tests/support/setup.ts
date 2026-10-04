import { randomUUID } from "node:crypto";

import { afterAll, vi } from "vitest";

// Test environment: zero accounts (local storage, console email) and an isolated database per file.

const base = process.env.TEST_MONGO_BASE_URI ?? "mongodb://127.0.0.1:27017/";
const dbName = `test_${randomUUID().slice(0, 8)}`;
const url = new URL(base);
url.pathname = `/${dbName}`;

Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: url.toString(),
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  STORAGE_DRIVER: "local",
  EMAIL_TRANSPORT: "console",
  CRON_SECRET: "test-cron-secret-0123456789",
});

// next/cache needs a request context; actions call it after writes.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}));

afterAll(async () => {
  const { disconnectDb, getMongoClient } = await import("@/lib/db");
  try {
    await getMongoClient().db().dropDatabase();
  } catch {
    // database may never have been created
  }
  await disconnectDb();
});
