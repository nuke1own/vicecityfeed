import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, primaryButtonClass } from "@/components/account/AuthCard";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import { getCurrentUser } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/** Reached from the reset email, after /auth/confirm signs the member in. */
export default async function ResetPasswordPage() {
  if (!(await getCurrentUser())) {
    return (
      <AuthCard
        title="This reset link has expired"
        titleId="reset-heading"
        description="Reset links work once and expire after an hour. Request a new one to continue."
      >
        <Link href="/forgot-password/" className={primaryButtonClass}>
          Get a new link
        </Link>
      </AuthCard>
    );
  }
  return <ResetPasswordForm />;
}
