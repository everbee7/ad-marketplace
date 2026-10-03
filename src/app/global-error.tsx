"use client";

import { useEffect } from "react";

import { reportClientError } from "@/features/errors/actions";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError({
      message: error.message,
      digest: error.digest,
      path: window.location.pathname,
    }).catch(() => undefined);
  }, [error]);
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="panel-title">Flashd is having trouble</h1>
        <button
          type="button"
          onClick={reset}
          className="h-12 rounded-md border border-primary px-5 font-display text-[13px] font-bold tracking-[0.15em] uppercase"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
