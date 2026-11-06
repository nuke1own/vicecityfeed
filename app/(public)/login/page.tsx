import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/AuthShell";
import { ResendConfirmationForm } from "@/components/account/ResendConfirmationForm";
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

  const notice =
    params.error === "link"
      ? "That confirmation link has expired or was already used. Send yourself a new one below."
      : undefined;

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back to Vice City Feed."
      footer={
        <>
          <p>
            New here?{" "}
            <Link href="/signup/" className="font-semibold text-white underline underline-offset-4">
              Create an account
            </Link>
          </p>
          <ResendConfirmationForm />
        </>
      }
    >
      <SignInForm next={next} notice={notice} />
    </AuthShell>
  );
}
