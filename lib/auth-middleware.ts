import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'parcelge-secret-key'
)

export async function verifyAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value

  if (!token) {
    return { error: 'Не авторизован', status: 401 }
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { userId: payload.userId as string, email: payload.email as string, name: payload.name as string }
  } catch (error) {
    return { error: 'Токен недействителен', status: 401 }
  }
}