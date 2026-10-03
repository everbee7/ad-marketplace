import Link from "next/link";

import { BoltMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <BoltMark className="size-14" />
      <p className="eyebrow">404</p>
      <h1 className="panel-title">This page isn&apos;t here</h1>
      <p className="max-w-md text-[13px] text-foreground-secondary">
        It may have been removed, or the link is wrong. If it was an ad, the business may have taken
        it down.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </main>
  );
}
