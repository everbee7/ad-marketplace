import { afterEach, describe, expect, it } from "vitest";

import { env, resetEnvCache } from "./env";

// ADR-0007: the local storage driver is fine in self-hosted production, refused only on Vercel.

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
  resetEnvCache();
});

describe("env: storage driver rules", () => {
  it("allows the local driver in production on a self-hosted server", () => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: "D:\\media\\uploads",
    });
    resetEnvCache();
    expect(env.STORAGE_DRIVER).toBe("local");
    expect(env.STORAGE_LOCAL_DIR).toBe("D:\\media\\uploads");
  });

  it("refuses the local driver on Vercel and names the variable, not its value", () => {
    Object.assign(process.env, { NODE_ENV: "production", STORAGE_DRIVER: "local", VERCEL: "1" });
    resetEnvCache();
    expect(() => env.STORAGE_DRIVER).toThrow(
      /STORAGE_DRIVER: the local driver is refused on Vercel/,
    );
    expect(() => env.STORAGE_DRIVER).not.toThrow(/test-secret/);
  });
});
