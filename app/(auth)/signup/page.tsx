import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/account/SignUpForm";
import { getCurrentProfile, profileHref } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create your Vice City Feed account and join the GTA VI community.",
  alternates: { canonical: "/signup/" },
};

export default async function SignUpPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(profileHref(profile.handle));
  return <SignUpForm />;
}
