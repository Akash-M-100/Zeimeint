"use client";

import { useState } from "react";

import { Field, Input, Textarea } from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { getId } from "@/utils/entity";

// Lightweight create/edit form for a course Section. Mirrors LectureForm's
// shape so the parent page can swap the two with the same Modal wrapper.
export default function SectionForm({
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
}) {
  const isEdit = Boolean(getId(initialValues));

  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Section title is required");
      return;
    }
    setError("");
    onSubmit({ title: trimmed, description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Section title" htmlFor="sec-title" error={error} required>
        <Input
          id="sec-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Getting started with React"
          error={error}
        />
      </Field>

      <Field label="Description (optional)" htmlFor="sec-desc">
        <Textarea
          id="sec-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short summary of what this section covers"
        />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>
          {isEdit ? "Save changes" : "Add section"}
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
