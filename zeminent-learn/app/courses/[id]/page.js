import { notFound } from "next/navigation";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";
import CoursePlayer from "./CoursePlayer";

export const dynamic = "force-dynamic";

async function fetchCourseBundle(id, session) {
  const res = await nestFetch(`/courses/${encodeURIComponent(id)}`, {
    bearer: session?.rt,
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return json?.data || json;
}

export default async function CoursePlayerPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  const bundle = await fetchCourseBundle(id, session);
  if (!bundle?.course) notFound();

  const viewerState = session ? "authenticated" : "anonymous";

  return (
    <CoursePlayer
      course={bundle.course}
      sections={bundle.sections || []}
      orphanLectures={bundle.orphanLectures || []}
      viewerState={viewerState}
      viewerHasFullAccess={Boolean(bundle.viewerHasFullAccess)}
    />
  );
}
