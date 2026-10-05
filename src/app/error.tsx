"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportClientError } from "@/features/errors/actions";

/** Friendly error boundary for every route; the error is reported to the server log. */
export default function RouteError({
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
      stack: error.stack,
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="panel-title">We hit a snag</h1>
      <p className="max-w-md text-[13px] text-foreground-secondary">
        This page couldn&apos;t load. Try again, and if it keeps happening, come back in a few
        minutes.
        {error.digest && (
          <span className="mt-2 block text-subtle-foreground">Reference: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
