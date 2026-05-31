'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  CloudRain, Sun, Cloud, HelpCircle, TrendingUp, Truck, 
  AlertTriangle, Users, Loader2, BarChart3 
} from 'lucide-react'

// Строгая типизация
interface Parcel { 
  id: string; 
  value: number; 
  recipient: string; 
  carrier: string; 
  status: string; 
  createdAt: string; 
  purchaseDate?: string; 
}
interface Partner { 
  id: string; 
  name: string; 
  isActive: boolean; 
}
interface WeatherInfo { 
  hub: string; 
  temp: string; 
  condition: string; 
  iconType: 'clear' | 'clouds' | 'rain' | 'unknown'; 
}

export default function AnalyticsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [ownerName, setOwnerName] = useState('Владелец')
  const [loading, setLoading] = useState(true)
  const [weatherData, setWeatherData] = useState<WeatherInfo[]>([
    { hub: 'США (Вилмингтон)', temp: '--', condition: 'Загрузка...', iconType: 'unknown' },
    { hub: 'Китай (Гуанчжоу)', temp: '--', condition: 'Загрузка...', iconType: 'unknown' },
    { hub: 'Турция (Стамбул)', temp: '--', condition: 'Загрузка...', iconType: 'unknown' },
    { hub: 'Германия (Франкфурт)', temp: '--', condition: 'Загрузка...', iconType: 'unknown' },
  ])

  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'
  const CITIES = ['Wilmington', 'Guangzhou', 'Istanbul', 'Frankfurt']

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [resParcels, resPartners] = await Promise.all([fetch('/api/parcels/get'), fetch('/api/partners')])
        const dataParcels = resParcels.ok ? await resParcels.json() : { parcels: [] }
        const dataPartners = resPartners.ok ? await resPartners.json() : { partners: [] }
        
        if (dataPartners.ownerName) setOwnerName(dataPartners.ownerName)
        if (dataPartners.partners) setPartners(dataPartners.partners)
        
        if (dataParcels.parcels) {
          setParcels(dataParcels.parcels.map((p: any) => ({
            ...p, 
            value: Number(p.value), 
            recipient: p.recipient === 'Я' ? (dataPartners.ownerName || 'Владелец') : p.recipient
          })))
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    const fetchWeather = async () => {
      const results = await Promise.all(CITIES.map(async (city): Promise<WeatherInfo> => {
        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          let iconType: WeatherInfo['iconType'] = 'unknown';
          if (data.weather[0].main === 'Clear') iconType = 'clear';
          else if (data.weather[0].main === 'Clouds') iconType = 'clouds';
          else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(data.weather[0].main)) iconType = 'rain';
          return { hub: city, temp: `${Math.round(data.main.temp)}°C`, condition: data.weather[0].description, iconType };
        } catch { return { hub: city, temp: 'N/A', condition: 'Ошибка', iconType: 'unknown' }; }
      }));
      setWeatherData(results);
    };
    fetchAll();
    fetchWeather();
  }, [API_KEY])

  const activeParcels = useMemo(() => parcels.filter(p => !['доставлено', 'утеряно'].includes(p.status.toLowerCase())), [parcels])
  const getPartnerSum = (name: string) => activeParcels.filter(p => p.recipient === name).reduce((sum, p) => sum + p.value, 0);

  const monthlyStats = useMemo(() => {
    const stats: Record<string, number> = {};
    parcels.forEach(p => {
      const month = new Date(p.purchaseDate || p.createdAt).toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
      stats[month] = (stats[month] || 0) + p.value;
    });
    return Object.entries(stats).map(([month, total]) => ({ month, total }));
  }, [parcels]);

  const maxExpense = Math.max(...monthlyStats.map(s => s.total), 1);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
      <p className="font-medium">Инициализация модулей контроля...</p>
    </div>
  )

  return (
    <div className="py-6 space-y-8 animate-fade-in max-w-7xl mx-auto px-4 md:px-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl"><BarChart3 size={24} /></div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Аналитика и Метрики</h1>
          <p className="text-slate-500 text-sm font-medium">Контроль логистики, погоды и таможенных лимитов</p>
        </div>
      </div>
      {/* Остальной JSX идентичен предыдущему идеальному варианту */}
      {/* ... */}
    </div>
  )
}