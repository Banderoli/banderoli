import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Получаем секрет. В идеале, если его нет в продакшене, приложение должно падать с ошибкой,
// чтобы мы сразу это заметили, а не работали с уязвимым дефолтным ключом.
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.warn('ВНИМАНИЕ: JWT_SECRET не задан в переменных окружения!');
}
const JWT_SECRET = new TextEncoder().encode(secret || 'parcelge-secret-key');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isDashboardPage = pathname.startsWith('/dashboard');

  // 1. ЗАЩИТА ПРИВАТНЫХ СТРАНИЦ
  if (isDashboardPage) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // КРИТИЧНО: Проверяем, что токен настоящий, а не подделка
    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      // Если токен подделан или его срок действия истек:
      // Перенаправляем на логин и заодно очищаем плохой cookie
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  // 2. ЛОГИКА ДЛЯ СТРАНИЦ АВТОРИЗАЦИИ
  // Если пользователь уже вошел в систему, ему не нужно видеть страницу логина
  if (isAuthPage && token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
      // Токен невалиден (например, истек) — просто позволяем загрузить страницу логина
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}