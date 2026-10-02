"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { resendVerification } from "../actions";
import { VERIFY_SENT_MESSAGE } from "../schemas";

/** AUTH-02 AC3 / AUTH-03 AC1: resend the verification email. Asks for the email when it isn't known. */
export function ResendVerification({ email: knownEmail }: { email?: string }) {
  const [email, setEmail] = useState(knownEmail ?? "");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const send = () =>
    start(async () => {
      const res = await resendVerification({ email });
      setMessage(
        res.ok
          ? { tone: "success", text: VERIFY_SENT_MESSAGE }
          : { tone: "error", text: res.error.message },
      );
    });

  return (
    <div className="flex flex-col gap-3">
      {!knownEmail && (
        <Input
          type="email"
          aria-label="Email"
          placeholder="Your email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      <Button
        type="button"
        variant="secondary"
        onClick={send}
        disabled={pending || !email}
        className="w-full"
      >
        {pending && <Spinner />}
        Resend email
      </Button>
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
    </div>
  );
}
