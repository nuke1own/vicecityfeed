import { LOGO_PNG, LOGO_SVG } from "@/lib/logo-paths";

type BrandMarkSize = "header" | "footer";

type BrandMarkProps = {
  src?: string;
  size?: BrandMarkSize;
  className?: string;
};

const sizeClass: Record<BrandMarkSize, string> = {
  header:
    "h-[68px] w-auto shrink-0 object-contain object-center md:h-[84px]",
  footer:
    "h-[50px] w-auto shrink-0 object-contain object-left md:h-[58px]",
};

export function BrandMark({
  src = LOGO_PNG,
  size = "header",
  className = "",
}: BrandMarkProps) {
  const classes = `${sizeClass[size]} ${className}`.trim();
  if (src === LOGO_SVG) {
    return (
      <picture>
        <source srcSet={LOGO_SVG} type="image/svg+xml" />
        <img src={LOGO_PNG} alt="" className={classes} />
      </picture>
    );
  }

  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt="" className={classes} />;
}
