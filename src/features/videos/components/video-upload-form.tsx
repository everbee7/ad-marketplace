"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/forms/field";
import { Field } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { limits } from "@/config/limits";
import { UploadProgress } from "@/features/uploads/components/upload-progress";
import { VideoDrop } from "@/features/uploads/components/video-drop";
import { useMediaUpload } from "@/features/uploads/use-media-upload";
import { ok, type ActionResult } from "@/lib/errors";

import { cancelVideoUpload, finalizeVideoUpload, startVideoUpload } from "../actions";
import { VIDEO_HINT, videoMetaSchema, type VideoMetaInput } from "../schemas";

export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const doneLabel = (s: string) =>
  s === "ready" ? "Uploaded. Your video is ready." : `Status: ${s}`;

/** VID-01: same experience as AD-01 (pre-checks, progress, cancel, live status). */
export function VideoUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const upload = useMediaUpload({
    kind: "creatorVideo",
    finalize: finalizeVideoUpload,
    cancel: cancelVideoUpload,
  });

  const { form, onSubmit, error, ready } = useActionForm({
    schema: videoMetaSchema,
    defaultValues: { title: "", description: "" } as VideoMetaInput,
    action: async (values): Promise<ActionResult<VideoMetaInput>> => ok(values),
    onSuccess: async (meta) => {
      if (!file) {
        setFileError("Choose a video file.");
        return;
      }
      const res = await upload.run(file, (video) => startVideoUpload({ meta, file: video.meta }));
      if (res?.status === "ready") {
        router.push("/creator/videos");
        router.refresh();
      }
    },
  });
  const e = form.formState.errors;

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
          accept={VIDEO_ACCEPT}
          hint={VIDEO_HINT}
          file={file}
          disabled={upload.busy}
          invalid={!!fileError}
          onFile={(f) => {
            setFile(f);
            setFileError(null);
            upload.reset();
            if (f && !form.getValues("title"))
              form.setValue("title", f.name.replace(/\.[^.]+$/, "").slice(0, limits.text.titleMax));
          }}
        />
        {fileError && (
          <p role="alert" className="text-xs text-destructive">
            {fileError}
          </p>
        )}
      </div>
      <Field label="Title" required error={e.title?.message}>
        {(p) => <Input {...p} maxLength={limits.text.titleMax} {...form.register("title")} />}
      </Field>
      <Field label="Description" error={e.description?.message}>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            maxLength={limits.text.descriptionMax}
            {...form.register("description")}
          />
        )}
      </Field>
      <UploadProgress phase={upload.phase} onCancel={upload.cancel} doneLabel={doneLabel} />
      <Button
        type="submit"
        disabled={upload.busy || !ready}
        className="w-full sm:w-auto sm:self-start"
      >
        Upload video
      </Button>
    </form>
  );
}

/** VID-01 AC2: retry a failed upload on the same video. */
export function RetryVideoUpload({ videoId, onDone }: { videoId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useMediaUpload({
    kind: "creatorVideo",
    finalize: finalizeVideoUpload,
    cancel: cancelVideoUpload,
  });
  return (
    <div className="flex flex-col gap-4">
      <VideoDrop
        accept={VIDEO_ACCEPT}
        hint={VIDEO_HINT}
        file={file}
        disabled={upload.busy}
        onFile={setFile}
      />
      <UploadProgress phase={upload.phase} onCancel={upload.cancel} doneLabel={doneLabel} />
      <Button
        type="button"
        disabled={!file || upload.busy}
        onClick={async () => {
          if (!file) return;
          const res = await upload.run(file, (video) =>
            startVideoUpload({ videoId, file: video.meta }),
          );
          if (res?.status === "ready") onDone();
        }}
      >
        Retry upload
      </Button>
    </div>
  );
}
