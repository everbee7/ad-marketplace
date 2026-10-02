// `npm run seed:admin -- <email> <password>`: creates (or promotes nothing, only creates) an admin.
// Admins can't sign up (AUTH-01 AC3); this is the only way to create one (ARCHITECTURE §5).

import { auth } from "@/lib/auth";
import { disconnectDb } from "@/lib/db";
import { passwordProblem } from "@/lib/password";

export async function seedAdmin(email: string, password: string): Promise<string> {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const ctx = await auth.$context;
  const normalized = email.trim().toLowerCase();
  const existing = await ctx.internalAdapter.findUserByEmail(normalized);
  if (existing) {
    if ((existing.user as unknown as { role?: string }).role !== "admin") {
      throw new Error(`${normalized} already exists and is not an admin.`);
    }
    return existing.user.id;
  }
  const user = await ctx.internalAdapter.createUser(
    {
      email: normalized,
      name: "Admin",
      emailVerified: true,
      role: "admin",
      onboardingCompleted: true,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  return user.id;
}

const invokedDirectly = process.argv[1] && /seed-admin\.[tj]s$/.test(process.argv[1]);
if (invokedDirectly) {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("usage: npm run seed:admin -- <email> <password>");
    process.exit(1);
  }
  seedAdmin(email, password)
    .then((id) => console.info(`Admin ready: ${email} (${id})`))
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => void disconnectDb());
}
