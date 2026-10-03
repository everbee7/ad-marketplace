import type { Metadata } from "next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLES } from "@/config/enums";
import {
  AdminSearch,
  AdminSelect,
  Pagination,
  shortDate,
} from "@/features/admin/components/admin-table-bits";
import { listAdminUsers } from "@/features/admin/queries";
import { adminUsersQuerySchema, type AdminUserRowDTO } from "@/features/admin/schemas";
import { StateChip } from "@/features/ads/components/status-chip";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Users · Admin" };
export const dynamic = "force-dynamic";

function contentSummary(u: AdminUserRowDTO) {
  if (u.role === "business") return `${u.counts.ads} ads`;
  if (u.role === "creator") return `${u.counts.videos} videos · ${u.counts.projects} projects`;
  return "—";
}

/** ADM-04: search by email, filter by role, profile name and content counts. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requirePageUser({ role: "admin", path: "/admin/users" });
  const q = adminUsersQuerySchema.parse(await searchParams);
  const data = await listAdminUsers(q);
  return (
    <section className="flex flex-col gap-6">
      <h1 className="panel-title">Users</h1>
      <AdminSearch action="/admin/users" q={q.q} placeholder="Search email">
        <AdminSelect
          name="role"
          label="Role"
          value={q.role}
          options={ROLES.map((r) => ({ value: r, label: r }))}
        />
      </AdminSearch>
      {data.rows.length === 0 ? (
        <p className="eyebrow py-10 text-center">No users found</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="eyebrow">User</TableHead>
                <TableHead className="eyebrow">Role</TableHead>
                <TableHead className="eyebrow">Account</TableHead>
                <TableHead className="eyebrow">Content</TableHead>
                <TableHead className="eyebrow">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="block text-[13px] font-bold">{u.displayName ?? "—"}</span>
                    <span className="text-[12px] text-subtle-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell className="text-[13px] capitalize">{u.role}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1.5">
                      <StateChip
                        label={u.emailVerified ? "Verified" : "Unverified"}
                        tone={u.emailVerified ? "success" : "warning"}
                      />
                      {u.role !== "admin" && !u.onboardingCompleted && (
                        <StateChip label="No profile" tone="muted" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {contentSummary(u)}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {shortDate.format(new Date(u.createdAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        base="/admin/users"
        params={{ q: q.q, role: q.role }}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </section>
  );
}
