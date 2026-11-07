import Link from "next/link";
import { EmptyStories } from "@/components/EmptyStories";
import { MAP_PLACES } from "@/lib/desks";

export function MapIndex() {
  if (MAP_PLACES.length === 0) {
    return <EmptyStories />;
  }

  return (
    <ol data-map-index className="space-y-3">
      {MAP_PLACES.map((place) => (
        <li key={`${place.name}-${place.slug}`}>
          <Link
            href={`/posts/${place.slug}`}
            className="grid gap-2 rounded-2xl bg-surface px-5 py-4 text-white transition-transform duration-300 ease-out hover:-translate-y-0.5 sm:grid-cols-[minmax(10rem,14rem)_minmax(8rem,12rem)_1fr_auto] sm:items-baseline sm:gap-6"
          >
            <p className="font-display text-lg font-extrabold tracking-tight md:text-xl">
              {place.name}
            </p>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white uppercase">
              {place.region}
            </p>
            <p className="text-sm leading-snug text-white">{place.note}</p>
            <p className="text-sm font-semibold text-white sm:text-right">Read</p>
          </Link>
        </li>
      ))}
    </ol>
  );
}
