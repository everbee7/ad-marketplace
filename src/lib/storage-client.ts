"use client";

import { upload as blobUpload } from "@vercel/blob/client";

// Browser half of the storage adapter: uploads go straight from the browser to storage
// (ARCHITECTURE §7.2 step 3). The server decides the driver and the allowed pathname.

export type UploadTarget = { driver: "local" | "blob"; pathname: string; uploadKey: string };
export type UploadProgress = { loaded: number; total: number; percentage: number };
export type UploadedObject = { url: string; pathname: string };

export const UPLOAD_TOKEN_URL = "/api/uploads/token";

function localUpload(
  target: UploadTarget,
  file: Blob,
  opts: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal },
): Promise<UploadedObject> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/dev-files/${target.pathname}`);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upload-key", target.uploadKey);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        opts.onProgress?.({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
        });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadedObject);
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

/** Uploads a file to the pathname the server reserved for it. */
export async function uploadToStorage(
  target: UploadTarget,
  file: Blob,
  opts: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal } = {},
): Promise<UploadedObject> {
  if (target.driver === "local") return localUpload(target, file, opts);
  const res = await blobUpload(target.pathname, file, {
    access: "public",
    handleUploadUrl: UPLOAD_TOKEN_URL,
    clientPayload: target.uploadKey,
    contentType: file.type || undefined,
    multipart: file.size > 20 * 1024 * 1024,
    abortSignal: opts.signal,
    onUploadProgress: opts.onProgress,
  });
  return { url: res.url, pathname: res.pathname };
}
