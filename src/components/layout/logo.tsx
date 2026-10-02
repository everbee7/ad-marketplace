import { cn } from "@/lib/utils";

// TODO(design): replace with the client's SVG source files (DESIGN.md §10 item 3).

export function BoltMark({ className, circled = true }: { className?: string; circled?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("text-foreground", className)}>
      {circled && (
        <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3" />
      )}
      <path d="M36.5 9 19 36h11.5L26 55l19-28.5H33.2L36.5 9Z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display text-xl leading-none font-bold tracking-[0.15em]", className)}
    >
      FLASHD
    </span>
  );
}
