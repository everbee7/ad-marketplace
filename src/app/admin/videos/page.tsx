import type { Metadata } from "next";
import Image from "next/image";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminSearch,
  AdminSelect,
  Pagination,
  shortDate,
} from "@/features/admin/components/admin-table-bits";
import { MediaDialog } from "@/features/admin/components/media-dialog";
import { HideVideoButton } from "@/features/admin/components/moderation-buttons";
import { listAdminVideos } from "@/features/admin/queries";
import { adminVideosQuerySchema } from "@/features/admin/schemas";
import { StateChip } from "@/features/ads/components/status-chip";
import { formatDuration } from "@/features/videos/format";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Creator videos · Admin" };
export const dynamic = "force-dynamic";

const tone = (s: string): "success" | "destructive" | "muted" =>
  s === "ready" ? "success" : s === "failed" ? "destructive" : "muted";

/** ADM-03: creator videos table with search and Hide / Unhide. */
export default async function AdminVideosPage({ searchParams }: PageProps<"/admin/videos">) {
  await requirePageUser({ role: "admin", path: "/admin/videos" });
  const q = adminVideosQuerySchema.parse(await searchParams);
  const data = await listAdminVideos(q);
  return (
    <section className="flex flex-col gap-6">
      <h1 className="panel-title">Creator videos</h1>
      <AdminSearch action="/admin/videos" q={q.q} placeholder="Search title">
        <AdminSelect
          name="hidden"
          label="Visibility"
          value={q.hidden}
          options={[{ value: "1", label: "Hidden only" }]}
        />
      </AdminSearch>
      {data.rows.length === 0 ? (
        <p className="eyebrow py-10 text-center">No videos found</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="eyebrow">Video</TableHead>
                <TableHead className="eyebrow">Creator</TableHead>
                <TableHead className="eyebrow">Status</TableHead>
                <TableHead className="eyebrow">Uploaded</TableHead>
                <TableHead className="eyebrow text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded bg-black">
                        {v.posterUrl && (
                          <Image
                            src={v.posterUrl}
                            alt=""
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="64px"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-56 truncate text-[13px] font-bold">
                          {v.title}
                        </span>
                        <span className="text-[11px] text-subtle-foreground">
                          {formatDuration(v.durationSec)}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px]">{v.creatorEmail ?? "—"}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1.5">
                      <StateChip label={v.status} tone={tone(v.status)} />
                      {v.hidden && <StateChip label="Hidden" tone="warning" />}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {shortDate.format(new Date(v.createdAt))}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end gap-2">
                      <MediaDialog url={v.videoUrl} title={v.title} />
                      <HideVideoButton id={v.id} title={v.title} hidden={v.hidden} />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        base="/admin/videos"
        params={{ q: q.q, hidden: q.hidden }}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </section>
  );
}
