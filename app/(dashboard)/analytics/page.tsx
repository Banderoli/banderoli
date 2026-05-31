'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  CloudRain, Sun, Cloud, HelpCircle, TrendingUp, Truck, 
  AlertTriangle, Users, Loader2, BarChart3, ShieldCheck, User
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
    { hub: 'США (Вилмингтон)', temp: '--', condition: 'Ожидание...', iconType: 'unknown' },
    { hub: 'Китай (Гуанчжоу)', temp: '--', condition: 'Ожидание...', iconType: 'unknown' },
    { hub: 'Турция (Стамбул)', temp: '--', condition: 'Ожидание...', iconType: 'unknown' },
    { hub: 'Германия (Франкфурт)', temp: '--', condition: 'Ожидание...', iconType: 'unknown' },
  ])

  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'
  const CITIES = ['Wilmington', 'Guangzhou', 'Istanbul', 'Frankfurt']

  useEffect(() => {
    const fetchAllData = async () => {
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
      } catch (err) { 
        console.error('Ошибка загрузки аналитики:', err) 
      } finally { 
        setLoading(false) 
      }
    }

    const fetchWeather = async () => {
      const weatherResults = await Promise.all(CITIES.map(async (city): Promise<WeatherInfo> => {
        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`);
          if (!res.ok) throw new Error('Weather API Error');
          const data = await res.json();
          
          let iconType: WeatherInfo['iconType'] = 'unknown';
          if (data.weather[0].main === 'Clear') iconType = 'clear';
          else if (data.weather[0].main === 'Clouds') iconType = 'clouds';
          else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(data.weather[0].main)) iconType = 'rain';

          return {
            hub: city === 'Wilmington' ? 'США (Вилмингтон)' : city === 'Guangzhou' ? 'Китай (Гуанчжоу)' : city === 'Istanbul' ? 'Турция (Стамбул)' : 'Германия (Франкфурт)',
            temp: `+${Math.round(data.main.temp)}°`,
            condition: data.weather[0].description,
            iconType
          };
        } catch {
          return { 
            hub: city, 
            temp: 'N/A', 
            condition: 'Нет связи', 
            iconType: 'unknown' 
          };
        }
      }));
      setWeatherData(weatherResults);
    };

    fetchAllData();
    fetchWeather();
  }, [API_KEY])

  // --- МАТЕМАТИКА И ЛОГИКА ---
  
  const activeParcels = useMemo(() => parcels.filter(p => p.status.toLowerCase() !== 'доставлено' && p.status.toLowerCase() !== 'утеряно'), [parcels])
  
  const getPartnerSum = (name: string) => activeParcels.filter(p => p.recipient === name).reduce((sum, p) => sum + p.value, 0);

  // Хронологическая сортировка расходов
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { total: number, date: Date }> = {};
    parcels.forEach(p => {
      const date = new Date(p.purchaseDate || p.createdAt);
      const monthLabel = date.toLocaleString('ru-RU', { month: 'short' }).replace('.', ''); 
      if (!stats[monthLabel]) stats[monthLabel] = { total: 0, date };
      stats[monthLabel].total += p.value;
    });
    
    return Object.entries(stats)
      .map(([month, data]) => ({ month, total: data.total, timestamp: data.date.getTime() }))
      .sort((a, b) => a.timestamp - b.timestamp); // Сортируем от старых к новым
  }, [parcels]);

  const maxExpense = Math.max(...monthlyStats.map(s => s.total), 1);

  const carrierStats = useMemo(() => {
    const counts: Record<string, number> = {};
    parcels.forEach(p => { counts[p.carrier] = (counts[p.carrier] || 0) + 1; });
    const total = parcels.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [parcels]);

  // UI Helpers
  const getWeatherStyle = (type: string) => {
    switch(type) {
      case 'clear': return { bg: 'from-amber-50 to-orange-50 border-orange-100', text: 'text-orange-600', icon: <Sun className="text-orange-500 drop-shadow-sm" size={32} /> };
      case 'clouds': return { bg: 'from-slate-50 to-gray-100 border-slate-200', text: 'text-slate-600', icon: <Cloud className="text-slate-400 drop-shadow-sm" size={32} /> };
      case 'rain': return { bg: 'from-blue-50 to-indigo-50 border-blue-100', text: 'text-indigo-600', icon: <CloudRain className="text-blue-500 drop-shadow-sm" size={32} /> };
      default: return { bg: 'from-slate-50 to-slate-100 border-slate-100', text: 'text-slate-500', icon: <HelpCircle className="text-slate-300" size={32} /> };
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 text-slate-500 gap-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
        <p className="font-medium animate-pulse">Анализ логистических потоков...</p>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-8 animate-fade-in max-w-7xl mx-auto px-4 md:px-8">
      
      {/* Заголовок */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-sm">
          <BarChart3 size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Аналитика</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Финансовые показатели и таможенный контроль</p>
        </div>
      </div>

      {/* 1. ПОГОДА (Динамические градиенты) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {weatherData.map((w, idx) => {
          const style = getWeatherStyle(w.iconType);
          return (
            <div key={idx} className={`bg-gradient-to-br ${style.bg} p-6 rounded-3xl border shadow-sm flex flex-col items-center transition-all hover:-translate-y-1 hover:shadow-md relative overflow-hidden group`}>
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                {style.icon}
              </div>
              <div className="mb-3 p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                {style.icon}
              </div>
              <p className={`text-3xl font-black tracking-tighter ${style.text}`}>{w.temp}</p>
              <p className="text-xs font-extrabold text-slate-600 uppercase text-center mt-2 tracking-wide">{w.hub}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1 capitalize">{w.condition}</p>
            </div>
          )
        })}
      </div>

      {/* 2. РАСХОДЫ И СЛУЖБЫ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Инфографика расходов (B2B UI) */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Динамика расходов</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">GEL (₾)</span>
          </div>
          
          <div className="flex items-end justify-between h-56 gap-2 sm:gap-4 mt-auto pb-2 relative z-10">
            {/* Фоновая сетка */}
            <div className="absolute inset-0 flex flex-col justify-between border-b border-slate-100 pb-8 pointer-events-none">
              <div className="w-full border-b border-dashed border-slate-100 opacity-50"></div>
              <div className="w-full border-b border-dashed border-slate-100 opacity-50"></div>
              <div className="w-full border-b border-dashed border-slate-100 opacity-50"></div>
            </div>

            {monthlyStats.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  Нет данных для графика
                </div>
            ) : (
                monthlyStats.map((s, i) => {
                    const heightPercent = Math.max((s.total / maxExpense) * 100, 5); 
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end relative z-10">
                            <div className="w-full max-w-[40px] bg-slate-50 rounded-t-xl relative flex items-end justify-center h-full">
                                <div 
                                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-xl transition-all duration-700 ease-out group-hover:from-indigo-400 group-hover:to-indigo-300 shadow-sm group-hover:shadow-indigo-200 relative" 
                                    style={{ height: `${heightPercent}%` }}
                                >
                                  {/* Свечение на верхушке бара */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl"></div>
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-all whitespace-nowrap shadow-xl pointer-events-none">
                                        {s.total.toFixed(0)} ₾
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{s.month}</span>
                        </div>
                    )
                })
            )}
          </div>
        </div>

        {/* Службы доставки */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Truck size={20} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Популярные службы</h2>
          </div>
          
          <div className="space-y-6">
            {carrierStats.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                Нет данных о перевозчиках
              </div>
            ) : carrierStats.map((c, i) => (
              <div key={i} className="space-y-2 group">
                <div className="flex justify-between text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                  <span>{c.name}</span>
                  <span className="text-slate-500 group-hover:text-emerald-600">{c.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000 relative" style={{ width: `${c.percent}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ТАМОЖЕННЫЕ ЛИМИТЫ (Восстановленная математика B2B) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Таможенные лимиты</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Ограничение: 300 ₾ на человека</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
          {[ownerName, ...partners.filter(p => p.isActive).map(p => p.name)].map((name, idx) => {
            const sum = getPartnerSum(name);
            const isOverLimit = sum >= 300;
            const progressPercent = Math.min((sum / 300) * 100, 100);
            const isOwner = idx === 0;
            
            return (
              <div key={name} className={`p-5 rounded-2xl border transition-all duration-300 ${isOverLimit ? 'bg-rose-50 border-rose-200 shadow-sm' : isOwner ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {isOwner ? <ShieldCheck size={16} className="text-indigo-500" /> : <User size={16} className="text-slate-400" />}
                    <p className="font-bold text-slate-800 truncate max-w-[120px]">{name}</p>
                  </div>
                  {isOverLimit && <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 drop-shadow-sm" />}
                </div>
                
                <p className={`text-3xl font-black tracking-tight ${isOverLimit ? 'text-rose-700' : 'text-slate-900'}`}>
                  {sum.toFixed(2)} <span className="text-sm font-bold text-slate-400">₾</span>
                </p>
                
                {/* Шкала лимита */}
                <div className="mt-5 space-y-2">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isOverLimit ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`} 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className={`text-[10px] font-extrabold text-right uppercase tracking-wider ${isOverLimit ? 'text-rose-600' : 'text-slate-400'}`}>
                    {isOverLimit ? 'ЛИМИТ ПРЕВЫШЕН' : `${(300 - sum).toFixed(0)} ₾ ДО ЛИМИТА`}
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