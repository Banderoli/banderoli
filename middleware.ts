import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'parcelge-secret-key'
)

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const pathname = request.nextUrl.pathname

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isDashboardPage = pathname === '/dashboard' || pathname.startsWith('/dashboard')

  if (isDashboardPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      // Token невалиден — остаёмся на auth странице
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}