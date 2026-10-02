import "server-only";

import { limits } from "@/config/limits";
import { connectDb, getDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";

// Fixed-window counters in the `rateLimits` collection (DATA_MODEL.md, ADR-0005).

export type RateBucket = keyof typeof limits.rate;
type RateDoc = { _id: string; count: number; expiresAt: Date };

export type RateResult = { ok: boolean; count: number; limit: number; resetAt: Date };

let indexReady: Promise<unknown> | undefined;

function collection() {
  const col = getDb().collection<RateDoc>("rateLimits");
  indexReady ??= col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {
    indexReady = undefined;
  });
  return col;
}

function windowKey(bucket: string, key: string, windowSec: number, now: number) {
  const start = Math.floor(now / 1000 / windowSec) * windowSec;
  return { id: `${bucket}:${key}:${start}`, resetAt: new Date((start + windowSec) * 1000) };
}

/** Counts one hit and reports whether it is within the limit. */
export async function hit(bucket: RateBucket, key: string, now = Date.now()): Promise<RateResult> {
  await connectDb();
  const { max, windowSec } = limits.rate[bucket];
  const { id, resetAt } = windowKey(bucket, key, windowSec, now);
  const doc = await collection().findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: resetAt } },
    { upsert: true, returnDocument: "after" },
  );
  const count = doc?.count ?? 1;
  return { ok: count <= max, count, limit: max, resetAt };
}

/** Reads the current count without incrementing. */
export async function peek(bucket: RateBucket, key: string, now = Date.now()): Promise<RateResult> {
  await connectDb();
  const { max, windowSec } = limits.rate[bucket];
  const { id, resetAt } = windowKey(bucket, key, windowSec, now);
  const doc = await collection().findOne({ _id: id });
  const count = doc?.count ?? 0;
  return { ok: count < max, count, limit: max, resetAt };
}

/** Clears a window (e.g. after a successful login). */
export async function reset(bucket: RateBucket, key: string, now = Date.now()): Promise<void> {
  await connectDb();
  const { windowSec } = limits.rate[bucket];
  await collection().deleteOne({ _id: windowKey(bucket, key, windowSec, now).id });
}

/** Throws RATE_LIMITED when over the limit. */
export async function enforce(bucket: RateBucket, key: string): Promise<void> {
  const res = await hit(bucket, key);
  if (!res.ok) {
    throw new DomainError("RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
  }
}
