// app/api/parcels/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { calculateRiskScore } from '@/lib/intelligence/risk-engine';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'banderoli-fallback-change-in-env'
);

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch { return null; }
}

// ── GET: список всех посылок ───────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });

    const parcels = await prisma.parcel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { partner: true } // Обязательно подтягиваем партнера
    });

    // Обогащаем посылки новыми рисками
    const enriched = parcels.map((p, _, all) => {
      // Страховка: если recipientName пустой, берем из партнера
      const parcelWithRecipient = { 
        ...p, 
        recipientName: p.recipientName || p.partner?.name || 'Владелец' 
      };
      
      // 🔥 ИСПРАВЛЕНО: Передаем строку 'Владелец' 3-им аргументом
      const risk = calculateRiskScore(
        parcelWithRecipient, 
        all.map(a => ({
          ...a, recipientName: a.recipientName || a.partner?.name || 'Владелец'
        })),
        'Владелец' 
      );

      return { 
        ...parcelWithRecipient, 
        riskScore: risk.score, 
        riskLevel: risk.level, 
        collisionProbability: risk.collisionProbability, 
        riskFactors: risk.factors 
      };
    });

    return NextResponse.json({ parcels: enriched });
  } catch (error) {
    console.error('GET /api/parcels:', error);
    return NextResponse.json({ message: 'Ошибка сервера' }, { status: 500 });
  }
}

// ── POST: создание новой посылки ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ message: 'Не авторизован' }, { status: 401 });

    const body = await req.json();

    let partnerId: string | null = null;
    let recipientName = 'Владелец';

    // Умная привязка партнера
    if (body.partner) {
      const partner = await prisma.partner.findFirst({
        where: { userId, name: body.partner }
      });
      if (partner) {
        partnerId = partner.id;
        recipientName = partner.name;
      } else {
        recipientName = body.partner;
      }
    }

    const newParcel = await prisma.parcel.create({
      data: {
        userId,
        trackCode: body.trackCode,
        name: body.name,
        value: Number(body.value),
        weight: body.weight ? Number(body.weight) : null,
        shop: body.shop || null,
        carrier: body.carrier || null,
        logisticsHub: body.logisticsHub || null,
        partnerId,
        recipientName,
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
      }
    });

    return NextResponse.json({ success: true, parcel: newParcel });
  } catch (error) {
    console.error('POST /api/parcels:', error);
    return NextResponse.json({ message: 'Ошибка сохранения' }, { status: 500 });
  }
}