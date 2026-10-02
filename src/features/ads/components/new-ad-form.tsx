"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { limits } from "@/config/limits";
import { UploadProgress } from "@/features/uploads/components/upload-progress";
import { VideoDrop } from "@/features/uploads/components/video-drop";
import { useMediaUpload } from "@/features/uploads/use-media-upload";
import { ok, type ActionResult } from "@/lib/errors";

import { cancelAdUpload, finalizeAdUpload, startAdUpload } from "../actions";
import { AD_STATUS_INFO } from "../lifecycle";
import { adMetaSchema, type AdMetaInput } from "../schemas";

import { AdMetaFields } from "./ad-meta-fields";

export const AD_ACCEPT = "video/mp4,video/quicktime,.mp4,.mov";
export const AD_HINT = `MP4 or MOV (H.264), ${limits.ad.minDurationSec}–${limits.ad.maxDurationSec} seconds, up to 50 MB.`;

export const adDoneLabel = (s: string) =>
  `Uploaded. Status: ${AD_STATUS_INFO[s as keyof typeof AD_STATUS_INFO]?.label ?? s}.`;

/** AD-01: metadata + video; checks in the browser, uploads straight to storage, then verifies. */
export function NewAdForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const upload = useMediaUpload({ kind: "ad", finalize: finalizeAdUpload, cancel: cancelAdUpload });

  // Validation runs on the client with the shared schema; the server re-validates in startAdUpload.
  const { form, onSubmit, error, ready } = useActionForm({
    schema: adMetaSchema,
    defaultValues: {
      title: "",
      description: "",
      tags: [],
      customThumbnailUrl: null,
    } as Partial<AdMetaInput> as AdMetaInput,
    action: async (values): Promise<ActionResult<AdMetaInput>> => ok(values),
    onSuccess: async (meta) => {
      if (!file) {
        setFileError("Choose a video file.");
        return;
      }
      const res = await upload.run(file, (video) => startAdUpload({ meta, file: video.meta }));
      if (res?.status === "pending_review") {
        router.push(`/business/ads/${res.id}`);
        router.refresh();
      }
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {error && <FormMessage>{error.message}</FormMessage>}
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-muted-foreground">
          Video file
          <span aria-hidden="true" className="ml-1 text-primary">
            *
          </span>
        </span>
        <VideoDrop
          accept={AD_ACCEPT}
          hint={AD_HINT}
          file={file}
          disabled={upload.busy}
          invalid={!!fileError}
          onFile={(f) => {
            setFile(f);
            setFileError(null);
            upload.reset();
          }}
        />
        {fileError && (
          <p role="alert" className="text-xs text-destructive">
            {fileError}
          </p>
        )}
      </div>
      <AdMetaFields
        control={form.control}
        register={form.register}
        errors={form.formState.errors}
        descriptionLength={(form.watch("description") ?? "").length}
      />
      <UploadProgress phase={upload.phase} onCancel={upload.cancel} doneLabel={adDoneLabel} />
      <Button
        type="submit"
        disabled={upload.busy || !ready}
        className="w-full sm:w-auto sm:self-start"
      >
        Upload ad
      </Button>
    </form>
  );
}
