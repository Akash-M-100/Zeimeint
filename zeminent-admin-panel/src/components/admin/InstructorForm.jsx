"use client";

import { useState } from "react";

import { Field, Input } from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { getId } from "@/utils/entity";

// Create / edit form for an instructor account. On edit, email is read-only and
// the password is optional ("leave blank to keep the current one").
export default function InstructorForm({
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
}) {
  const isEdit = Boolean(getId(initialValues));

  const [form, setForm] = useState({
    name: initialValues.name || "",
    email: initialValues.email || "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      next.name = "Name must be at least 2 characters";
    if (!isEdit) {
      if (!form.email.trim()) next.email = "Email is required";
      if (!form.password || form.password.length < 6)
        next.password = "Password must be at least 6 characters";
    } else if (form.password && form.password.length < 6) {
      next.password = "Password must be at least 6 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    const payload = { name: form.name.trim() };
    if (!isEdit) payload.email = form.email.trim();
    if (form.password) payload.password = form.password;

    onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Full name" htmlFor="inst-name" error={errors.name} required>
        <Input
          id="inst-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Priya Sharma"
          error={errors.name}
          disabled={loading}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="inst-email"
        error={errors.email}
        hint={isEdit ? "Email can't be changed after creation" : undefined}
        required={!isEdit}
      >
        <Input
          id="inst-email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="instructor@example.com"
          error={errors.email}
          disabled={loading || isEdit}
        />
      </Field>

      <Field
        label={isEdit ? "New password" : "Password"}
        htmlFor="inst-password"
        error={errors.password}
        hint={isEdit ? "Leave blank to keep the current password" : "At least 6 characters"}
        required={!isEdit}
      >
        <Input
          id="inst-password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••••"
          error={errors.password}
          disabled={loading}
        />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} disabled={loading}>
          {isEdit ? "Save changes" : "Create instructor"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
