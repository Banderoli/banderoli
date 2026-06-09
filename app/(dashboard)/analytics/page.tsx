'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  CloudRain, Sun, Cloud, HelpCircle, TrendingUp, Truck, 
  AlertTriangle, Users, Loader2, BarChart3, ShieldCheck, 
  User, Plane, Clock, CloudLightning, Wind, CloudSnow,
  Scale, Banknote
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

export const dynamic = 'force-dynamic';

// ── СТРОГАЯ ТИПИЗАЦИЯ ─────────────────────────────────────────
interface Parcel { 
  id: string; 
  value: number; 
  weight?: number;
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

interface ParcelsResponse {
  parcels: Parcel[];
}

interface PartnersResponse {
  ownerName?: string;
  partners: Partner[];
}

interface WeatherInfo { 
  hub: string;
  localTime: string;
  temp: string; 
  condition: string; 
  tomorrowTemp: string;
  tomorrowCondition: string;
  iconType: 'clear' | 'clouds' | 'rain' | 'snow' | 'storm' | 'unknown'; 
  isFlightRisk: boolean;
}

// Конфигурация Хабов
const HUB_CONFIG = [
  { query: 'Wilmington,US', name: 'США (Вилмингтон)', tz: 'America/New_York' },
  { query: 'Guangzhou,CN', name: 'Китай (Гуанчжоу)', tz: 'Asia/Shanghai' },
  { query: 'Istanbul,TR', name: 'Турция (Стамбул)', tz: 'Europe/Istanbul' },
  { query: 'Frankfurt,DE', name: 'Германия (Франкфурт)', tz: 'Europe/Berlin' }
]

export default function AnalyticsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [ownerName, setOwnerName] = useState('Владелец')
  const [loading, setLoading] = useState(true)
  const [weatherData, setWeatherData] = useState<WeatherInfo[]>([])

  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'

  // ── ЗАГРУЗКА ДАННЫХ ─────────────────────────────────────────
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // ВСТАВЬ ВМЕСТО НИХ:
      const t = new Date().getTime(); // Создаем уникальную метку времени
      const [resParcels, resPartners] = await Promise.all([
        fetch(`/api/parcels?t=${t}`, { cache: 'no-store' }).catch(() => ({ ok: false, json: () => ({ parcels: [] }) })), 
        fetch(`/api/partners?t=${t}`, { cache: 'no-store' }).catch(() => ({ ok: false, json: () => ({ partners: [] }) }))
      ])
        
        const dataParcels: ParcelsResponse = resParcels.ok ? await resParcels.json() : { parcels: [] }
        const dataPartners: PartnersResponse = resPartners.ok ? await resPartners.json() : { partners: [] }
        
        if (dataPartners.ownerName) setOwnerName(dataPartners.ownerName)
        if (dataPartners.partners) setPartners(dataPartners.partners)
        
        if (dataParcels.parcels) {
  setParcels(dataParcels.parcels.map((p: any) => ({
    ...p, 
    value: Number(p.value || 0), 
    weight: Number(p.weight || 0),
    // Если recipientName пустой или равен "Владелец", подставляем реальное имя владельца, иначе — имя партнера
    recipient: (!p.recipientName || p.recipientName === 'Владелец') 
      ? (dataPartners.ownerName || 'Владелец') 
      : p.recipientName
  })))
}
      } catch (err) { 
        console.error('Ошибка аналитики:', err) 
      } finally { 
        setLoading(false) 
      }
    }

    const fetchWeather = async () => {
      const results = await Promise.all(HUB_CONFIG.map(async (hub): Promise<WeatherInfo> => {
        try {
          // Используем прогноз погоды (forecast) для получения данных на завтра
          const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${hub.query}&appid=${API_KEY}&units=metric&lang=ru`);
          if (!res.ok) throw new Error('API Error');
          const data = await res.json();
          
          const current = data.list[0];
          const tomorrow = data.list[8] || data.list[data.list.length - 1]; // +24 часа (8 шагов по 3 часа)
          
          // Определение иконки
          const mainWeather = current.weather[0].main;
          let iconType: WeatherInfo['iconType'] = 'unknown';
          if (mainWeather === 'Clear') iconType = 'clear';
          else if (mainWeather === 'Clouds') iconType = 'clouds';
          else if (['Rain', 'Drizzle'].includes(mainWeather)) iconType = 'rain';
          else if (mainWeather === 'Snow') iconType = 'snow';
          else if (mainWeather === 'Thunderstorm') iconType = 'storm';

          // Логика нелетной погоды: сильный ветер (>15 м/с), гроза, снег, плохая видимость
          const isFlightRisk = ['Thunderstorm', 'Snow', 'Tornado', 'Squall', 'Ash'].includes(mainWeather) || current.wind.speed > 15;

          // Местное время хаба
          const localTime = new Intl.DateTimeFormat('ru-RU', { 
            timeZone: hub.tz, hour: '2-digit', minute: '2-digit' 
          }).format(new Date());

          return {
            hub: hub.name,
            localTime,
            temp: `+${Math.round(current.main.temp)}°`,
            condition: current.weather[0].description,
            tomorrowTemp: `+${Math.round(tomorrow.main.temp)}°`,
            tomorrowCondition: tomorrow.weather[0].description,
            iconType,
            isFlightRisk
          };
        } catch {
          return { 
            hub: hub.name, localTime: '--:--', temp: 'N/A', condition: 'Нет связи', 
            tomorrowTemp: 'N/A', tomorrowCondition: 'Нет связи', iconType: 'unknown', isFlightRisk: false
          };
        }
      }));
      setWeatherData(results);
    };

    fetchAllData();
    fetchWeather();
  }, [API_KEY])

  // ── МАТЕМАТИКА И ЛОГИКА ─────────────────────────────────────
  
  const activeParcels = useMemo(() => 
    parcels.filter(p => !['доставлено', 'утеряно'].includes(p.status.toLowerCase())), 
  [parcels])
  
  // Расчет сумм и веса по партнерам
  const getPartnerStats = (name: string) => {
    const pList = activeParcels.filter(p => p.recipient === name);
    return {
      sum: pList.reduce((acc, p) => acc + p.value, 0),
      weight: pList.reduce((acc, p) => acc + (p.weight || 0), 0)
    }
  };

  // Хронология расходов (График)
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
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [parcels]);

  const maxExpense = Math.max(...monthlyStats.map(s => s.total), 1);

  // Расходы по всем партнерам для виджета "Динамика"
  const partnerExpenses = useMemo(() => {
    const expenses: Record<string, number> = {};
    parcels.forEach(p => { expenses[p.recipient] = (expenses[p.recipient] || 0) + p.value; });
    const total = parcels.reduce((acc, p) => acc + p.value, 0) || 1;
    return Object.entries(expenses)
      .map(([name, sum]) => ({ name, sum, percent: Math.round((sum / total) * 100) }))
      .sort((a, b) => b.sum - a.sum);
  }, [parcels]);

  // Службы доставки
  const carrierStats = useMemo(() => {
    const counts: Record<string, number> = {};
    parcels.forEach(p => { counts[p.carrier] = (counts[p.carrier] || 0) + 1; });
    const total = parcels.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [parcels]);

  // ── UI ХЕЛПЕРЫ ─────────────────────────────────────────────
  const getWeatherStyle = (type: string, risk: boolean) => {
    if (risk) return { bg: 'from-rose-50 to-red-50 border-rose-200', text: 'text-rose-700', icon: <Wind className="text-rose-500 drop-shadow-sm" size={32} /> };
    switch(type) {
      case 'clear': return { bg: 'from-amber-50 to-orange-50 border-orange-100', text: 'text-orange-600', icon: <Sun className="text-orange-500 drop-shadow-sm" size={32} /> };
      case 'clouds': return { bg: 'from-slate-50 to-gray-100 border-slate-200', text: 'text-slate-600', icon: <Cloud className="text-slate-400 drop-shadow-sm" size={32} /> };
      case 'rain': return { bg: 'from-blue-50 to-indigo-50 border-blue-100', text: 'text-indigo-600', icon: <CloudRain className="text-blue-500 drop-shadow-sm" size={32} /> };
      case 'snow': return { bg: 'from-cyan-50 to-blue-50 border-cyan-100', text: 'text-cyan-600', icon: <CloudSnow className="text-cyan-500 drop-shadow-sm" size={32} /> };
      case 'storm': return { bg: 'from-purple-50 to-indigo-50 border-purple-200', text: 'text-purple-700', icon: <CloudLightning className="text-purple-600 drop-shadow-sm" size={32} /> };
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
    <>
      {/* ЖЕСТКИЙ ФИКС ТЕКСТА ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ */}
      <style>{`
        .text-fix {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          opacity: 1 !important;
        }
        .text-fix-light {
          color: #64748b !important;
          -webkit-text-fill-color: #64748b !important;
        }
      `}</style>

      <div className="py-6 space-y-8 animate-fade-in max-w-7xl mx-auto px-4 md:px-8 min-h-screen">
        
        {/* Шапка */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-sm">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-fix">Аналитика</h1>
            <p className="text-slate-500 text-sm font-medium mt-1 text-fix-light">Финансовые показатели и контроль хабов</p>
          </div>
        </div>

        {/* 1. ПОГОДА В ХАБАХ (С АВИА-РИСКАМИ И ВРЕМЕНЕМ) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {weatherData.length === 0 ? (
             <div className="col-span-full text-center p-8 text-slate-400">Данные погоды загружаются...</div>
          ) : weatherData.map((w, idx) => {
            const style = getWeatherStyle(w.iconType, w.isFlightRisk);
            return (
              <div key={idx} className={`bg-gradient-to-br ${style.bg} p-5 rounded-3xl border shadow-sm flex flex-col relative overflow-hidden group transition-all hover:shadow-md`}>
                
                {/* Индикатор нелетной погоды */}
                {w.isFlightRisk && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-20">
                    <AlertTriangle size={10} /> Нелетная погода
                  </div>
                )}

                <div className="flex justify-between items-start z-10 mb-2">
                  <div className="p-2.5 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm">
                    {style.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tracking-tighter text-slate-800">{w.temp}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{w.condition}</p>
                  </div>
                </div>

                <div className="z-10 mt-1">
                  <h3 className="text-sm font-extrabold text-slate-900 text-fix">{w.hub}</h3>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> Местное время: {w.localTime}
                  </p>
                </div>

                {/* Прогноз на завтра (Компактно) */}
                <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between z-10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Завтра</span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs font-black text-slate-700">{w.tomorrowTemp}</span>
                    <span className="text-[10px] font-semibold text-slate-500 capitalize">{w.tomorrowCondition}</span>
                  </div>
                </div>

                {/* Фоновая иконка */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.07] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                  <Plane size={100} />
                </div>
              </div>
            )
          })}
        </div>

        {/* 2. РАСХОДЫ И ПАРТНЕРЫ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Инфографика расходов + Разбивка по партнерам */}
          {/* Инфографика расходов + Разбивка по партнерам */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 text-fix">Расходы по получателям</h2>
              </div>
            </div>

            {/* ── КРУГЛЫЙ ГРАФИК (RECHARTS) ── */}
            {/* ── КРУГЛЫЙ ГРАФИК (ИДЕАЛЬНАЯ ВЕРСТКА ДЛЯ NEXT.JS) ── */}
            <div className="w-full flex justify-center items-center min-h-[250px] mb-4">
              {partnerExpenses.length === 0 ? (
                <div className="w-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-2xl min-h-[250px]">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={partnerExpenses}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="sum"
                      nameKey="name"
                    >
                      {partnerExpenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value || 0).toFixed(2)} ₾`, 'Сумма']}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── ЛЕГЕНДА (ДОЛЯ ПАРТНЕРОВ) ── */}
            <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
              {partnerExpenses.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    ></div>
                    <span className="font-bold text-slate-700 truncate text-fix">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-black text-slate-900 text-fix">{p.sum.toFixed(0)} ₾</span>
                    <span 
                      className="text-xs font-bold w-8 text-right" 
                      style={{ color: COLORS[i % COLORS.length] }}
                    >
                      {p.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Службы доставки */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Truck size={20} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 text-fix">Популярные службы</h2>
            </div>
            
            <div className="space-y-6">
              {carrierStats.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium">Нет данных</div>
              ) : carrierStats.map((c, i) => (
                <div key={i} className="space-y-2 group">
                  <div className="flex justify-between text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors text-fix">
                    <span>{c.name}</span>
                    <span className="text-slate-500 group-hover:text-emerald-600">{c.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000 relative" style={{ width: `${c.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. ТАМОЖЕННЫЕ ЛИМИТЫ (ЦЕНА И ВЕС) */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 text-fix">Контроль таможни</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Ограничения: 300 ₾ и 30 кг на человека</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
            {[ownerName, ...partners.filter(p => p.isActive).map(p => p.name)].map((name, idx) => {
              const stats = getPartnerStats(name);
              
              const isPriceOver = stats.sum >= 300;
              const isWeightOver = stats.weight >= 30;
              const hasAlert = isPriceOver || isWeightOver;
              
              const pricePct = Math.min((stats.sum / 300) * 100, 100);
              const weightPct = Math.min((stats.weight / 30) * 100, 100);
              const isOwner = idx === 0;
              
              return (
                <div key={name} className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${hasAlert ? 'bg-rose-50 border-rose-200 shadow-sm' : isOwner ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                  
                  {/* Шапка карточки партнера */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isOwner ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                        {isOwner ? <ShieldCheck size={18} /> : <User size={18} />}
                      </div>
                      <p className="font-extrabold text-slate-900 truncate max-w-[160px] text-lg text-fix">{name}</p>
                    </div>
                    {hasAlert && <AlertTriangle size={24} className="text-rose-500 drop-shadow-sm animate-pulse" />}
                  </div>
                  
                  {/* Шкалы лимитов */}
                  <div className="space-y-5">
                    
                    {/* Лимит: ЦЕНА */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Banknote size={12}/> Стоимость</span>
                        <span className={`font-black ${isPriceOver ? 'text-rose-600' : 'text-slate-800'}`}>
                          {stats.sum.toFixed(2)} <span className="text-xs text-slate-400">/ 300 ₾</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isPriceOver ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pricePct}%` }}></div>
                      </div>
                    </div>

                    {/* Лимит: ВЕС */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Scale size={12}/> Вес груза</span>
                        <span className={`font-black ${isWeightOver ? 'text-rose-600' : 'text-slate-800'}`}>
                          {stats.weight.toFixed(1)} <span className="text-xs text-slate-400">/ 30 кг</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isWeightOver ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${weightPct}%` }}></div>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
      </div>
    </>
  )
}