import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;
    const body = await req.json();

    const existing = await prisma.parcel.findUnique({ where: { id: parcelId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const safeValue = typeof body.value === 'string' 
        ? parseFloat(body.value.replace(',', '.')) 
        : (body.value || existing.value);
        
    const safeWeight = body.weight 
        ? parseFloat(String(body.weight).replace(',', '.')) 
        : null;

    const updatedParcel = await prisma.parcel.update({
      where: { id: parcelId },
      data: {
        trackCode: body.trackCode || existing.trackCode,
        name: body.name || existing.name,
        shop: body.shop !== undefined ? body.shop : existing.shop,
        value: safeValue,
        weight: safeWeight,
        carrier: body.carrier || existing.carrier,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : existing.expectedDate,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : existing.purchaseDate,
        recipient: body.recipient || existing.recipient,
        comment: body.comment !== undefined ? body.comment : existing.comment,
        status: body.status || existing.status,
      }
    });

    return NextResponse.json({ success: true, parcel: updatedParcel });
  } catch (error) {
    console.error('Ошибка PUT /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const parcelId = resolvedParams.id;
    
    const existing = await prisma.parcel.findUnique({ where: { id: parcelId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    await prisma.parcel.delete({ where: { id: parcelId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE /api/parcels/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}