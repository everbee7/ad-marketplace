import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** GET search form: state lives in the URL, works without JavaScript. */
export function AdminSearch({
  action,
  q,
  placeholder,
  children,
}: {
  action: string;
  q?: string;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-3" role="search">
      <div className="relative min-w-60 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-10 placeholder:uppercase"
        />
      </div>
      {children}
      <Button type="submit" size="sm" variant="outline">
        Search
      </Button>
    </form>
  );
}

/** Native select styled like our inputs, for GET filter forms. */
export function AdminSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-10 rounded-md border border-border bg-input px-3 text-[13px] focus-visible:border-primary"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({
  base,
  params,
  page,
  pageSize,
  total,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground"
    >
      <span>
        {total} {total === 1 ? "result" : "results"} · page {page} of {pages}
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Button asChild size="xs" variant="outline">
            <Link href={href(page - 1)}>Previous</Link>
          </Button>
        ) : null}
        {page < pages ? (
          <Button asChild size="xs" variant="outline">
            <Link href={href(page + 1)}>Next</Link>
          </Button>
        ) : null}
      </span>
    </nav>
  );
}

export const shortDate = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
