import type { ReactNode } from "react";
import { SocialShell } from "@/components/social/SocialShell";

export default function Layout({ children }: { children: ReactNode }) {
  return <SocialShell>{children}</SocialShell>;
}
