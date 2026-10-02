"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useSyncExternalStore, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { ZodType } from "zod";

import type { ActionError, ActionResult } from "@/lib/errors";

// React Hook Form + Zod + Server Action glue: field errors from the server land on the right input.

const subscribeNoop = () => () => {};

export function useActionForm<TValues extends FieldValues, TOut>(opts: {
  schema: ZodType<unknown, TValues>;
  defaultValues: DefaultValues<TValues>;
  action: (values: TValues) => Promise<ActionResult<TOut>>;
  onSuccess?: (data: TOut, values: TValues) => void | Promise<void>;
}) {
  const form = useForm<TValues>({
    // The resolver validates against the same schema the server uses.
    resolver: zodResolver(opts.schema as never) as never,
    defaultValues: opts.defaultValues,
    mode: "onTouched",
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionError | null>(null);
  // Submit stays disabled until hydration, so an early click can't trigger a native form post.
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await opts.action(values);
        if (!res.ok) {
          setError(res.error);
          for (const [name, message] of Object.entries(res.error.fields ?? {})) {
            if (!name.startsWith("_")) form.setError(name as Path<TValues>, { message });
          }
          return;
        }
        await opts.onSuccess?.(res.data, values);
      } catch {
        setError({ code: "INTERNAL", message: "Network error. Please try again." });
      }
    });
  });

  return { form, onSubmit, pending, error, setError, ready };
}
