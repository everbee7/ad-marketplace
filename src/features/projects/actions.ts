"use server";

import { revalidatePath } from "next/cache";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

import {
  createProjectSchema,
  projectIdSchema,
  renameProjectSchema,
  saveProjectSchema,
  updateBurstsSchema,
  type CreateProjectInput,
  type ProjectIdInput,
  type RenameProjectInput,
  type SaveProjectInput,
  type SaveResultDTO,
  type UpdateBurstsInput,
} from "./schemas";
import {
  createProject as createService,
  deleteProject as deleteService,
  duplicateProject as duplicateService,
  renameProject as renameService,
  saveProject as saveService,
  updateBursts as updateService,
} from "./service";

const creator = () => requireUser({ role: "creator" });
const refreshList = () => revalidatePath("/creator", "layout");

/** PRJ-01. */
export async function createProject(
  input: CreateProjectInput,
): Promise<ActionResult<{ id: string }>> {
  return run("createProject", createProjectSchema, input, async ({ videoId, adId }) => {
    const id = await createService(await creator(), videoId, adId);
    refreshList();
    return { id };
  });
}

/** PRJ-03 / PRJ-04 AC1 (auto-save). */
export async function updateBursts(input: UpdateBurstsInput): Promise<ActionResult<SaveResultDTO>> {
  return run("updateBursts", updateBurstsSchema, input, async ({ id, revision, bursts }) =>
    updateService(await creator(), id, revision, bursts),
  );
}

/** PRJ-04 AC2. */
export async function saveProject(input: SaveProjectInput): Promise<ActionResult<SaveResultDTO>> {
  return run("saveProject", saveProjectSchema, input, async ({ id, revision }) => {
    const res = await saveService(await creator(), id, revision);
    refreshList();
    return res;
  });
}

export async function renameProject(input: RenameProjectInput): Promise<ActionResult<null>> {
  return run("renameProject", renameProjectSchema, input, async ({ id, name }) => {
    await renameService(await creator(), id, name);
    refreshList();
    return null;
  });
}

/** PRJ-05. */
export async function duplicateProject(
  input: ProjectIdInput,
): Promise<ActionResult<{ id: string }>> {
  return run("duplicateProject", projectIdSchema, input, async ({ id }) => {
    const newId = await duplicateService(await creator(), id);
    refreshList();
    return { id: newId };
  });
}

/** PRJ-05. */
export async function deleteProject(input: ProjectIdInput): Promise<ActionResult<null>> {
  return run("deleteProject", projectIdSchema, input, async ({ id }) => {
    await deleteService(await creator(), id);
    refreshList();
    return null;
  });
}
