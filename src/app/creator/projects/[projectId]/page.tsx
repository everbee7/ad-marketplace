import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listSavedAds } from "@/features/marketplace/queries";
import { ProjectEditor } from "@/features/projects/components/project-editor";
import { getProjectEditor } from "@/features/projects/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Project editor" };
export const dynamic = "force-dynamic";

/** PRJ-02 / PRJ-06: reopening restores the exact video, bursts, ads and timestamps. */
export default async function ProjectEditorPage({
  params,
  searchParams,
}: PageProps<"/creator/projects/[projectId]">) {
  const { projectId } = await params;
  const user = await requirePageUser({ role: "creator", path: `/creator/projects/${projectId}` });
  const [project, saved] = await Promise.all([
    getProjectEditor(user, projectId),
    listSavedAds(user),
  ]);
  if (!project) notFound();
  const debug = (await searchParams).debugPreview === "1";
  return (
    <section className="flex flex-col gap-4">
      <Link href="/creator/projects" className="eyebrow hover:text-foreground">
        ← Projects
      </Link>
      <ProjectEditor key={project.id} project={project} savedAds={saved} debugPreview={debug} />
    </section>
  );
}
