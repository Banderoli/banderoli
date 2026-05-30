import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Ультимативная финансовая функция с защитой Number.EPSILON
function parseMoney(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  // Меняем запятую на точку, если ввели вручную
  let str = String(val).replace(',', '.');
  // Удаляем случайные пробелы и символы, оставляем только цифры и точку
  str = str.replace(/[^0-9.]/g, ''); 
  const num = Number(str);
  if (isNaN(num)) return 0;
  
  // Добавляем EPSILON для компенсации потери точности процессора
  return Math.round((num + Number.EPSILON) * 100) / 100; 
}

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'parcelge-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const data = await req.json();

    if (!data.trackCode || !data.name || !data.carrier) {
      return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

    const parcel = await prisma.parcel.create({
      data: {
        trackCode: data.trackCode,
        name: data.name,
        // Сохраняем идеальное число
        value: parseMoney(data.value),
        carrier: data.carrier,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        recipient: data.recipient,
        comment: data.comment || null,
        status: data.status || 'ожидается',
        userId: userId
      }
    });

    return NextResponse.json({ success: true, parcel });
  } catch (error: any) {
    console.error('Ошибка POST /api/parcels:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Посылка с таким трек-кодом уже существует' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка сервера: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  
  const parcels = await prisma.parcel.findMany({ 
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ parcels });
}