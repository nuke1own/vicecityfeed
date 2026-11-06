import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/AuthShell";
import { SignUpForm } from "@/components/account/SignUpForm";
import { getCurrentProfile, profileHref } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Join",
  description: "Create your Vice City Feed account and join the GTA VI community.",
  alternates: { canonical: "/signup/" },
};

export default async function SignUpPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(profileHref(profile.handle));

  return (
    <AuthShell
      title="Join Vice City Feed"
      description="Pick a handle and start talking GTA VI with everyone else counting down."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login/" className="font-semibold text-white underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
