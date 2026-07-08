import { Suspense } from "react";
import Login from "@/views/Login";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
