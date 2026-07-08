"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import {
  Field,
  Input,
  Textarea,
  Select,
  Toggle,
  FileInput,
} from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { COURSE_CATEGORIES } from "@/config/constants";
import { getThumb } from "@/utils/entity";

// Reusable create/edit course form. Calls `onSubmit(formData)` with a
// FormData instance (so the thumbnail file rides along with the fields).
export default function CourseForm({
  initialValues = {},
  onSubmit,
  loading = false,
  submitLabel = "Save course",
  onCancel,
  extraSection = null,
}) {
  const [form, setForm] = useState({
    title: initialValues.title || "",
    description: initialValues.description || "",
    category: initialValues.category || "",
    isPublished: initialValues.isPublished ?? false,
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [preview, setPreview] = useState(getThumb(initialValues) || "");
  const [errors, setErrors] = useState({});

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.description.trim())
      next.description = "Description is required";
    if (!form.category) next.category = "Select a category";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("category", form.category);
    fd.append("isPublished", String(form.isPublished));
    if (thumbnailFile) fd.append("thumbnail", thumbnailFile);

    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Course title" htmlFor="title" error={errors.title} required>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Full-Stack Web Development"
          error={errors.title}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={errors.description}
        required
      >
        <Textarea
          id="description"
          rows={5}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What will students learn in this course?"
          error={errors.description}
        />
      </Field>

      <Field
        label="Category"
        htmlFor="category"
        error={errors.category}
        required
      >
        <Select
          id="category"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          error={errors.category}
        >
          <option value="">Select a category</option>
          {COURSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Thumbnail" hint="JPG or PNG, 16:9 works best">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {preview ? (
            <img
              src={preview}
              alt="Thumbnail preview"
              className="aspect-video w-40 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex aspect-video w-40 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <ImageIcon className="h-7 w-7" />
            </div>
          )}
          <FileInput
            id="thumbnail"
            accept="image/*"
            onChange={handleThumbnail}
            fileName={thumbnailFile?.name}
            placeholder="Upload thumbnail image"
            icon={ImageIcon}
            className="flex-1"
          />
        </div>
      </Field>

      <Field label="Visibility">
        <Toggle
          checked={form.isPublished}
          onChange={(v) => set("isPublished", v)}
          label={form.isPublished ? "Published" : "Draft"}
          description="Published courses are visible to students."
        />
      </Field>

      {extraSection}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
