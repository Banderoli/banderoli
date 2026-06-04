import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Вспомогательная функция для получения ID (единый стандарт для проекта)
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'banderoli-secret-key-change-in-production');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const carriers = await prisma.carrier.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    
    return NextResponse.json({ carriers });
  } catch (error) {
    console.error('Ошибка GET /api/carriers:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { name, website } = await req.json();
    
    // Валидация
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }

    const newCarrier = await prisma.carrier.create({
      data: { 
        name: name.trim(), 
        website: website ? website.trim() : null, 
        userId 
      }
    });
    
    return NextResponse.json({ success: true, carrier: newCarrier });
  } catch (error) {
    console.error('Ошибка POST /api/carriers:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}