import type { Metadata } from "next";
import { AlbumListening } from "@/components/AlbumListening";

export const metadata: Metadata = {
  alternates: { canonical: "/album/" },
  title: "The Album",
  description:
    "Play the six official singles from Grand Theft Auto VI: The Album, in-page via Atlantic Records’ YouTube. The full 34-track album arrives November 19, 2026.",
};

export default function AlbumPage() {
  return <AlbumListening />;
}
