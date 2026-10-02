import Link from "next/link";
import type { ReactNode } from "react";

import { BoltMark, Wordmark } from "./logo";
import { SiteFooter } from "./site-footer";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1440px] items-center px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Flashd home">
          <BoltMark className="size-6" circled={false} />
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-24">
        <h1 className="panel-title">{title}</h1>
        <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-foreground-secondary">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
