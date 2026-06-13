/** Client-side session marker for Next.js middleware (refresh cookie lives on API domain). */
const HUB_SESSION_COOKIE = 'nacos_hub=1';

export function setHubSessionCookie(active: boolean): void {
  if (typeof document === 'undefined') return;
  if (active) {
    document.cookie = `${HUB_SESSION_COOKIE}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = 'nacos_hub=; path=/; max-age=0; SameSite=Lax';
  }
}

export function hasHubSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('nacos_hub=1'));
}
