// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Защита фронтенд-страниц
  const protectedPages = ['/dashboard', '/profile', '/analytics', '/archive'];
  const isProtectedPage = protectedPages.some(page => pathname.startsWith(page));

  if (isProtectedPage && !token) {
    // Если нет токена - перенаправляем на логин
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Защита всех API роутов (кроме авторизации и системного cron)
  if (pathname.startsWith('/api/')) {
    const isPublicApi = pathname.startsWith('/api/auth') || pathname.startsWith('/api/cron');
    
    if (!isPublicApi && !token) {
      return NextResponse.json({ error: 'Unauthorized middleware check' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// Настраиваем, для каких путей будет срабатывать middleware (игнорируем статику)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};