import type { Metadata } from "next";
import { FeedHome } from "@/components/FeedHome";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/feed/" },
  title: "Feed",
  description: SITE.description,
};

export const revalidate = 60;

export default function FeedPage() {
  return <FeedHome />;
}
