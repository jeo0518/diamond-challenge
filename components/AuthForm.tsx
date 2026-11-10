"use client";

// One form used by all four auth pages: customer/owner × login/sign-up.
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { HOME_FOR_ROLE, LOGIN_FOR_ROLE, type Role } from "@/lib/roles";

type Props = { mode: "login" | "signup"; role: Role };

const SIGNUP_FOR_ROLE: Record<Role, string> = { CUSTOMER: "/signup", OWNER: "/owner/signup" };

/** Only follow callbackUrls that point inside our own site (e.g. "/group/abc"). */
function safeCallback(url: string | null): string | null {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : null;
}

export default function AuthForm({ mode, role }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = role === "OWNER";
  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (isSignup) {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email,
            password,
            phone: form.get("phone") || undefined,
            role,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Sign-up failed. Please try again.");
          return;
        }
      }

      // Log in (right after sign-up, too).
      const result = await signIn("credentials", { email, password, role, redirect: false });
      if (!result || result.error) {
        setError(
          result?.error && result.error !== "CredentialsSignin"
            ? result.error
            : "Wrong email or password.",
        );
        return;
      }
      router.push(safeCallback(searchParams.get("callbackUrl")) ?? HOME_FOR_ROLE[role]);
      router.refresh(); // re-render the nav bar with the new session
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200";

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
        {isOwner ? "Restaurant owners" : "Customers & organizers"}
      </p>
      <h1 className="mb-5 text-2xl font-bold">
        {isSignup ? (isOwner ? "Create an owner account" : "Create an account") : "Log in"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{isOwner ? "Your name" : "Name"}</span>
            <input name="name" required maxLength={100} autoComplete="name" className={input} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={input}
          />
          {isSignup && <span className="mt-1 block text-xs text-gray-500">At least 8 characters.</span>}
        </label>
        {isSignup && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Phone <span className="font-normal text-gray-500">(optional)</span>
            </span>
            <input name="phone" type="tel" maxLength={30} autoComplete="tel" className={input} />
            <span className="mt-1 block text-xs text-gray-500">
              {isOwner ? "For your own account. Your restaurant's phone is set later." : "Shared with the restaurant on your orders."}
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <div className="mt-5 space-y-1 text-center text-sm text-gray-600">
        {isSignup ? (
          <p>
            Already have an account?{" "}
            <Link href={LOGIN_FOR_ROLE[role]} className="font-medium text-orange-700 hover:underline">Log in</Link>
          </p>
        ) : (
          <p>
            New here?{" "}
            <Link href={SIGNUP_FOR_ROLE[role]} className="font-medium text-orange-700 hover:underline">Create an account</Link>
          </p>
        )}
        <p>
          {isOwner ? "Ordering food for a group? " : "Own a restaurant? "}
          <Link
            href={isOwner ? LOGIN_FOR_ROLE.CUSTOMER : LOGIN_FOR_ROLE.OWNER}
            className="font-medium text-orange-700 hover:underline"
          >
            {isOwner ? "Customer login" : "Owner login"}
          </Link>
        </p>
      </div>
    </div>
  );
}
