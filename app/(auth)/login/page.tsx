import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/account/SignInForm";
import { safeNextPath } from "@/lib/community-validation";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Vice City Feed account.",
  alternates: { canonical: "/login/" },
  robots: { index: false, follow: true },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  if (await getCurrentUser()) redirect(next);

  const linkFailed = params.error === "link";
  return (
    <SignInForm
      next={next}
      showResend={linkFailed}
      notice={
        linkFailed
          ? "That link has expired or was already used. If you just confirmed your email, sign in below. Otherwise get a new link."
          : undefined
      }
    />
  );
}
