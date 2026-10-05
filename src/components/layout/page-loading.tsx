import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading state (DESIGN: dark surfaces, no layout shift). */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      <Skeleton className="h-6 w-48 bg-surface-raised" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-video rounded-xl bg-surface" />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
