import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Вспомогательная функция для получения ID пользователя из токена
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch { return null; }
}

// ── GET: Получить профиль владельца и список его партнеров ──
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partners: true }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      ownerName: user.name,
      ownerEmail: user.email,
      ownerPhone: user.phone,
      ownerDocumentId: user.documentId,
      partners: user.partners
    });
  } catch (error) {
    console.error('Ошибка GET /api/partners:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST: Добавить НОВОГО партнера (получателя) ──
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Проверка обязательного поля
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Имя партнера обязательно' }, { status: 400 });
    }

    // Преобразуем пустые строки в null для чистой базы
    const newPartner = await prisma.partner.create({
      data: {
        name: body.name.trim(),
        documentId: body.documentId ? body.documentId.trim() : null,
        phone: body.phone ? body.phone.trim() : null,
        email: body.email ? body.email.trim() : null,
        userId: userId,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, partner: newPartner });
  } catch (error) {
    console.error('Ошибка POST /api/partners:', error);
    return NextResponse.json({ error: 'Не удалось создать партнера' }, { status: 500 });
  }
}