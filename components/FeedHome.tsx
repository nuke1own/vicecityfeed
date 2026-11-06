import { HomeDesk } from "@/components/HomeDesk";
import { getPublishedFeed } from "@/lib/articles-server";

export async function FeedHome() {
  const articles = await getPublishedFeed();
  return (
    <main id="main">
      <HomeDesk articles={articles} />
    </main>
  );
}
