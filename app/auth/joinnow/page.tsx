"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

import { AuthShell } from "@/app/auth/_components/auth-shell";
import { isDashboardDummyMode } from "@/config/dashboard-dummy.config";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.6 2.4 12 2.4A9.6 9.6 0 0 0 2.4 12c0 5.3 4.3 9.6 9.6 9.6 5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-2H12Z"
      />
      <path
        fill="#34A853"
        d="M3.5 7.7 6.7 10A6 6 0 0 1 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.6 2.4 12 2.4 8.3 2.4 5.1 4.5 3.5 7.7Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.6c2.5 0 4.7-.8 6.2-2.3l-2.9-2.2c-.8.6-1.9 1-3.3 1-2.5 0-4.7-1.7-5.5-4l-3.3 2.6A9.6 9.6 0 0 0 12 21.6Z"
      />
      <path
        fill="#4285F4"
        d="M21.2 12.2c0-.6-.1-1.1-.2-1.9H12v3.9h5.5c-.3 1.3-1.1 2.3-2.2 3.1l2.9 2.2c1.7-1.6 2.9-4 2.9-7.3Z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (!isDashboardDummyMode()) return;
    if (status === "loading") return;
    if (status === "authenticated") {
      router.replace("/user/dashboard");
      return;
    }
    void signIn("preview", { callbackUrl: "/user/dashboard" });
  }, [status, router]);

  if (isDashboardDummyMode()) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-sm text-muted-foreground">Opening your dashboard…</p>
        <Link
          href="/"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <AuthShell
      title="Join SalesLay"
      description="Continue with your Google account to access your dashboard."
      actionLabel="Join now with Google"
      actionIcon={<GoogleIcon />}
      onAction={() => {
        void signIn("google", { callbackUrl: "/user/dashboard" });
      }}
      footerText="One-click access with your Google account."
    />
  );
}
