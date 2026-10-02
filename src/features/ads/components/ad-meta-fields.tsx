"use client";

import { useState } from "react";
import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/config/categories";
import { limits } from "@/config/limits";
import { ImageUpload } from "@/features/uploads/components/image-upload";

import type { AdMetaInput } from "../schemas";

/** AD-01 / AD-05 form fields: title, description, category, tags, custom thumbnail. */
export function AdMetaFields({
  control,
  register,
  errors,
  descriptionLength,
}: {
  control: Control<AdMetaInput>;
  register: UseFormRegister<AdMetaInput>;
  errors: FieldErrors<AdMetaInput>;
  descriptionLength: number;
}) {
  return (
    <>
      <Field label="Title" required error={errors.title?.message}>
        {(p) => <Input {...p} maxLength={limits.text.titleMax} {...register("title")} />}
      </Field>
      <Field
        label="Description"
        error={errors.description?.message}
        hint={`${descriptionLength}/${limits.text.descriptionMax}`}
      >
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            maxLength={limits.text.descriptionMax}
            {...register("description")}
          />
        )}
      </Field>
      <Field label="Category" required error={errors.category?.message}>
        {(p) => (
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id={p.id} aria-invalid={p["aria-invalid"]} className="w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>
      <Controller
        control={control}
        name="tags"
        render={({ field }) => (
          <TagsInput
            value={field.value ?? []}
            onChange={field.onChange}
            error={errors.tags?.message ?? errors.tags?.[0]?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="customThumbnailUrl"
        render={({ field }) => (
          <ImageUpload
            kind="thumbnail"
            label="Custom thumbnail (optional)"
            shape="wide"
            value={field.value ?? null}
            onChange={field.onChange}
          />
        )}
      />
    </>
  );
}

function TagsInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Field
      label="Tags"
      error={error}
      hint={`Separate with commas. Up to ${limits.text.tagsMax} tags.`}
    >
      {(p) => (
        <Input
          {...p}
          value={text}
          placeholder="snacks, crunchy, summer"
          onChange={(e) => {
            setText(e.target.value);
            onChange(
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            );
          }}
        />
      )}
    </Field>
  );
}
