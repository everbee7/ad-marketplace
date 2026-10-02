import Link from "next/link";

import { BoltMark, Wordmark } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1440px] items-center px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Flashd home">
          <BoltMark className="size-6" circled={false} />
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-24 sm:pt-12">
        <div className="w-full max-w-[440px] rounded-xl border border-border bg-black p-6 shadow-glow-ambient sm:p-10">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
