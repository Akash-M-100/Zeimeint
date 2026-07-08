import { redirect } from "next/navigation";

// Back-compat: the admin login moved to the shared /login (role toggle).
export default function Page() {
  redirect("/login");
}
