import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // 1. Извлекаем токен из куки
  const token = req.cookies.get('token')?.value
  const path = req.nextUrl.pathname

  // 2. Список путей, куда нельзя пускать без авторизации
  const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/profile')
  
  // 3. Список путей авторизации
  const isAuthRoute = path === '/login' || path === '/register'

  // Блокировка: если запрашивают защищенную страницу, а токена нет
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Блокировка: если запрашивают страницу логина/регистрации, а токен УЖЕ есть
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

// Конфигурация: применяем middleware ко всем путям, кроме статики и API
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}