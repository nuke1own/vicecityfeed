import { HomeDesk } from "@/components/HomeDesk";
import { HomeWelcome } from "@/components/HomeWelcome";
import { getPublishedFeed } from "@/lib/articles-server";

export async function FeedHome() {
  const articles = await getPublishedFeed();
  return (
    <main id="main">
      <HomeWelcome />
      <HomeDesk articles={articles} />
    </main>
  );
}
