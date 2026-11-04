type PageHeaderProps = {
  kicker: string;
  title: string;
  description: string;
};

export function PageHeader({ kicker, title, description }: PageHeaderProps) {
  return (
    <header className="page-header reveal mb-7 sm:mb-10">
      <div className="mb-4 flex items-center gap-3 sm:mb-5">
        <span aria-hidden className="h-px w-8 bg-vice-pink sm:w-12" />
        <p className="text-[10px] font-bold tracking-[0.18em] text-vice-pink uppercase">
          {kicker}
        </p>
      </div>
      <h1 className="font-display mt-2.5 text-[1.95rem] leading-[1.06] font-extrabold tracking-tight text-balance break-words text-white sm:mt-3 md:text-5xl lg:text-6xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-snug font-bold text-white sm:mt-4 sm:text-lg md:text-xl">
        {description}
      </p>
    </header>
  );
}
