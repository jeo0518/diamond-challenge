import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in — GroupGrub" };

export default function Page() {
  // Suspense is needed because the form reads ?callbackUrl from the URL.
  return (
    <Suspense>
      <AuthForm mode="login" role="CUSTOMER" />
    </Suspense>
  );
}
