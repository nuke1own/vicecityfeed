type PageHeaderProps = {
  kicker: string;
  title: string;
  description: string;
};

export function PageHeader({ kicker, title, description }: PageHeaderProps) {
  return (
    <header className="page-header reveal mb-7 sm:mb-10">
      <p className="mb-4 text-[11px] font-bold tracking-[0.18em] text-vice-pink uppercase sm:mb-5">
        {kicker}
      </p>
      <h1 className="font-display mt-2.5 text-[1.95rem] leading-[1.06] font-extrabold tracking-tight text-balance break-words text-white sm:mt-3 md:text-5xl lg:text-6xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-snug font-bold text-white sm:mt-4 sm:text-lg md:text-xl">
        {description}
      </p>
    </header>
  );
}
