// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Используем default export — это самый надежный способ для Next.js 16
export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const protectedPages = ['/dashboard', '/profile', '/analytics', '/archive', '/admin'];
  const isProtectedPage = protectedPages.some(page => pathname.startsWith(page));

  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/api/')) {
    const isPublicApi = pathname.startsWith('/api/auth') || pathname.startsWith('/api/cron');
    if (!isPublicApi && !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};