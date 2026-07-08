import { getServerUser } from "@/lib/session";
import Sidebar from "@/app/Dashboard/Sidebar";
import Nav from "@/components/sections/Nav";

export default async function CoursesLayout({ children }) {
  const user = await getServerUser();

  // Authenticated viewers see the catalog inside the full app shell — same
  // chrome they'd see on /Dashboard, so deep-linking from the sidebar's
  // "Courses" item feels continuous.
  if (user) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 pt-14 md:pt-0">{children}</main>
      </div>
    );
  }

  // Anonymous viewers get the public marketing nav so there's a way back to
  // the landing page and a visible sign-in CTA. No sidebar — they wouldn't
  // be able to navigate inside it anyway.
  return (
    <>
      <Nav />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
