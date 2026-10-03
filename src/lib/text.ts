/** Escapes user text for use inside a MongoDB $regex (admin search). */
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
