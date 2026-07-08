import { redirect } from "next/navigation";

// /instructor -> /instructor/dashboard
export default function InstructorIndex() {
  redirect("/instructor/dashboard");
}
