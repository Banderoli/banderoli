// app/api/partners/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'banderoli-fallback-change-in-env'
);

async function getUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch { return null; }
}

// ── GET: профиль + УМНЫЙ список партнёров ────────────────────
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Достаем юзера, его партнеров и АКТИВНЫЕ посылки для расчета лимитов
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        partners: true,
        parcels: {
          where: { status: { notIn: ['Доставлено', 'Утеряно', 'В архиве'] } },
          include: { partner: true } // ✅ ДОБАВЬ ЭТУ СТРОКУ, чтобы TS увидел партнера
        }
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Считаем потраченный лимит для каждого человека
    const PRICE_LIMIT = 300;
    const stats: Record<string, number> = {};
    
    stats[user.name] = 0;
    user.partners.forEach(p => stats[p.name] = 0);

    user.parcels.forEach(parcel => {
      const rName = parcel.recipientName || parcel.partner?.name || user.name;
      if (stats[rName] !== undefined) {
        stats[rName] += Number(parcel.value || 0);
      } else {
        stats[rName] = Number(parcel.value || 0);
      }
    });

    // Формируем список с остатками лимита
    const smartList = [
      { id: 'owner', name: user.name, available: Math.max(0, PRICE_LIMIT - (stats[user.name] || 0)) },
      ...user.partners.map(p => ({
        id: p.id,
        name: p.name,
        available: Math.max(0, PRICE_LIMIT - (stats[p.name] || 0))
      }))
    ];

    // Сортируем: сверху те, у кого БОЛЬШЕ ВСЕГО свободного места
    smartList.sort((a, b) => b.available - a.available);

    // Добавляем флаг "Рекомендуем" самому первому (самому свободному)
    if (smartList.length > 0 && smartList[0].available > 0) {
      (smartList[0] as any).isRecommended = true;
    }

    return NextResponse.json({
      ownerName: user.name,
      ownerEmail: user.email,
      ownerPhone: user.phone,
      ownerDocumentId: user.documentId,
      ownerTelegram: user.telegramChatId,
      partners: smartList // Отдаем умный отсортированный список!
    });
  } catch (error) {
    console.error('GET /api/partners:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST: добавить партнёра ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Имя партнера обязательно' }, { status: 400 });
    }

    const partner = await prisma.partner.create({
      data: {
        userId,
        name:       body.name.trim(),
        documentId: body.documentId?.trim() || null,
        phone:      body.phone?.trim()      || null,
        email:      body.email?.trim()      || null,
        isActive:   true
      }
    });

    return NextResponse.json({ success: true, partner });
  } catch (error) {
    console.error('POST /api/partners:', error);
    return NextResponse.json({ error: 'Не удалось создать партнера' }, { status: 500 });
  }
}

// ── PUT: обновить профиль владельца ───────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ownerName, ownerPhone, ownerDocumentId, ownerTelegram } = body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name:          ownerName?.trim()       || undefined,
        phone:         ownerPhone?.trim()      || null,
        documentId:    ownerDocumentId?.trim() || null,
        telegramChatId: ownerTelegram?.trim()  || null,
      }
    });

    return NextResponse.json({ success: true, name: updated.name });
  } catch (error) {
    console.error('PUT /api/partners:', error);
    return NextResponse.json({ error: 'Не удалось обновить профиль' }, { status: 500 });
  }
}