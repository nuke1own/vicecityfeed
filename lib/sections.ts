/** Site areas that behave like apps: no footer, and the logo reloads the area. */
const SOCIAL_PREFIXES = ["/social"];

export function sectionHome(pathname: string): string {
  if (SOCIAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return "/social/";
  }
  if (pathname === "/album" || pathname.startsWith("/album/")) return "/album/";
  return "/";
}

export function hidesFooter(pathname: string): boolean {
  return sectionHome(pathname) !== "/";
}

export function samePath(a: string, b: string): boolean {
  const clean = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);
  return clean(a) === clean(b);
}
