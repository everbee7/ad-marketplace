import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-divider">
      <div className="mx-auto flex min-h-16 max-w-[1440px] flex-col items-center justify-between gap-3 px-6 py-5 text-[11px] font-medium tracking-[0.14em] uppercase sm:flex-row sm:px-16">
        <p>© {new Date().getFullYear()} Flashd. All rights reserved.</p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap justify-center gap-x-8 gap-y-2 whitespace-nowrap text-link-muted"
        >
          <Link href="/privacy" className="hover:text-foreground">
            Privacy policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of service
          </Link>
          <a href="mailto:hello@flashd.app" className="hover:text-foreground">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
