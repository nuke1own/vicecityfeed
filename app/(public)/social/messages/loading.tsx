import { FeedSkeleton } from "@/components/social/FeedSkeleton";

export default function Loading() {
  return <FeedSkeleton title="messages" rows={5} />;
}
