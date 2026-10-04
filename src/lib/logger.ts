// Structured JSON logs for Vercel runtime logs (ARCHITECTURE §12). Never log secrets or media URLs of private videos.

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogContext = {
  requestId?: string;
  userId?: string;
  docId?: string;
  route?: string;
  [key: string]: unknown;
};

function threshold(): Level {
  const v = process.env.LOG_LEVEL;
  return v === "debug" || v === "info" || v === "warn" || v === "error" ? v : "info";
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function write(level: Level, msg: string, ctx?: LogContext, err?: unknown) {
  if (process.env.NODE_ENV === "test" && level !== "error" && !process.env.LOG_IN_TESTS) return;
  if (order[level] < order[threshold()]) return;
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...ctx,
    ...(err === undefined ? {} : { err: serializeError(err) }),
  });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => write("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => write("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext, err?: unknown) => write("warn", msg, ctx, err),
  error: (msg: string, ctx?: LogContext, err?: unknown) => write("error", msg, ctx, err),
};
