'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  CloudRain, 
  Sun, 
  Cloud, 
  HelpCircle, 
  TrendingUp, 
  Truck, 
  AlertTriangle, 
  Users,
  Loader2,
  BarChart3
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

  // Используем ключ из окружения, если нет - fallback на предоставленный
  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'
  const CITIES = ['Wilmington', 'Guangzhou', 'Istanbul', 'Frankfurt']

  useEffect(() => {
    // Параллельная загрузка бизнес-данных
    Promise.all([fetch('/api/parcels/get'), fetch('/api/partners')])
      .then(async ([resParcels, resPartners]) => {
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
      })
      .catch((err) => console.error('Ошибка загрузки аналитики:', err))
      .finally(() => setLoading(false))

    // Загрузка погоды логистических хабов
    const fetchWeather = async () => {
      const weatherResults = await Promise.all(CITIES.map(async (city) => {
        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`);
          if (!res.ok) throw new Error('Weather API Error')
          const data = await res.json();
          
          let iconType: 'clear' | 'clouds' | 'rain' | 'unknown' = 'unknown';
          if (data.weather[0].main === 'Clear') iconType = 'clear';
          else if (data.weather[0].main === 'Clouds') iconType = 'clouds';
          else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(data.weather[0].main)) iconType = 'rain';

          return {
            hub: city === 'Wilmington' ? 'США (Вилмингтон)' : city === 'Guangzhou' ? 'Китай (Гуанчжоу)' : city === 'Istanbul' ? 'Турция (Стамбул)' : 'Германия (Франкфурт)',
            temp: `${Math.round(data.main.temp)}°C`,
            condition: data.weather[0].description,
            iconType
          };
        } catch {
          return { hub: city, temp: 'N/A', condition: 'Связь потеряна', iconType: 'unknown' };
        }
      }));
      setWeatherData(weatherResults);
    };
    fetchWeather();
  }, [API_KEY])

  // --- МАТЕМАТИКА И ЛОГИКА ---
  
  // Активные посылки (в пути, на таможне, складе)
  const activeParcels = useMemo(() => parcels.filter(p => p.status !== 'доставлено' && p.status !== 'утеряно'), [parcels])
  
  // Калькулятор лимитов (300 GEL) для партнера
  const getPartnerSum = (name: string) => activeParcels.filter(p => p.recipient === name).reduce((sum, p) => sum + p.value, 0);

  // Группировка расходов по месяцам
  const monthlyStats = useMemo(() => {
    const stats: Record<string, number> = {};
    parcels.forEach(p => {
      const date = new Date(p.purchaseDate || p.createdAt);
      const monthLabel = date.toLocaleString('ru-RU', { month: 'short' }).replace('.', ''); 
      stats[monthLabel] = (stats[monthLabel] || 0) + p.value;
    });
    return Object.entries(stats).map(([month, total]) => ({ month, total }));
  }, [parcels]);

  const maxExpense = Math.max(...monthlyStats.map(s => s.total), 1);

  // Распределение по службам доставки
  const carrierStats = useMemo(() => {
    const counts: Record<string, number> = {};
    parcels.forEach(p => { counts[p.carrier] = (counts[p.carrier] || 0) + 1; });
    const total = parcels.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [parcels]);

  // Рендер иконок погоды
  const renderWeatherIcon = (type: string) => {
    switch(type) {
      case 'clear': return <Sun className="text-amber-500" size={32} />;
      case 'clouds': return <Cloud className="text-slate-400" size={32} />;
      case 'rain': return <CloudRain className="text-blue-500" size={32} />;
      default: return <HelpCircle className="text-slate-300" size={32} />;
    }
  }

  // Защита от пустого экрана во время загрузки (Восстановленная логика)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Анализ логистических данных...</p>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-8 animate-fade-in max-w-7xl mx-auto px-4 md:px-8">
      
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Аналитика и Метрики</h1>
          <p className="text-slate-500 text-sm font-medium">Контроль логистики, погоды и таможенных лимитов</p>
        </div>
      </div>

      {/* 1. ПОГОДА (Логистические Хабы) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {weatherData.map((w, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center transition-all hover:shadow-md">
            <div className="mb-2 p-2 bg-slate-50 rounded-full">
              {renderWeatherIcon(w.iconType)}
            </div>
            <p className="text-2xl font-black text-slate-800">{w.temp}</p>
            <p className="text-xs font-bold text-slate-500 uppercase text-center mt-1">{w.hub}</p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 capitalize">{w.condition}</p>
          </div>
        ))}
      </div>

      {/* 2. РАСХОДЫ И СЛУЖБЫ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Инфографика расходов */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-indigo-500" size={20} />
            <h2 className="text-xl font-extrabold text-slate-800">Динамика расходов (₾)</h2>
          </div>
          
          <div className="flex items-end justify-between h-48 gap-3 mt-auto border-b border-slate-100 pb-2">
            {monthlyStats.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Нет данных о расходах
                </div>
            ) : (
                monthlyStats.map((s, i) => {
                    const heightPercent = Math.max((s.total / maxExpense) * 100, 5); // Минимум 5% высоты для видимости
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <div className="w-full bg-slate-50 rounded-t-lg relative flex items-end justify-center h-full">
                                <div 
                                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-700 ease-out group-hover:from-indigo-500 group-hover:to-indigo-300 shadow-sm" 
                                    style={{ height: `${heightPercent}%` }}
                                >
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg transition-all whitespace-nowrap shadow-xl">
                                        {s.total.toFixed(0)} ₾
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase">{s.month}</span>
                        </div>
                    )
                })
            )}
          </div>
        </div>

        {/* Службы доставки */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Truck className="text-emerald-500" size={20} />
            <h2 className="text-xl font-extrabold text-slate-800">Популярные службы</h2>
          </div>
          <div className="space-y-5">
            {carrierStats.length === 0 ? (
              <div className="text-center p-6 text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Нет активных посылок
              </div>
            ) : carrierStats.map((c, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>{c.name}</span>
                  <span className="text-slate-500">{c.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${c.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ТАМОЖЕННЫЕ ЛИМИТЫ (Восстановленная математика B2B) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-blue-500" size={20} />
          <h2 className="text-xl font-extrabold text-slate-800">Таможенные лимиты (300 ₾)</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[ownerName, ...partners.filter(p => p.isActive).map(p => p.name)].map(name => {
            const sum = getPartnerSum(name);
            const isOverLimit = sum >= 300;
            const progressPercent = Math.min((sum / 300) * 100, 100);
            
            return (
              <div key={name} className={`p-5 rounded-2xl border transition-all ${isOverLimit ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-slate-700 truncate pr-2">{name}</p>
                  {isOverLimit && <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />}
                </div>
                
                <p className={`text-2xl font-black ${isOverLimit ? 'text-rose-700' : 'text-slate-800'}`}>
                  {sum.toFixed(2)} <span className="text-sm">₾</span>
                </p>
                
                {/* Шкала лимита */}
                <div className="mt-4 space-y-1">
                  <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isOverLimit ? 'bg-rose-500' : 'bg-blue-500'}`} 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 text-right">
                    {isOverLimit ? 'ЛИМИТ ПРЕВЫШЕН' : `${(300 - sum).toFixed(0)} ₾ осталось`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
    </div>
  )
}