"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck, GraduationCap } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/common/AuthShell";
import Badge from "@/components/common/Badge";
import { Field, Input } from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { ROLE_HOME, PANEL_NAMES } from "@/config/constants";
import { cn } from "@/utils/cn";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    icon: ShieldCheck,
    subtitle: "Full control: courses, instructors, students and payments.",
    placeholder: "admin@example.com",
  },
  {
    key: "instructor",
    label: "Instructor",
    icon: GraduationCap,
    subtitle: "Manage your course lectures, sections and videos.",
    placeholder: "instructor@example.com",
  },
];

export default function Login() {
  const { login, isAuthenticated, role: currentRole, hydrated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [role, setRole] = useState("admin");
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const active = ROLES.find((r) => r.key === role) || ROLES[0];

  // Already signed in? Bounce to the matching panel.
  useEffect(() => {
    if (hydrated && isAuthenticated && currentRole) {
      router.replace(ROLE_HOME[currentRole] || "/");
    }
  }, [hydrated, isAuthenticated, currentRole, router]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required";
    if (!form.password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(role, form.email.trim(), form.password);
      toast.success(`Welcome, ${user?.name || active.label.toLowerCase()}`);
      // Only honour `from` if it belongs to this role's panel, else go home.
      const home = ROLE_HOME[user?.role] || "/";
      const dest = from && from.startsWith(home.split("/dashboard")[0]) ? from : home;
      router.replace(dest);
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      brand={PANEL_NAMES[role]}
      title={`${active.label} login`}
      subtitle={active.subtitle}
      badge={
        <Badge tone="brand">
          <active.icon className="h-3.5 w-3.5" />
          {active.label} access
        </Badge>
      }
    >
      {/* Role toggle */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => {
              setRole(r.key);
              setErrors({});
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
              role === r.key
                ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <r.icon className="h-4 w-4" />
            {r.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={active.placeholder}
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password} required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
        </Field>

        <Button type="submit" fullWidth loading={loading}>
          Sign in as {active.label.toLowerCase()}
        </Button>
      </form>

      <p className="mt-6 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-400 dark:bg-slate-800/60">
        {role === "admin"
          ? "Use the default admin credentials configured in your backend environment."
          : "Instructor accounts are created by an admin from the Instructors page."}
      </p>
    </AuthShell>
  );
}
