import AdminLayout from "@/components/admin/AdminLayout";

// Guarded shell for the admin panel (sidebar + topbar + auth guard).
export default function AdminPanelLayout({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
