// app/api/partners/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 🔥 ИСПРАВЛЕН ИМПОРТ
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'banderoli-fallback-change-in-env'
);

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch { return null; }
}

// ── PATCH: Редактировать партнера (🔥 ЭТОГО МЕТОДА НЕ БЫЛО) ───
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const resolvedParams = await params;
    const partnerId = resolvedParams.id;
    if (!partnerId) return NextResponse.json({ error: 'ID партнера не найден' }, { status: 400 });

    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Имя обязательно' }, { status: 400 });
    }

    // Проверяем, существует ли партнер и принадлежит ли он юзеру
    const existingPartner = await prisma.partner.findFirst({
      where: { id: partnerId, userId }
    });

    if (!existingPartner) {
      return NextResponse.json({ error: 'Партнер не найден или нет доступа' }, { status: 403 });
    }

    const updatedPartner = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        name:       body.name.trim(),
        documentId: body.documentId?.trim() || null,
        phone:      body.phone?.trim()      || null,
        email:      body.email?.trim()      || null,
      }
    });

    return NextResponse.json({ success: true, partner: updatedPartner });
  } catch (error) {
    console.error('Ошибка PATCH /partners/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера при обновлении' }, { status: 500 });
  }
}

// ── DELETE: Удалить партнера ──────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const resolvedParams = await params;
    const partnerId = resolvedParams.id;
    if (!partnerId) return NextResponse.json({ error: 'ID партнера не найден' }, { status: 400 });

    const result = await prisma.partner.deleteMany({
      where: { 
        id: partnerId,
        userId: userId 
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Партнер не найден или нет доступа' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /partners/[id]:', error);
    return NextResponse.json({ error: 'Ошибка сервера при удалении' }, { status: 500 });
  }
}