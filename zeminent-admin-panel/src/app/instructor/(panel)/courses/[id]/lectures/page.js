import CourseLectures from "@/views/admin/CourseLectures";

export const metadata = { title: "Curriculum" };

// Reuses the admin curriculum view; basePath points its "back" links at the
// instructor panel.
export default function Page() {
  return <CourseLectures basePath="/instructor" />;
}
