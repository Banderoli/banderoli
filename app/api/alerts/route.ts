import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const alerts = await prisma.alert.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json({ error: 'Не удалось загрузить системные предупреждения' }, { status: 500 });
  }
}