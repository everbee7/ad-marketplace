import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AD_STATUSES } from "@/config/enums";
import {
  AdminSearch,
  AdminSelect,
  Pagination,
  shortDate,
} from "@/features/admin/components/admin-table-bits";
import { MediaDialog } from "@/features/admin/components/media-dialog";
import { RemoveAdButton } from "@/features/admin/components/moderation-buttons";
import { listAdminAds } from "@/features/admin/queries";
import { adminAdsQuerySchema } from "@/features/admin/schemas";
import { StateChip, StatusChip } from "@/features/ads/components/status-chip";
import { AD_STATUS_INFO } from "@/features/ads/lifecycle";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ads · Admin" };
export const dynamic = "force-dynamic";

/** ADM-03: ads table with search, status filter and Remove. */
export default async function AdminAdsPage({ searchParams }: PageProps<"/admin/ads">) {
  await requirePageUser({ role: "admin", path: "/admin/ads" });
  const q = adminAdsQuerySchema.parse(await searchParams);
  const data = await listAdminAds(q);
  const statusOptions = [
    ...AD_STATUSES.map((s) => ({ value: s, label: AD_STATUS_INFO[s].label })),
    { value: "deleted", label: "Deleted" },
  ];
  return (
    <section className="flex flex-col gap-6">
      <h1 className="panel-title">Ads</h1>
      <AdminSearch action="/admin/ads" q={q.q} placeholder="Search title or business">
        <AdminSelect name="status" label="Status" value={q.status} options={statusOptions} />
      </AdminSearch>
      {data.rows.length === 0 ? (
        <p className="eyebrow py-10 text-center">No ads found</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="eyebrow">Ad</TableHead>
                <TableHead className="eyebrow">Business</TableHead>
                <TableHead className="eyebrow">Status</TableHead>
                <TableHead className="eyebrow">Created</TableHead>
                <TableHead className="eyebrow text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded bg-black">
                        {a.posterUrl && (
                          <Image
                            src={a.posterUrl}
                            alt=""
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="64px"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/marketplace/${a.id}`}
                          className="block max-w-56 truncate text-[13px] font-bold hover:underline"
                        >
                          {a.title}
                        </Link>
                        {(a.removalReason || a.rejectionReason) && (
                          <span className="block max-w-56 truncate text-[11px] text-subtle-foreground">
                            {a.removalReason ?? a.rejectionReason}
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px]">{a.businessName}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1.5">
                      <StatusChip status={a.status} />
                      {a.deleted && <StateChip label="Deleted" tone="destructive" />}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {shortDate.format(new Date(a.createdAt))}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end gap-2">
                      <MediaDialog url={a.videoUrl} title={a.title} />
                      {a.status === "live" && !a.deleted && (
                        <RemoveAdButton id={a.id} title={a.title} />
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        base="/admin/ads"
        params={{ q: q.q, status: q.status }}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </section>
  );
}
