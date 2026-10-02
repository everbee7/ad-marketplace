"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/features/uploads/components/upload-progress";
import { VideoDrop } from "@/features/uploads/components/video-drop";
import { useMediaUpload } from "@/features/uploads/use-media-upload";

import { cancelAdUpload, finalizeAdUpload, startAdUpload } from "../actions";

import { AD_ACCEPT, AD_HINT, adDoneLabel } from "./new-ad-form";

/** AD-02 AC1 / AD-05: start a new upload on the same ad without losing its metadata. */
export function ReplaceVideo({ adId, note }: { adId: string; note?: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const upload = useMediaUpload({ kind: "ad", finalize: finalizeAdUpload, cancel: cancelAdUpload });

  return (
    <div className="flex flex-col gap-4">
      {note && <p className="text-[13px] text-foreground-secondary">{note}</p>}
      <VideoDrop
        accept={AD_ACCEPT}
        hint={AD_HINT}
        file={file}
        disabled={upload.busy}
        onFile={(f) => {
          setFile(f);
          upload.reset();
        }}
      />
      <UploadProgress phase={upload.phase} onCancel={upload.cancel} doneLabel={adDoneLabel} />
      <Button
        type="button"
        disabled={!file || upload.busy}
        className="w-full sm:w-auto sm:self-start"
        onClick={async () => {
          if (!file) return;
          await upload.run(file, (video) => startAdUpload({ adId, file: video.meta }));
          router.refresh();
        }}
      >
        Replace video
      </Button>
    </div>
  );
}
