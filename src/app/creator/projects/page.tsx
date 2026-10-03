import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProjectList } from "@/features/projects/components/project-list";
import { listProjects } from "@/features/projects/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

/** PRJ-05. */
export default async function ProjectsPage() {
  const user = await requirePageUser({ role: "creator", path: "/creator/projects" });
  const projects = await listProjects(user);
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="panel-title">Projects</h1>
        <Button asChild>
          <Link href="/creator/projects/new">
            <Plus className="size-4" aria-hidden="true" /> New project
          </Link>
        </Button>
      </div>
      {projects.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="eyebrow">No projects yet</p>
          <p className="max-w-sm text-[13px] text-foreground-secondary">
            Start a project from one of your videos, or from an ad in the Marketplace with Use in
            project.
          </p>
        </div>
      ) : (
        <ProjectList projects={projects} />
      )}
    </section>
  );
}
