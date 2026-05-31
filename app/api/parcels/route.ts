import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const safeValue = typeof body.value === 'string' 
        ? parseFloat(body.value.replace(',', '.')) 
        : (body.value || 0);
        
    const safeWeight = body.weight 
        ? parseFloat(String(body.weight).replace(',', '.')) 
        : null;

    const newParcel = await prisma.parcel.create({
      data: {
        trackCode: body.trackCode,
        name: body.name,
        shop: body.shop || null,
        weight: safeWeight,
        value: safeValue,
        carrier: body.carrier,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        recipient: body.recipient,
        comment: body.comment || null,
        status: body.status || 'ожидается',
        userId: userId
      }
    });

    return NextResponse.json({ success: true, parcel: newParcel });
  } catch (error) {
    console.error('Ошибка POST /api/parcels:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}