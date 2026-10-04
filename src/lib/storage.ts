import "server-only";

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { del as blobDel, head as blobHead, put as blobPut } from "@vercel/blob";
import { nanoid } from "nanoid";

import { env } from "@/env";
import { logger } from "@/lib/logger";

// Storage adapter (ARCHITECTURE §1, §7). Drivers: `blob` (Vercel Blob) and `local` (dev, `.data/uploads`).
// Media bytes from users never pass through our functions in production: browsers upload directly
// (see storage-client.ts). This module only inspects and deletes stored objects.

export type StorageDriver = "local" | "blob";
export type StoredObject = { url: string; pathname: string; size: number; contentType: string };

export const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");
export const LOCAL_URL_PREFIX = "/api/dev-files/";

export function storageDriver(): StorageDriver {
  return env.STORAGE_DRIVER;
}

function assertLocalAllowed() {
  if (env.NODE_ENV === "production") {
    throw new Error("The local storage driver is refused in production.");
  }
}

/** Blob store host derived from the token: vercel_blob_rw_<storeId>_<secret>. */
function blobHost(): string | null {
  const token = env.BLOB_READ_WRITE_TOKEN;
  const storeId = token?.split("_")[3];
  return storeId ? `${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** Safe relative pathname inside the local root (no traversal). */
export function localFilePath(pathname: string): string {
  const clean = pathname.replace(/\\/g, "/");
  if (!/^[a-zA-Z0-9/_.-]+$/.test(clean) || clean.split("/").some((s) => s === ".." || s === "")) {
    throw new Error("Invalid storage pathname");
  }
  const full = path.join(LOCAL_ROOT, clean);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid storage pathname");
  return full;
}

/** Adds the random suffix used by both drivers (unguessable URLs, ARCHITECTURE §7.3). */
export function withRandomSuffix(pathname: string, ext: string): string {
  return `${pathname}-${nanoid(21)}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
}

/**
 * Returns the storage pathname for a URL that belongs to our store, or null if it doesn't.
 * Used by finalize steps to reject URLs from anywhere else.
 */
export function pathnameFromUrl(url: string): string | null {
  if (storageDriver() === "local") {
    let rel = url;
    if (/^https?:/i.test(url)) {
      const u = new URL(url);
      if (u.origin !== new URL(env.NEXT_PUBLIC_APP_URL).origin) return null;
      rel = u.pathname;
    }
    if (!rel.startsWith(LOCAL_URL_PREFIX)) return null;
    return decodeURIComponent(rel.slice(LOCAL_URL_PREFIX.length));
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== blobHost()) return null;
    return decodeURIComponent(u.pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

export function ownsUrl(url: string, pathnamePrefix: string): boolean {
  const p = pathnameFromUrl(url);
  return p !== null && p.startsWith(pathnamePrefix);
}

export function localUrl(pathname: string): string {
  return LOCAL_URL_PREFIX + pathname.split("/").map(encodeURIComponent).join("/");
}

const META_SUFFIX = ".meta.json";

/** Local driver: write bytes (dev uploads and seed scripts). */
export async function localWrite(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  assertLocalAllowed();
  const file = localFilePath(pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  await writeFile(file + META_SUFFIX, JSON.stringify({ contentType }));
  return { url: localUrl(pathname), pathname, size: body.length, contentType };
}

/** Local driver: stream a request body to disk, aborting past maxBytes (large creator videos). */
export async function localWriteStream(
  pathname: string,
  body: ReadableStream<Uint8Array>,
  contentType: string,
  maxBytes: number,
): Promise<StoredObject | null> {
  assertLocalAllowed();
  const file = localFilePath(pathname);
  await mkdir(path.dirname(file), { recursive: true });
  const out = createWriteStream(file);
  let size = 0;
  try {
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.byteLength;
      if (size > maxBytes) throw new Error("too large");
      if (!out.write(chunk)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
    await new Promise<void>((resolve, reject) =>
      out.end((err?: Error | null) => (err ? reject(err) : resolve())),
    );
  } catch {
    out.destroy();
    await rm(file, { force: true });
    return null;
  }
  if (size === 0) {
    await rm(file, { force: true });
    return null;
  }
  await writeFile(file + META_SUFFIX, JSON.stringify({ contentType }));
  return { url: localUrl(pathname), pathname, size, contentType };
}

export async function localStat(pathname: string): Promise<StoredObject | null> {
  assertLocalAllowed();
  const file = localFilePath(pathname);
  try {
    const s = await stat(file);
    const meta = JSON.parse(await readFile(file + META_SUFFIX, "utf8")) as { contentType?: string };
    return {
      url: localUrl(pathname),
      pathname,
      size: s.size,
      contentType: meta.contentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export function localStream(pathname: string, range?: { start: number; end: number }) {
  assertLocalAllowed();
  return createReadStream(localFilePath(pathname), range);
}

/** Metadata of a stored object, or null if it doesn't exist. */
export async function headObject(url: string): Promise<StoredObject | null> {
  const pathname = pathnameFromUrl(url);
  if (!pathname) return null;
  if (storageDriver() === "local") return localStat(pathname);
  try {
    const h = await blobHead(url, { token: env.BLOB_READ_WRITE_TOKEN });
    return { url: h.url, pathname: h.pathname, size: h.size, contentType: h.contentType };
  } catch {
    return null;
  }
}

/** Reads a stored object into memory, refusing anything larger than maxBytes. */
export async function readObject(url: string, maxBytes: number): Promise<Buffer> {
  const meta = await headObject(url);
  if (!meta) throw new Error("Stored object not found");
  if (meta.size > maxBytes) throw new Error("Stored object is too large to read");
  if (storageDriver() === "local") return readFile(localFilePath(meta.pathname));
  const res = await fetch(meta.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blob fetch failed with ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Server-side write (seed scripts and tests only; user media goes browser → storage). */
export async function putObject(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  if (storageDriver() === "local") return localWrite(pathname, body, contentType);
  const res = await blobPut(pathname, body, {
    access: "public",
    contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return { url: res.url, pathname: res.pathname, size: body.length, contentType };
}

/** Deletes objects by storage pathname (e.g. reserved uploads that may never have been written). */
export async function deletePathnames(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return;
  if (storageDriver() === "local") {
    await deleteObjects(pathnames.map(localUrl));
    return;
  }
  try {
    await blobDel(pathnames, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    logger.warn("storage.delete failed", { count: pathnames.length }, err);
  }
}

/** Deletes stored objects by URL. Missing objects are ignored. */
export async function deleteObjects(urls: (string | null | undefined)[]): Promise<void> {
  const list = urls.filter((u): u is string => !!u && pathnameFromUrl(u) !== null);
  if (list.length === 0) return;
  try {
    if (storageDriver() === "local") {
      await Promise.all(
        list.map(async (u) => {
          const file = localFilePath(pathnameFromUrl(u)!);
          await rm(file, { force: true });
          await rm(file + META_SUFFIX, { force: true });
        }),
      );
    } else {
      await blobDel(list, { token: env.BLOB_READ_WRITE_TOKEN });
    }
  } catch (err) {
    logger.warn("storage.delete failed", { count: list.length }, err);
  }
}
