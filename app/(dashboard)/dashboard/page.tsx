'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package, Plane, AlertTriangle, CheckCircle, MessageCircle, Plus,
  Calculator, Loader2, Clock, ShieldAlert, CloudRain, Cloud, Sun,
  Weight, Store, Truck, User, Tag, QrCode, CalendarClock,
  ChevronDown, ChevronUp, TrendingUp, Archive, Timer, CheckCircle2,
  AlertCircle, ArrowUpCircle, Activity, Edit2, XCircle
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════

type DeliveryStatus = 'on_time' | 'delayed' | 'early' | 'unknown'

type Parcel = {
  id: string
  trackCode: string
  name: string
  value: number
  weight?: number
  status: string
  updatedAt: string
  shop?: string
  carrier?: string
  partner?: string
  recipientName?: string
  comment?: string // <-- ДОБАВЛЕНО ПОЛЕ КОММЕНТАРИЯ
  expectedDelivery?: string
  riskScore?: number
  deliveryScheduleStatus?: DeliveryStatus
  scheduleDeltaDays?: number
}

type WeatherIcon = 'clear' | 'clouds' | 'rain' | 'unknown'

// ═══════════════════════════════════════════════════════════
// КОНСТАНТЫ И УТИЛИТЫ
// ═══════════════════════════════════════════════════════════

const PRICE_LIMIT  = 300   // ₾
const WEIGHT_LIMIT = 30    // кг
const VAT          = 0.18
const CUSTOMS_FEE  = 20    // ₾

const DEMO: Parcel[] = [] // Демо пуст для продакшена

function riskCls(pct: number) {
  if (pct >= 61) return { badge: 'bg-rose-50 text-rose-600 border-rose-200', bar: 'bg-rose-400' }
  if (pct >= 31) return { badge: 'bg-amber-50 text-amber-600 border-amber-200', bar: 'bg-amber-400' }
  return { badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', bar: 'bg-emerald-400' }
}

function scheduleUI(s?: DeliveryStatus, delta?: number) {
  if (s === 'delayed') return { cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: <AlertCircle size={12}/>, label: `Задержка${delta ? ` +${delta}д` : ''}` }
  if (s === 'early') return { cls: 'bg-violet-50 text-violet-700 border-violet-200', icon: <ArrowUpCircle size={12}/>, label: `Раньше${delta ? ` ${Math.abs(delta)}д` : ''}` }
  if (s === 'on_time') return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12}/>, label: 'По графику' }
  return { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Timer size={12}/>, label: 'Мониторинг…' }
}

function RiskRow({ icon, label, pct }: { icon: React.ReactNode; label: string; pct: number }) {
  const r = riskCls(pct)
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold flex-shrink-0 w-[3.5rem] justify-center ${r.badge}`}>
        {icon}<span>{pct}%</span>
      </span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${r.bar}`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-xs text-slate-400 w-32 text-right truncate">{label}</span>
    </div>
  )
}

const formatDateForInput = (isoString?: string) => {
  if (!isoString) return '';
  try { return new Date(isoString).toISOString().split('T')[0]; } 
  catch { return ''; }
};

// ═══════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter()
  const [parcels,    setParcels]    = useState<Parcel[]>([])
  const [userName,   setUserName]   = useState('Пользователь')
  const [loading,    setLoading]    = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const [editingParcelId, setEditingParcelId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Parcel>>({})

  const [weather, setWeather] = useState<{ temp: string; condition: string; icon: WeatherIcon }>({ temp: '--', condition: 'Загрузка…', icon: 'unknown' })

  // ── Загрузка ─────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const [rP, rPr] = await Promise.all([
          fetch('/api/parcels'),
          fetch('/api/partners'),
        ])
        if (rP.ok) {
          const d = await rP.json()
          setParcels(d.parcels?.length ? d.parcels : DEMO)
        } else setParcels(DEMO)
        
        if (rPr.ok) {
          const d = await rPr.json()
          if (d.ownerName) setUserName(d.ownerName.split(' ')[0])
        }
      } catch { setParcels(DEMO) } 
      finally { setLoading(false) }
    })()

    ;(async () => {
      try {
        const KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '558d45f34dad570eafe1838f24dcc922'
        const d = await (await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Tbilisi&appid=${KEY}&units=metric&lang=ru`)).json()
        const m = d.weather?.[0]?.main ?? ''
        setWeather({
          temp:      `+${Math.round(d.main.temp)}°C`,
          condition: d.weather?.[0]?.description ?? '—',
          icon:      m === 'Clear' ? 'clear' : m === 'Clouds' ? 'clouds' : ['Rain','Drizzle','Thunderstorm'].includes(m) ? 'rain' : 'unknown',
        })
      } catch { setWeather({ temp: 'N/A', condition: 'Ошибка сети', icon: 'unknown' }) }
    })()
  }, [])

  // ── Обработчики действий ─────────────────────────────────────
  const handleAction = async (e: React.MouseEvent, action: string, id: string) => {
    e.stopPropagation() 
    if (['d1', 'd2', 'd3'].includes(id)) return alert('Демо-данные нельзя изменить.')
    
    if (action === 'edit') {
      const parcelToEdit = parcels.find(p => p.id === id)
      if (parcelToEdit) {
        setEditForm(parcelToEdit)
        setEditingParcelId(id)
      }
      return
    }

    let newStatus = ''
    if (action === 'delivered') newStatus = 'Доставлено'
    else if (action === 'lost') newStatus = 'Утеряно'
    else if (action === 'archive') newStatus = 'В архиве'

    if (newStatus) {
      const previousParcels = [...parcels]
      setParcels(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
      try {
        const res = await fetch(`/api/parcels/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
        if (!res.ok) throw new Error('Ошибка сервера')
        router.refresh()
      } catch (err) {
        console.error(err)
        alert('Не удалось обновить статус.')
        setParcels(previousParcels)
      }
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingParcelId) return

    try {
      const res = await fetch(`/api/parcels/${editingParcelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      
      if (!res.ok) throw new Error('Ошибка сохранения')
      
      const data = await res.json()
      
      setParcels(prev => prev.map(p => p.id === editingParcelId ? { ...p, ...data.parcel } : p))
      setEditingParcelId(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить изменения.')
    }
  }

  // ── Вычисления ───────────────────────────────────────────────
  const active    = useMemo(() => parcels.filter(p => !['доставлено','утеряно','в архиве'].includes(p.status.toLowerCase())), [parcels])
  const delivered = useMemo(() => parcels.filter(p => p.status.toLowerCase() === 'доставлено'), [parcels])
  const inTransit = useMemo(() => active.filter(p => p.status.toLowerCase() === 'в пути'), [active])

  const totalVal = useMemo(() => active.reduce((s, p) => s + Number(p.value  ?? 0), 0), [active])
  const totalWt  = useMemo(() => active.reduce((s, p) => s + Number(p.weight ?? 0), 0), [active])

  const valPct  = Math.min((totalVal / PRICE_LIMIT)  * 100, 100)
  const wtPct   = Math.min((totalWt  / WEIGHT_LIMIT) * 100, 100)
  const valOver = totalVal >= PRICE_LIMIT   
  const wtOver  = totalWt  >= WEIGHT_LIMIT  
  const anyRisk = valOver || wtOver
  const taxEst  = valOver ? totalVal * VAT + CUSTOMS_FEE : 0

  const avgRisk = active.length ? Math.round(active.reduce((s, p) => s + (p.riskScore ?? 0), 0) / active.length) : 0

  const getStatusUI = (st: string) => {
    const s = st.toLowerCase()
    if (s === 'доставлено') return { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={13}/> }
    if (s === 'на таможне' || s === 'таможня') return { cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: <AlertTriangle size={13}/> }
    if (s === 'в пути') return { cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Plane size={13}/> }
    return { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={13}/> }
  }

  const WIcon = () => {
    if (weather.icon === 'clear')  return <Sun size={26} className="text-amber-300"/>
    if (weather.icon === 'clouds') return <Cloud size={26} className="text-white"/>
    if (weather.icon === 'rain')   return <CloudRain size={26} className="text-blue-200"/>
    return <Cloud size={26} className="text-white/50"/>
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={32}/>
      <p className="text-slate-500 font-medium">Синхронизация с серверами логистики…</p>
    </div>
  )

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: none }
        }
        .fade-up   { animation: fadeUp .4s ease both }
        .fade-up-1 { animation: fadeUp .4s .08s ease both }
        .fade-up-2 { animation: fadeUp .4s .16s ease both }
        .fade-up-3 { animation: fadeUp .4s .24s ease both }

        input, textarea, select, [contenteditable] {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          background-color: #ffffff !important;
          opacity: 1 !important;
        }
        ::placeholder { color: #94a3b8 !important; opacity: 1 !important; }

        .card-hover { transition: box-shadow .18s, transform .18s }
        .card-hover:hover { box-shadow: 0 8px 32px -4px rgba(99,102,241,.13); transform: translateY(-1px); }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          <header className="fade-up flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-white shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Привет, {userName}! </h1>
              <p className="text-slate-400 mt-1 text-sm font-medium">Логистика · Таможня · Риски</p>
            </div>
            <button onClick={() => router.push('/dashboard/add')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-indigo-200 hover:shadow-lg text-sm w-full sm:w-auto justify-center">
              <Plus size={18}/>Добавить трек
            </button>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 fade-up-1">
            <div className="card-hover bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-white shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl flex-shrink-0"><Package size={22}/></div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">Ожидается</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{active.length}</p>
              </div>
            </div>

            <div className="card-hover bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-white shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl flex-shrink-0"><Plane size={22}/></div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">В пути</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{inTransit.length}</p>
              </div>
            </div>

            <div className="card-hover bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-white shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl flex-shrink-0"><CheckCircle size={22}/></div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">Доставлено</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{delivered.length}</p>
              </div>
            </div>

            <div className="card-hover bg-gradient-to-br from-cyan-500 to-blue-600 p-4 sm:p-6 rounded-3xl shadow-md text-white flex items-center gap-3 sm:gap-4 relative overflow-hidden col-span-2 lg:col-span-1">
              <div className="absolute -right-4 -top-4 opacity-15"><CloudRain size={90}/></div>
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm flex-shrink-0 z-10"><WIcon/></div>
              <div className="z-10 min-w-0">
                <p className="text-[10px] sm:text-xs text-cyan-100 font-bold uppercase tracking-wide">Тбилиси · Хаб</p>
                <p className="text-2xl sm:text-3xl font-black leading-none">{weather.temp}</p>
                <p className="text-[10px] text-cyan-100 capitalize truncate mt-0.5">{weather.condition}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 fade-up-2">
            <div className="lg:col-span-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white shadow-sm overflow-hidden">
                <div className="px-5 sm:px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <h2 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <Activity size={18} className="text-indigo-500"/>
                    Активные грузы
                  </h2>
                  <Link href="/archive" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                    <Archive size={13}/>Архив
                  </Link>
                </div>

                {active.length === 0 ? (
                  <div className="p-16 flex flex-col items-center text-center text-slate-400">
                    <div className="p-5 bg-slate-50 rounded-full mb-4"><Package size={40} className="text-slate-300"/></div>
                    <p className="font-bold text-slate-600 mb-1">Нет активных посылок</p>
                    <p className="text-sm">Все отправления доставлены или ещё не добавлены.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {active.map(parcel => {
                      const stUI  = getStatusUI(parcel.status)
                      const sched = scheduleUI(parcel.deliveryScheduleStatus, parcel.scheduleDeltaDays)
                      const risk  = parcel.riskScore ?? 0 
                      const rc    = riskCls(risk)
                      const open  = expandedId === parcel.id

                      return (
                        <div key={parcel.id}>
                          <div className="px-5 sm:px-7 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setExpandedId(open ? null : parcel.id)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={`mt-0.5 p-2 rounded-xl border flex-shrink-0 ${stUI.cls}`}>{stUI.icon}</div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-sm sm:text-base truncate leading-snug">{parcel.name}</p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                   <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded select-all">{parcel.trackCode}</span>
                                   <span className="text-xs text-slate-400">{Number(parcel.value).toFixed(2)} ₾</span>
                                   {parcel.weight != null && <span className="text-xs text-slate-400">{parcel.weight} кг</span>}
                                   {parcel.expectedDelivery && (
                                     <span className="text-xs text-indigo-500/80 font-medium flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded">
                                       {new Date(parcel.expectedDelivery).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                     </span>
                                   )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${stUI.cls}`}>{parcel.status}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${sched.cls}`}>{sched.icon}{sched.label}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${rc.badge}`}>⚠ {risk}%</span>
                              </div>
                            </div>
                            <div className="flex justify-end mt-1.5">
                              <span className="text-slate-300 hover:text-indigo-400 transition-colors">
                                {open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                              </span>
                            </div>
                          </div>

                          {open && (
                            <div className="px-5 sm:px-7 pb-5">
                              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {([
                                    { icon: <Store size={13}/>, label: 'Магазин', val: parcel.shop || 'Не указан' },
                                    { icon: <Truck size={13}/>, label: 'Перевозчик', val: parcel.carrier || 'Не указан' },
                                    { icon: <User size={13}/>, label: 'Получатель', val: parcel.recipientName || parcel.partner || 'Владелец' },
                                    { icon: <Tag size={13}/>, label: 'Цена товара', val: `${Number(parcel.value).toFixed(2)} ₾` },
                                    parcel.weight != null && { icon: <Weight size={13}/>, label: 'Вес посылки',  val: `${parcel.weight} кг` },
                                    { icon: <QrCode size={13}/>, label: 'Трек-код', val: parcel.trackCode, mono: true },
                                    { icon: <CalendarClock size={13}/>, label: 'Ожид. доставка', val: parcel.expectedDelivery ? new Date(parcel.expectedDelivery).toLocaleDateString('ru-RU') : 'Дата неизвестна' },
                                  ] as const).filter(Boolean).map((f: any, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">{f.icon}</span>
                                      <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{f.label}</p>
                                        <p className={`text-sm font-semibold text-slate-700 leading-snug truncate ${f.mono ? 'font-mono text-xs' : ''}`}>{f.val}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {parcel.comment && (
                                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                                      <MessageCircle size={12}/> Комментарий
                                    </p>
                                    <p className="text-sm text-slate-700">{parcel.comment}</p>
                                  </div>
                                )}

                                <div className="space-y-2 pt-1 border-t border-slate-200">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-2">Аналитика платформы</p>
                                  <RiskRow icon={<AlertTriangle size={11}/>} label="Риск совпадения (Таможня)" pct={risk} />
                                </div>

                                <p className="text-[10px] text-slate-400 text-right">Обновлено: {new Date(parcel.updatedAt).toLocaleString('ru-RU')}</p>

                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-200/60">
                                  <button onClick={(e) => handleAction(e, 'delivered', parcel.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                                    <CheckCircle2 size={14} /> Доставлено
                                  </button>
                                  <button onClick={(e) => handleAction(e, 'lost', parcel.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors">
                                    <XCircle size={14} /> Утеряно
                                  </button>
                                  <button onClick={(e) => handleAction(e, 'edit', parcel.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                                    <Edit2 size={14} /> Изменить
                                  </button>
                                  <button onClick={(e) => handleAction(e, 'archive', parcel.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors sm:ml-auto">
                                    <Archive size={14} /> В архив
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 fade-up-3">
              <div className={`bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl border shadow-sm transition-colors ${anyRisk ? 'border-rose-200 bg-rose-50/20' : 'border-white'}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2.5 rounded-2xl ${anyRisk ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}><Calculator size={20}/></div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Таможенный лимит</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Закон Грузии</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Tag size={11}/>Сумма активных</span>
                      <span className={`text-lg font-black leading-none ${valOver ? 'text-rose-600' : 'text-slate-900'}`}>
                        {totalVal.toFixed(0)} <span className="text-xs text-slate-400 font-semibold ml-1">/ {PRICE_LIMIT} ₾</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${valOver ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${valPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Weight size={11}/>Вес активных</span>
                      <span className={`text-lg font-black leading-none ${wtOver ? 'text-rose-600' : 'text-slate-900'}`}>
                        {totalWt.toFixed(2)} <span className="text-xs text-slate-400 font-semibold ml-1">/ {WEIGHT_LIMIT} кг</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${wtOver ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${wtPct}%` }} />
                    </div>
                  </div>

                  {anyRisk ? (
                    <div className="p-3.5 bg-white rounded-2xl border border-rose-200 flex items-start gap-3">
                      <ShieldAlert size={17} className="text-rose-500 flex-shrink-0 mt-0.5"/>
                      <div>
                        <p className="font-black text-rose-800 text-sm">Лимит превышен!</p>
                        {valOver && <p className="text-xs text-rose-700 mt-0.5 leading-snug">Цена &gt;300 ₾ — пошлина ~<strong>{taxEst.toFixed(0)} ₾</strong></p>}
                        {wtOver && <p className="text-xs text-rose-700 mt-0.5 leading-snug">Вес &gt;30 кг — возможна задержка.</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <CheckCircle size={17} className="text-emerald-500 flex-shrink-0"/>
                      <p className="text-xs text-slate-600 font-medium">Беспошлинный порог не превышен.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl border border-white shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl"><TrendingUp size={18}/></div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Барометр рисков</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Аналитика совпадений</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <RiskRow icon={<ShieldAlert size={11}/>} label="Средний таможенный риск" pct={avgRisk}/>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 sm:p-6 rounded-3xl shadow-md text-white relative overflow-hidden group">
                <div className="absolute -right-5 -bottom-5 opacity-10 group-hover:scale-110 transition-transform duration-500"><MessageCircle size={120}/></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><MessageCircle size={20}/></div>
                    <h3 className="font-extrabold text-base">Telegram-бот</h3>
                  </div>
                  <p className="text-indigo-100 text-xs mb-5 leading-relaxed font-medium">Мгновенные уведомления о статусах, таможенных рисках и задержках рейсов.</p>
                  <button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 py-3 rounded-2xl font-black text-sm transition-all shadow-sm hover:shadow-md">
                    Подключить уведомления
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ────────────────────── */}
      {editingParcelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden fade-up flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-extrabold text-slate-800">Редактировать груз</h3>
              <button onClick={() => setEditingParcelId(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <XCircle size={22} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Название</label>
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Трек-код</label>
                <input type="text" value={editForm.trackCode || ''} onChange={e => setEditForm({...editForm, trackCode: e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500 font-mono" required />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Цена (GEL)</label>
                  <input type="number" step="0.01" value={editForm.value || ''} onChange={e => setEditForm({...editForm, value: parseFloat(e.target.value) || 0})} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Вес (КГ)</label>
                  <input type="number" step="0.01" value={editForm.weight || ''} onChange={e => setEditForm({...editForm, weight: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Магазин</label>
                  <input type="text" value={editForm.shop || ''} onChange={e => setEditForm({...editForm, shop: e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Перевозчик</label>
                  <input type="text" value={editForm.carrier || ''} onChange={e => setEditForm({...editForm, carrier: e.target.value})} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              {/* ── БЛОК ПОЛУЧАТЕЛЯ И ДАТЫ ДОСТАВКИ ── */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Получатель</label>
                  <input 
                    type="text" 
                    value={editForm.recipientName || ''} 
                    onChange={e => setEditForm({...editForm, recipientName: e.target.value})} 
                    className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" 
                    placeholder="Имя получателя" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ожидаемая доставка</label>
                  <input 
                    type="date" 
                    value={formatDateForInput(editForm.expectedDelivery)} 
                    onChange={e => setEditForm({...editForm, expectedDelivery: e.target.value ? new Date(e.target.value).toISOString() : undefined})} 
                    className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>

              {/* ── БЛОК КОММЕНТАРИЯ ── */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Комментарий</label>
                <textarea 
                  value={editForm.comment || ''} 
                  onChange={e => setEditForm({...editForm, comment: e.target.value})} 
                  className="w-full border rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-indigo-500 resize-none"
                  rows={2}
                  placeholder="Заметки о посылке (хрупкое, код домофона...)"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0 pb-1">
                <button type="button" onClick={() => setEditingParcelId(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                  Отмена
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}