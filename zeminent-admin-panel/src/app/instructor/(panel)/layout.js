import InstructorLayout from "@/components/instructor/InstructorLayout";

// Guarded shell for the instructor panel (sidebar + topbar + auth guard).
export default function InstructorPanelLayout({ children }) {
  return <InstructorLayout>{children}</InstructorLayout>;
}
