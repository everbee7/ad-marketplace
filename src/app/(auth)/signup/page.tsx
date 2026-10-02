import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SIGNUP_ROLES, type SignupRole } from "@/config/enums";
import { ROLE_HOME } from "@/config/routes";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getCurrentUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const { role } = await searchParams;
  const defaultRole = SIGNUP_ROLES.includes(role as SignupRole) ? (role as SignupRole) : undefined;
  return (
    <>
      <h1 className="panel-title">Create account</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        Join Flashd as a business or a creator.
      </p>
      <SignUpForm defaultRole={defaultRole} />
    </>
  );
}
