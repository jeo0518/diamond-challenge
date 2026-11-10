import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign up — GroupGrub" };

export default function Page() {
  // Suspense is needed because the form reads ?callbackUrl from the URL.
  return (
    <Suspense>
      <AuthForm mode="signup" role="CUSTOMER" />
    </Suspense>
  );
}
