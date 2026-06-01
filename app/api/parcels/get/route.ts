import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeCustomsRisk } from '@/lib/risk-engine';

export async function GET() {
  try {
    const parcels = await prisma.parcel.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    // На лету прогоняем активные посылки через Risk Engine
    const activeParcels = parcels.filter(p => p.status !== 'Доставлено' && p.status !== 'Утеряно');

    const enrichedParcels = parcels.map(parcel => {
      // Для доставленных/утерянных риски не считаем
      if (parcel.status === 'Доставлено' || parcel.status === 'Утеряно') {
        return { ...parcel, recipient: parcel.recipientName };
      }

      // Имитация получения данных о погоде (в проде берется из API)
      const mockWeatherRisk = Math.floor(Math.random() * 40); // 0-40% шанс задержки

      const riskAnalysis = analyzeCustomsRisk(parcel, activeParcels, mockWeatherRisk);

      return {
        ...parcel,
        recipient: parcel.recipientName,
        customsRiskScore: riskAnalysis.score,
        riskFactors: riskAnalysis.factors, // Массив предупреждений для Telegram/Push
        hubWeatherRisk: mockWeatherRisk,
        flightDelayRisk: Math.floor(riskAnalysis.score / 2),
      };
    });

    return NextResponse.json({ parcels: enrichedParcels });
  } catch (error) {
    console.error("Ошибка API GET Parcels:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}