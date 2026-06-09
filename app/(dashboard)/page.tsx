'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Plane,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  Plus,
  Calculator,
  Loader2,
  Clock,
  ShieldAlert,
  CloudRain,
  Cloud,
  Sun,
  Weight,
  Store,
  Truck,
  User,
  Tag,
  QrCode,
  CalendarClock,
  Gauge,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Archive
} from 'lucide-react'

// ─── ТИПЫ ────────────────────────────────────────────────────────────────────

type Parcel = {
  id: string
  trackCode: string
  name: string
  value: number          // цена в лари
  weight?: number        // вес в кг
  status: string
  updatedAt: string
  shop?: string          // магазин
  carrier?: string       // перевозчик
  partner?: string       // покупатель / партнёр
  expectedDelivery?: string  // ожидаемая дата доставки
  hubWeatherRisk?: number    // риск по погоде в хабе 0–100
  flightDelayRisk?: number   // риск задержки рейса 0–100
}

type WeatherState = {
  temp: string
  condition: string
  icon: 'clear' | 'clouds' | 'rain' | 'unknown'
}

// ─── ВСПОМОГАТЕЛЬНЫЕ КОНСТАНТЫ ───────────────────────────────────────────────

const CUSTOMS_PRICE_LIMIT = 300   // ₾
const CUSTOMS_WEIGHT_LIMIT = 30   // кг
const VAT_RATE = 0.18
const CUSTOMS_FEE = 20            // ₾

// ─── УТИЛИТЫ ─────────────────────────────────────────────────────────────────

function getRiskColor(pct: number): string {
  if (pct >= 75) return 'text-rose-600 bg-rose-50 border-rose-200'
  if (pct >= 45) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

function getRiskLabel(pct: number): string {
  if (pct >= 75) return 'Высокий риск'
  if (pct >= 45) return 'Средний риск'
  return 'Низкий риск'
}

/** Считаем сводный риск для карточки (погода + задержка + лимиты) */
function calcCardRisk(parcel: Parcel, totalValue: number, totalWeight: number): number {
  const weatherRisk   = parcel.hubWeatherRisk  ?? 0
  const delayRisk     = parcel.flightDelayRisk ?? 0
  const valueRatio    = Math.min((totalValue  / CUSTOMS_PRICE_LIMIT)  * 100, 100)
  const weightRatio   = Math.min((totalWeight / CUSTOMS_WEIGHT_LIMIT) * 100, 100)
  // Взвешенное среднее: погода 25%, задержки 25%, ценовой лимит 30%, весовой лимит 20%
  return Math.round(weatherRisk * 0.25 + delayRisk * 0.25 + valueRatio * 0.30 + weightRatio * 0.20)
}

// ─── ДЕМО-ДАННЫЕ (используются когда API не вернул weight/shop/carrier/…) ────

const DEMO_PARCELS: Parcel[] = [
  {
    id: 'demo-1',
    trackCode: 'CN123456789GE',
    name: 'Смартфон OnePlus 12',
    value: 220,
    weight: 0.4,
    status: 'В пути',
    updatedAt: new Date().toISOString(),
    shop: 'AliExpress',
    carrier: 'YunExpress',
    partner: 'Нино Берцхваладзе',
    expectedDelivery: '2025-06-20',
    hubWeatherRisk: 18,
    flightDelayRisk: 30,
  },
  {
    id: 'demo-2',
    trackCode: 'US987654321GE',
    name: 'MacBook Air M3',
    value: 1600,
    weight: 1.24,
    status: 'На таможне',
    updatedAt: new Date().toISOString(),
    shop: 'Amazon US',
    carrier: 'DHL Express',
    partner: 'Давид Мамиашвили',
    expectedDelivery: '2025-06-15',
    hubWeatherRisk: 55,
    flightDelayRisk: 70,
  },
  {
    id: 'demo-3',
    trackCode: 'TR555444333GE',
    name: 'Кроссовки Nike Air Max',
    value: 78,
    weight: 0.9,
    status: 'Ожидается',
    updatedAt: new Date().toISOString(),
    shop: 'ASOS',
    carrier: 'PostaGudan',
    partner: 'Тамара Кахиани',
    expectedDelivery: '2025-07-02',
    hubWeatherRisk: 10,
    flightDelayRisk: 15,
  },
]

// ─── КОМПОНЕНТ ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [userName, setUserName] = useState('Пользователь')
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState<WeatherState>({ temp: '--', condition: 'Загрузка...', icon: 'unknown' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Загрузка данных ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [resParcels, resPartners] = await Promise.all([
          fetch('/api/parcels'),
          fetch('/api/partners'),
        ])

        if (resParcels.ok) {
          const d = await resParcels.json()
          if (d.parcels?.length) {
    // Маппим recipientName в поле partner, которое ожидает интерфейс дашборда
       setParcels(d.parcels.map((p: any) => ({
      ...p,
      partner: (!p.recipientName || p.recipientName === 'Владелец') ? undefined : p.recipientName
    })))
  } else {
       setParcels(DEMO_PARCELS)
  }
}

        if (resPartners.ok) {
          const d = await resPartners.json()
          if (d.ownerName) setUserName(d.ownerName.split(' ')[0])
        }
      } catch {
        setParcels(DEMO_PARCELS)
      } finally {
        setLoading(false)
      }
    }

    const fetchWeather = async () => {
      try {
        const KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'
        const res  = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Tbilisi&appid=${KEY}&units=metric&lang=ru`
        )
        const data = await res.json()
        const main = data.weather?.[0]?.main ?? ''
        let icon: WeatherState['icon'] = 'unknown'
        if (main === 'Clear') icon = 'clear'
        else if (main === 'Clouds') icon = 'clouds'
        else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(main)) icon = 'rain'
        setWeather({
          temp: `+${Math.round(data.main.temp)}°C`,
          condition: data.weather?.[0]?.description ?? '—',
          icon,
        })
      } catch {
        setWeather({ temp: 'N/A', condition: 'Ошибка сети', icon: 'unknown' })
      }
    }

    fetchAll()
    fetchWeather()
  }, [])

  // ── Математика ───────────────────────────────────────────────────────────

  const activeParcels    = useMemo(() => parcels.filter(p => {
    const s = p.status.toLowerCase()
    return s !== 'доставлено' && s !== 'утеряно'
  }), [parcels])

  const deliveredParcels = useMemo(() =>
    parcels.filter(p => p.status.toLowerCase() === 'доставлено'),
    [parcels]
  )

  // Цена (₾) всех активных посылок
  const totalValueGEL = useMemo(() =>
    activeParcels.reduce((s, p) => s + Number(p.value  ?? 0), 0),
    [activeParcels]
  )

  // Вес (кг) всех активных посылок
  const totalWeightKG = useMemo(() =>
    activeParcels.reduce((s, p) => s + Number(p.weight ?? 0), 0),
    [activeParcels]
  )

  const valuePct   = Math.min((totalValueGEL  / CUSTOMS_PRICE_LIMIT)  * 100, 100)
  const weightPct  = Math.min((totalWeightKG  / CUSTOMS_WEIGHT_LIMIT) * 100, 100)

  const isValueRisk  = totalValueGEL  >= CUSTOMS_PRICE_LIMIT
  const isWeightRisk = totalWeightKG  >= CUSTOMS_WEIGHT_LIMIT
  const isCustomsRisk = isValueRisk || isWeightRisk

  const customsTaxEst = isValueRisk
    ? totalValueGEL * VAT_RATE + CUSTOMS_FEE
    : 0

  // ── UI-хелперы ───────────────────────────────────────────────────────────

  const getStatusUI = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'доставлено')
      return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={14} /> }
    if (s === 'на таможне' || s === 'таможня')
      return { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <AlertTriangle size={14} /> }
    if (s === 'в пути')
      return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Plane size={14} /> }
    return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={14} /> }
  }

  const renderWeatherIcon = () => {
    if (weather.icon === 'clear')  return <Sun       size={28} className="text-amber-300" />
    if (weather.icon === 'clouds') return <Cloud     size={28} className="text-white" />
    if (weather.icon === 'rain')   return <CloudRain size={28} className="text-blue-200" />
    return <Cloud size={28} className="text-white/50" />
  }

  // ── Загрузочный экран ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Синхронизация с серверами логистики…</p>
      </div>
    )
  }

  // ── РЕНДЕР ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8">

      {/* ── СТИЛИ (inline-keyframes для Tailwind CDN / проектов без purge) ── */}
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fadeIn .45s ease both }

        @keyframes barGrow { from{width:0} to{width:var(--bar-w)} }
        .animate-bar { animation: barGrow 1s cubic-bezier(.4,0,.2,1) both }

        /* Гарантируем читаемость текста в полях на любом фоне */
        input, textarea, select {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          background-color: #fff !important;
        }
        @media (prefers-color-scheme: dark) {
          input, textarea, select {
            color: #f1f5f9 !important;
            -webkit-text-fill-color: #f1f5f9 !important;
            background-color: #1e293b !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* ── ШАПКА ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                           bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Привет, {userName}!
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">
              Контроль логистики и таможенных лимитов
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/add')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white
                       px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl font-bold transition-all
                       shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            Добавить трек
          </button>
        </header>

        {/* ── ВИДЖЕТЫ СТАТИСТИКИ ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Ожидается */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100
                          flex items-center gap-3 sm:gap-5 hover:scale-[1.02] transition-transform">
            <div className="p-3 sm:p-4 bg-blue-50 text-blue-600 rounded-2xl flex-shrink-0">
              <Package size={22} className="sm:hidden" />
              <Package size={28} className="hidden sm:block" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
                Ожидается
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{activeParcels.length}</p>
            </div>
          </div>

          {/* В пути */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100
                          flex items-center gap-3 sm:gap-5 hover:scale-[1.02] transition-transform">
            <div className="p-3 sm:p-4 bg-indigo-50 text-indigo-600 rounded-2xl flex-shrink-0">
              <Plane size={22} className="sm:hidden" />
              <Plane size={28} className="hidden sm:block" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">В пути</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {activeParcels.filter(p => p.status.toLowerCase() === 'в пути').length}
              </p>
            </div>
          </div>

          {/* Доставлено */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100
                          flex items-center gap-3 sm:gap-5 hover:scale-[1.02] transition-transform">
            <div className="p-3 sm:p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex-shrink-0">
              <CheckCircle size={22} className="sm:hidden" />
              <CheckCircle size={28} className="hidden sm:block" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Доставлено</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{deliveredParcels.length}</p>
            </div>
          </div>

          {/* Погода */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 sm:p-6 rounded-3xl
                          shadow-md text-white flex items-center gap-3 sm:gap-5 relative overflow-hidden
                          hover:scale-[1.02] transition-transform col-span-2 lg:col-span-1">
            <div className="absolute -right-4 -top-4 opacity-20">
              <CloudRain size={90} />
            </div>
            <div className="p-2.5 sm:p-3 bg-white/20 rounded-2xl backdrop-blur-sm z-10 flex-shrink-0">
              {renderWeatherIcon()}
            </div>
            <div className="z-10 min-w-0">
              <p className="text-[10px] sm:text-xs text-cyan-100 font-bold uppercase tracking-wider truncate">
                Аэропорт Тбилиси
              </p>
              <p className="text-2xl sm:text-3xl font-black leading-none mt-0.5">{weather.temp}</p>
              <p className="text-[10px] text-cyan-50 capitalize mt-0.5 truncate">{weather.condition}</p>
            </div>
          </div>
        </div>

        {/* ── ОСНОВНАЯ СЕТКА ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── ЛЕВАЯ КОЛОНКА: СПИСОК ПОСЫЛОК ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">

              {/* Заголовок */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Активные грузы</h2>
                <Link
                  href="/archive"
                  className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-bold
                             flex items-center gap-1 transition-colors"
                >
                  <Archive size={14} />
                  Архив
                </Link>
              </div>

              {/* Тело списка */}
              <div className="divide-y divide-slate-100">
                {activeParcels.length === 0 ? (
                  <div className="p-12 flex flex-col items-center text-center text-slate-400">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                      <Package size={44} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-base text-slate-600 mb-1">Нет активных посылок</p>
                    <p className="text-sm">Все отправления доставлены или ещё не добавлены.</p>
                  </div>
                ) : (
                  activeParcels.map(parcel => {
                    const statusUI = getStatusUI(parcel.status)
                    const risk     = calcCardRisk(parcel, totalValueGEL, totalWeightKG)
                    const riskCls  = getRiskColor(risk)
                    const isOpen   = expandedId === parcel.id

                    return (
                      <div key={parcel.id} className="hover:bg-slate-50/70 transition-colors">

                        {/* Строка-превью */}
                        <div
                          className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start gap-3 cursor-pointer"
                          onClick={() => setExpandedId(isOpen ? null : parcel.id)}
                        >
                          {/* Левая часть */}
                          <div className="flex items-start gap-3 w-full sm:w-auto">
                            <div className={`mt-0.5 p-2 rounded-xl border flex-shrink-0 ${statusUI.color}`}>
                              {statusUI.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-base leading-tight truncate
                                            group-hover:text-indigo-600">
                                {parcel.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                <span className="text-xs font-mono text-slate-500 bg-slate-100
                                                  px-1.5 py-0.5 rounded select-all">
                                  {parcel.trackCode}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  {Number(parcel.value).toFixed(2)} ₾
                                </span>
                                {parcel.weight && (
                                  <span className="text-xs text-slate-400">{parcel.weight} кг</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Правая часть */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                                              text-xs font-bold uppercase tracking-wide border ${statusUI.color}`}>
                              {parcel.status}
                            </span>

                            {/* Индикатор риска */}
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg
                                              text-xs font-black border ${riskCls}`}>
                              <Gauge size={11} />
                              {risk}%
                            </span>

                            <span className="text-[10px] text-slate-400 hidden sm:block">
                              {new Date(parcel.updatedAt).toLocaleDateString('ru-RU')}
                            </span>

                            {/* Кнопка раскрытия */}
                            <button className="text-slate-400 hover:text-indigo-500 transition-colors ml-1">
                              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* ── РАСШИРЕННАЯ КАРТОЧКА ──────────────────────── */}
                        {isOpen && (
                          <div className="px-4 pb-5 sm:px-5 sm:pb-5">
                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">

                              {/* Детали посылки */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                                {/* Магазин */}
                                {parcel.shop && (
                                  <div className="flex items-start gap-2">
                                    <Store size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        Магазин
                                      </p>
                                      <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        {parcel.shop}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Перевозчик */}
                                {parcel.carrier && (
                                  <div className="flex items-start gap-2">
                                    <Truck size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        Перевозчик
                                      </p>
                                      <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        {parcel.carrier}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Покупатель / партнёр */}
                                {parcel.partner && (
                                  <div className="flex items-start gap-2">
                                    <User size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        Покупатель
                                      </p>
                                      <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        {parcel.partner}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Цена */}
                                <div className="flex items-start gap-2">
                                  <Tag size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                      Цена товара
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight">
                                      {Number(parcel.value).toFixed(2)} ₾
                                    </p>
                                  </div>
                                </div>

                                {/* Вес */}
                                {parcel.weight !== undefined && (
                                  <div className="flex items-start gap-2">
                                    <Weight size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        Вес посылки
                                      </p>
                                      <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        {parcel.weight} кг
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Трек */}
                                <div className="flex items-start gap-2">
                                  <QrCode size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                      Трек-код
                                    </p>
                                    <p className="text-xs font-mono font-semibold text-slate-700 leading-tight select-all">
                                      {parcel.trackCode}
                                    </p>
                                  </div>
                                </div>

                                {/* Дата доставки */}
                                {parcel.expectedDelivery && (
                                  <div className="flex items-start gap-2">
                                    <CalendarClock size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        Ожид. доставка
                                      </p>
                                      <p className="text-sm font-semibold text-slate-700 leading-tight">
                                        {new Date(parcel.expectedDelivery).toLocaleDateString('ru-RU', {
                                          day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Блок предупреждений */}
                              <div className="space-y-2">
                                {/* Риск погоды */}
                                {(parcel.hubWeatherRisk ?? 0) > 0 && (
                                  <WarningRow
                                    icon={<CloudRain size={13} />}
                                    label="Погода в хабе"
                                    pct={parcel.hubWeatherRisk ?? 0}
                                  />
                                )}

                                {/* Риск задержки рейса */}
                                {(parcel.flightDelayRisk ?? 0) > 0 && (
                                  <WarningRow
                                    icon={<Plane size={13} />}
                                    label="Задержка рейса"
                                    pct={parcel.flightDelayRisk ?? 0}
                                  />
                                )}

                                {/* Риск по сумме */}
                                {totalValueGEL > 0 && (
                                  <WarningRow
                                    icon={<Tag size={13} />}
                                    label={`Ценовой лимит (${CUSTOMS_PRICE_LIMIT} ₾)`}
                                    pct={Math.round(valuePct)}
                                  />
                                )}

                                {/* Риск по весу */}
                                {totalWeightKG > 0 && (
                                  <WarningRow
                                    icon={<Weight size={13} />}
                                    label={`Весовой лимит (${CUSTOMS_WEIGHT_LIMIT} кг)`}
                                    pct={Math.round(weightPct)}
                                  />
                                )}

                                {/* Сводный риск */}
                                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold text-xs ${riskCls}`}>
                                  <span className="flex items-center gap-1.5">
                                    <Gauge size={13} />
                                    Сводный риск
                                  </span>
                                  <span className="text-base font-black">{risk}%</span>
                                </div>
                              </div>

                              {/* Дата обновления */}
                              <p className="text-[10px] text-slate-400 text-right">
                                Обновлено: {new Date(parcel.updatedAt).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── ПРАВАЯ КОЛОНКА ────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* ── ТАМОЖЕННЫЙ КАЛЬКУЛЯТОР ──────────────────────────────── */}
            <div className={`bg-white p-5 sm:p-7 rounded-3xl shadow-sm border transition-colors
                            ${isCustomsRisk ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100'}`}>

              <div className="flex items-center gap-3 mb-5">
                <div className={`p-3 rounded-2xl ${isCustomsRisk ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Calculator size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Таможенный лимит</h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase">Закон Грузии</p>
                </div>
              </div>

              <div className="space-y-5">

                {/* ── Контроль цены ─────────────────────────────────── */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-slate-500 font-semibold text-xs sm:text-sm">Сумма активных</span>
                    <span className={`text-xl sm:text-2xl font-black leading-none
                                      ${isValueRisk ? 'text-rose-600' : 'text-slate-900'}`}>
                      {totalValueGEL.toFixed(2)}
                      <span className="text-xs sm:text-sm text-slate-400 font-bold ml-1">/ 300 ₾</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000
                                  ${isValueRisk ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{ width: `${valuePct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">0 ₾</span>
                    <span className={`text-[10px] font-bold ${isValueRisk ? 'text-rose-500' : 'text-slate-400'}`}>
                      {valuePct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* ── Контроль веса ─────────────────────────────────── */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-slate-500 font-semibold text-xs sm:text-sm flex items-center gap-1">
                      <Weight size={13} className="text-slate-400" />
                      Вес активных
                    </span>
                    <span className={`text-xl sm:text-2xl font-black leading-none
                                      ${isWeightRisk ? 'text-rose-600' : 'text-slate-900'}`}>
                      {totalWeightKG.toFixed(2)}
                      <span className="text-xs sm:text-sm text-slate-400 font-bold ml-1">/ 30 кг</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000
                                  ${isWeightRisk ? 'bg-rose-500' : 'bg-teal-500'}`}
                      style={{ width: `${weightPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">0 кг</span>
                    <span className={`text-[10px] font-bold ${isWeightRisk ? 'text-rose-500' : 'text-slate-400'}`}>
                      {weightPct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Статус / предупреждение */}
                {isCustomsRisk ? (
                  <div className="p-3.5 bg-white rounded-2xl border border-rose-200 shadow-sm
                                  flex items-start gap-3 text-rose-800 text-sm">
                    <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-rose-500" />
                    <div>
                      <p className="font-black text-sm">Превышен лимит!</p>
                      {isValueRisk && (
                        <p className="mt-0.5 text-xs opacity-90 font-medium leading-snug">
                          Цена: ожид. пошлина ~<strong>{customsTaxEst.toFixed(2)} ₾</strong> (НДС 18% + сбор 20 ₾).
                          Подготовьте инвойсы.
                        </p>
                      )}
                      {isWeightRisk && (
                        <p className="mt-0.5 text-xs opacity-90 font-medium leading-snug">
                          Вес: превышен порог {CUSTOMS_WEIGHT_LIMIT} кг.
                          Возможна задержка на таможне.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100
                                  flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Всё в порядке — беспошлинный порог не превышен.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── ОБЩИЙ РИСК-БАРОМЕТР ─────────────────────────────────── */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                  <TrendingUp size={20} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Риск-барометр</h3>
              </div>
              <div className="space-y-2.5">
                <WarningRow icon={<CloudRain size={13} />} label="Погода в хабах" pct={
                  activeParcels.length
                    ? Math.round(activeParcels.reduce((s, p) => s + (p.hubWeatherRisk ?? 0), 0) / activeParcels.length)
                    : 0
                } />
                <WarningRow icon={<Plane size={13} />} label="Задержки рейсов" pct={
                  activeParcels.length
                    ? Math.round(activeParcels.reduce((s, p) => s + (p.flightDelayRisk ?? 0), 0) / activeParcels.length)
                    : 0
                } />
                <WarningRow icon={<Tag size={13} />}    label="Ценовой лимит"   pct={Math.round(valuePct)} />
                <WarningRow icon={<Weight size={13} />} label="Весовой лимит"   pct={Math.round(weightPct)} />
              </div>
            </div>

            {/* ── TELEGRAM ────────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 sm:p-7 rounded-3xl
                            shadow-md text-white relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <MessageCircle size={130} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <MessageCircle size={22} />
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">Telegram-бот</h3>
                </div>
                <p className="text-indigo-100 text-xs sm:text-sm mb-5 font-medium leading-relaxed">
                  Мгновенные уведомления о статусах, таможенных рисках и задержках рейсов.
                </p>
                <button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 py-3 rounded-xl
                                   font-black text-sm transition-all shadow-sm hover:shadow-md">
                  Подключить уведомления
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ: строка-предупреждение ────────────────────────

function WarningRow({
  icon,
  label,
  pct,
}: {
  icon: React.ReactNode
  label: string
  pct: number
}) {
  const cls = getRiskColor(pct)
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold flex-shrink-0 ${cls}`}>
        {icon}
        <span>{pct}%</span>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            pct >= 75 ? 'bg-rose-400' : pct >= 45 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 font-medium min-w-[90px] text-right truncate">{label}</span>
    </div>
  )
}
