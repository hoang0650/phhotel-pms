export function redirectSystemPath({ path }: { path: string; initial?: boolean }): string {
  try {
    const raw = path || '/';
    const url = new URL(raw, 'https://phhotel.vn');

    if (url.hostname === 'appclip.apple.com') {
      return '/clip';
    }

    const pathname = url.pathname || '/';
    if (pathname === '/clip' || pathname.startsWith('/clip/')) {
      return '/clip';
    }

    if (pathname !== '/' || url.search) {
      return `${pathname}${url.search}`;
    }

    return '/';
  } catch {
    if (typeof path === 'string' && path.includes('clip')) {
      return '/clip';
    }
    return '/';
  }
}
