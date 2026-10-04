"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormMessage } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { updateAd } from "../actions";
import { updateAdSchema, type AdDetailDTO, type UpdateAdInput } from "../schemas";

import { AdMetaFields } from "./ad-meta-fields";

/** AD-05: metadata edits. Live ads stay live (AC1). */
export function EditAdForm({ ad }: { ad: AdDetailDTO }) {
  const router = useRouter();
  const { form, onSubmit, pending, error, ready } = useActionForm({
    schema: updateAdSchema,
    defaultValues: {
      id: ad.id,
      title: ad.title,
      description: ad.description ?? "",
      category: ad.category as UpdateAdInput["category"],
      tags: ad.tags,
      customThumbnailUrl: ad.customThumbnailUrl,
    } as UpdateAdInput,
    action: updateAd,
    onSuccess: () => {
      toast.success("Changes saved");
      router.push(`/business/ads/${ad.id}`);
      router.refresh();
    },
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {error && <FormMessage>{error.message}</FormMessage>}
      <AdMetaFields
        control={form.control as never}
        register={form.register as never}
        errors={form.formState.errors}
        descriptionLength={(form.watch("description") ?? "").length}
      />
      <Button type="submit" disabled={pending || !ready} className="w-full sm:w-auto sm:self-start">
        {pending && <Spinner />}
        Save changes
      </Button>
    </form>
  );
}
