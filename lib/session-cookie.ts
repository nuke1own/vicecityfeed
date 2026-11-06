/**
 * "Keep me signed in" support. When this flag cookie is present, auth cookies
 * are written without Max-Age/Expires, so the browser drops them when it
 * closes. The flag holds no secret, so client code may read it.
 */
export const SESSION_ONLY_COOKIE = "vcf_session_only";

type CookieLifetime = { maxAge?: number; expires?: Date };

export function withSessionLifetime<T extends CookieLifetime>(
  options: T,
  sessionOnly: boolean,
): T {
  // maxAge 0 means "delete this cookie"; never turn a delete into a write.
  if (!sessionOnly || options.maxAge === 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  void _maxAge;
  void _expires;
  return rest as T;
}
