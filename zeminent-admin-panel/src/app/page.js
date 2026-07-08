import { redirect } from "next/navigation";

// Staff app (admin + instructor): the root bounces to the shared login.
// Authenticated users are redirected on to their role's panel from there.
export default function Root() {
  redirect("/login");
}
