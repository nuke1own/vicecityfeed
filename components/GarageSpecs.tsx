import Link from "next/link";
import { EmptyStories } from "@/components/EmptyStories";
import { GARAGE_SPECS } from "@/lib/desks";

export function GarageSpecs() {
  if (GARAGE_SPECS.length === 0) {
    return <EmptyStories />;
  }

  return (
    <div data-garage-specs className="overflow-hidden rounded-2xl bg-surface">
      <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr] px-5 py-3 text-[11px] font-semibold tracking-[0.16em] text-white uppercase sm:grid">
        <p>Vehicle / mod</p>
        <p>Class</p>
        <p className="text-right">Stat</p>
      </div>
      <ul>
        {GARAGE_SPECS.map((spec) => (
          <li key={spec.slug}>
            <Link
              href={`/posts/${spec.slug}`}
              className="grid gap-1 px-5 py-4 text-white transition-colors duration-300 hover:bg-raised sm:grid-cols-[1.4fr_0.8fr_0.8fr] sm:items-baseline"
            >
              <p className="font-display text-lg font-extrabold tracking-tight md:text-xl">
                {spec.name}
              </p>
              <p className="text-sm text-white">
                <span className="mr-2 text-[11px] font-semibold tracking-[0.16em] uppercase sm:hidden">
                  Class
                </span>
                {spec.klass}
              </p>
              <p className="font-display text-sm font-bold tabular-nums sm:text-right">
                {spec.stat}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
