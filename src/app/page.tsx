import { Building2, Video, Zap } from "lucide-react";
import Link from "next/link";

import { BoltMark, Wordmark } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

// Landing (DESIGN.md §7, from the prototype). Attention Units and "Meet our team" are not in the PRD,
// so they are left out until a PRD change (DESIGN.md §10 items 5–6).

const tiles = [
  { href: `${routes.signup}?role=business`, label: "Business", icon: Building2 },
  { href: `${routes.signup}?role=creator`, label: "Creator", icon: Video },
];

const steps = [
  { title: "Business", caption: "Uploads Flashd Ad", icon: Building2 },
  { title: "Flashd Portal", caption: "Ad Marketplace", icon: Zap },
  { title: "Creator", caption: "Places Ad Into Content", icon: Video },
];

export default function LandingPage() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Flashd home">
          <BoltMark className="size-6" circled={false} />
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-6 sm:gap-10">
          <a
            href="#how-it-works"
            className="hidden font-sans text-[13px] font-light tracking-[0.15em] uppercase hover:text-foreground-secondary sm:inline"
          >
            How it works
          </a>
          <Button asChild variant="marketing" className="h-[34px] px-5 text-xs">
            <Link href={routes.login}>Enter the portal</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 text-center">
        <section className="flex flex-col items-center pt-16 sm:pt-24">
          <BoltMark className="size-28 sm:size-36" />
          <h1 className="sr-only">Flashd</h1>
          <p aria-hidden="true" className="mt-12 font-display text-3xl font-bold tracking-[0.2em]">
            FLASHD
          </p>
          <nav aria-label="Join as" className="mt-6 flex flex-wrap justify-center gap-6">
            {tiles.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex h-[79px] min-w-40 flex-col items-center justify-center gap-2 rounded-lg border border-border-strong px-5 py-4 font-display text-sm font-bold tracking-[0.14em] uppercase transition-colors hover:border-white"
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 font-display text-[40px] leading-[1.02] font-bold tracking-[-0.02em] uppercase sm:text-[52px]">
            Ad time. Back.
          </p>
          <p className="mt-6 font-display text-[17px] leading-normal font-light tracking-[0.18em] text-foreground-secondary">
            Advertising measured in attention, not impressions.
          </p>
          <Button asChild variant="marketing" size="lg" className="mt-8">
            <Link href={routes.signup}>Enter the portal</Link>
          </Button>
        </section>

        <section id="how-it-works" className="flex scroll-mt-8 flex-col items-center py-40">
          <h2 className="eyebrow font-bold tracking-[0.25em]">How it works</h2>
          <ol className="mt-12 flex flex-col items-center gap-8 sm:flex-row sm:gap-0">
            {steps.map(({ title, caption, icon: Icon }, i) => (
              <li key={title} className="flex items-center">
                <div className="flex w-48 flex-col items-center">
                  <span className="flex size-24 items-center justify-center rounded-full border border-border-strong shadow-glow-soft">
                    <Icon className="size-7" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="mt-3 font-sans text-[13px] font-bold tracking-[0.15em] uppercase">
                    {title}
                  </span>
                  <span className="mt-2 text-[13px] text-foreground-secondary">{caption}</span>
                </div>
                {i < steps.length - 1 && (
                  <span aria-hidden="true" className="hidden text-2xl sm:inline">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
