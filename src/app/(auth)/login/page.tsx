import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROLE_HOME, safeNextPath } from "@/config/routes";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getCurrentUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(nextPath, user.role) ?? ROLE_HOME[user.role]);
  return (
    <>
      <h1 className="panel-title">Enter the portal</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        Log in to your Flashd account.
      </p>
      <SignInForm next={nextPath} />
    </>
  );
}
