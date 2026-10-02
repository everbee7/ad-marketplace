"use client";

import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormMessage } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/config/categories";
import { limits } from "@/config/limits";
import { ImageUpload } from "@/features/uploads/components/image-upload";

import { completeOnboarding, updateProfile } from "../actions";
import {
  businessProfileSchema,
  creatorProfileSchema,
  type BusinessProfileInput,
  type CreatorProfileInput,
  type ProfileDTO,
} from "../schemas";

type Mode = "onboarding" | "edit";

function CategorySelect({
  value,
  onChange,
  id,
  invalid,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  id: string;
  invalid?: boolean;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function useSubmit(mode: Mode) {
  const router = useRouter();
  return {
    action: mode === "onboarding" ? completeOnboarding : updateProfile,
    onSuccess: (data: { redirectTo: string } | null) => {
      if (mode === "onboarding" && data) {
        router.replace(data.redirectTo);
        router.refresh();
      } else {
        toast.success("Profile saved");
        router.refresh();
      }
    },
  };
}

function Counter({ value, max }: { value: string | null | undefined; max: number }) {
  return (
    <span>
      {(value ?? "").length}/{max}
    </span>
  );
}

export function BusinessProfileForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: Extract<ProfileDTO, { role: "business" }>;
}) {
  const submit = useSubmit(mode);
  const { form, onSubmit, pending, error } = useActionForm({
    schema: businessProfileSchema,
    defaultValues: {
      role: "business",
      companyName: initial?.companyName ?? "",
      logoUrl: initial?.logoUrl ?? null,
      website: initial?.website ?? "",
      category: initial?.category as BusinessProfileInput["category"],
      description: initial?.description ?? "",
    } as BusinessProfileInput,
    action: submit.action as (v: BusinessProfileInput) => ReturnType<typeof completeOnboarding>,
    onSuccess: submit.onSuccess,
  });
  const { register, control, formState, watch } = form;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {error && <FormMessage>{error.message}</FormMessage>}
      <Field label="Company name" required error={e.companyName?.message}>
        {(p) => <Input {...p} autoComplete="organization" {...register("companyName")} />}
      </Field>
      <Controller
        control={control}
        name="logoUrl"
        render={({ field }) => (
          <ImageUpload
            kind="logo"
            label="Logo"
            value={field.value ?? null}
            onChange={field.onChange}
          />
        )}
      />
      <Field label="Category" required error={e.category?.message}>
        {(p) => (
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <CategorySelect
                id={p.id}
                invalid={p["aria-invalid"]}
                value={field.value}
                onChange={field.onChange}
                placeholder="Choose a category"
              />
            )}
          />
        )}
      </Field>
      <Field label="Website" error={e.website?.message}>
        {(p) => (
          <Input
            {...p}
            type="url"
            placeholder="https://"
            autoComplete="url"
            {...register("website")}
          />
        )}
      </Field>
      <Field
        label="Short description"
        error={e.description?.message}
        hint={<Counter value={watch("description")} max={limits.text.shortDescriptionMax} />}
      >
        {(p) => (
          <Textarea
            {...p}
            maxLength={limits.text.shortDescriptionMax}
            rows={3}
            {...register("description")}
          />
        )}
      </Field>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending && <Spinner />}
        {mode === "onboarding" ? "Enter the portal" : "Save profile"}
      </Button>
    </form>
  );
}

export function CreatorProfileForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: Extract<ProfileDTO, { role: "creator" }>;
}) {
  const submit = useSubmit(mode);
  const { form, onSubmit, pending, error } = useActionForm({
    schema: creatorProfileSchema,
    defaultValues: {
      role: "creator",
      displayName: initial?.displayName ?? "",
      avatarUrl: initial?.avatarUrl ?? null,
      niche: initial?.niche as CreatorProfileInput["niche"],
      bio: initial?.bio ?? "",
      youtube: initial?.youtube ?? "",
      tiktok: initial?.tiktok ?? "",
      instagram: initial?.instagram ?? "",
      other: initial?.other ?? "",
    } as CreatorProfileInput,
    action: submit.action as (v: CreatorProfileInput) => ReturnType<typeof completeOnboarding>,
    onSuccess: submit.onSuccess,
  });
  const { register, control, formState, watch } = form;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {error && <FormMessage>{error.message}</FormMessage>}
      <Field label="Display name" required error={e.displayName?.message}>
        {(p) => <Input {...p} autoComplete="nickname" {...register("displayName")} />}
      </Field>
      <Controller
        control={control}
        name="avatarUrl"
        render={({ field }) => (
          <ImageUpload
            kind="avatar"
            label="Avatar"
            shape="circle"
            value={field.value ?? null}
            onChange={field.onChange}
          />
        )}
      />
      <Field label="Niche" required error={e.niche?.message}>
        {(p) => (
          <Controller
            control={control}
            name="niche"
            render={({ field }) => (
              <CategorySelect
                id={p.id}
                invalid={p["aria-invalid"]}
                value={field.value}
                onChange={field.onChange}
                placeholder="Choose your niche"
              />
            )}
          />
        )}
      </Field>
      <Field
        label="Bio"
        error={e.bio?.message}
        hint={<Counter value={watch("bio")} max={limits.text.shortDescriptionMax} />}
      >
        {(p) => (
          <Textarea
            {...p}
            maxLength={limits.text.shortDescriptionMax}
            rows={3}
            {...register("bio")}
          />
        )}
      </Field>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="eyebrow mb-3 text-muted-foreground">Social links</legend>
        {(["youtube", "tiktok", "instagram", "other"] as const).map((k) => (
          <Field
            key={k}
            label={
              k === "tiktok"
                ? "TikTok"
                : k === "youtube"
                  ? "YouTube"
                  : k[0]!.toUpperCase() + k.slice(1)
            }
            error={e[k]?.message}
          >
            {(p) => <Input {...p} type="url" placeholder="https://" {...register(k)} />}
          </Field>
        ))}
      </fieldset>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending && <Spinner />}
        {mode === "onboarding" ? "Enter the portal" : "Save profile"}
      </Button>
    </form>
  );
}
