'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PackagePlus, ArrowLeft, Loader2, CheckCircle2, AlertCircle,
  Barcode, Tag, Store, Truck, User, Weight, Calendar, CalendarClock, MessageSquare
} from 'lucide-react'

export default function AddParcelPage() {
  const router = useRouter()
  
  // ── Расширенное состояние формы ──────────────────────────────
  const [formData, setFormData] = useState({
    trackCode: '',
    name: '',
    value: '',
    weight: '',
    shop: '',
    carrier: '',
    partner: '',
    purchaseDate: '',
    expectedDelivery: '',
    comment: ''
  })
  
  // ── Состояния для премиального UI ────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Подготовка данных: приведение к нужным типам
      const payload = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        weight: parseFloat(formData.weight) || 0
      }

      const res = await fetch('/api/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        setSuccess(true)
        // Плавный переход в дашборд
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Не удалось сохранить данные. Проверьте правильность заполнения.')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером. Проверьте интернет.')
    } finally {
      if (!success) setLoading(false)
    }
  }

  // Универсальный класс для полей ввода (с фиксом для мобильных)
  const inputClassName = "w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-400 appearance-none"

  return (
    <>
      {/* ── ЖЕСТКИЙ ФИКС ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ (iOS/Android) ── */}
      <style>{`
        input, textarea, select {
          color: #0f172a !important; /* Строгий темно-синий/черный */
          -webkit-text-fill-color: #0f172a !important; /* Фикс для Safari */
          opacity: 1 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
          opacity: 1 !important;
        }
        /* Убираем стандартные иконки календаря в WebKit для единообразия */
        ::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
          transition: 0.2s;
        }
        ::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>

      <div className="py-6 px-4 md:px-8 max-w-4xl mx-auto animate-fade-in min-h-screen">
        
        {/* ── Кнопка назад ── */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-6 transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={20} />
          Назад к дашборду
        </Link>

        <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm">
          
          {/* ── Шапка ── */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-2xl shadow-inner border border-indigo-100/50">
              <PackagePlus size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Регистрация груза</h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">Заполните данные для начала мониторинга</p>
            </div>
          </div>

          {/* ── Уведомления ── */}
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-fade-in">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 animate-fade-in">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <p className="text-sm font-bold">Груз успешно добавлен! Перенаправляем...</p>
            </div>
          )}

          {/* ── ФОРМА ── */}
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* БЛОК 1: Основная информация */}
            <div className="space-y-5">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Идентификация</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Barcode size={14} className="text-indigo-500" /> Трек-номер *
                  </label>
                  <input 
                    required
                    className={inputClassName} 
                    placeholder="Например: TB123456789GE" 
                    value={formData.trackCode}
                    onChange={e => setFormData({...formData, trackCode: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Tag size={14} className="text-indigo-500" /> Название / Описание *
                  </label>
                  <input 
                    required
                    className={inputClassName} 
                    placeholder="Например: Кроссовки Nike Air" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* БЛОК 2: Финансы и Габариты */}
            <div className="space-y-5">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Спецификация</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Tag size={14} className="text-emerald-500" /> Стоимость товара (₾) *
                  </label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className={inputClassName} 
                    placeholder="0.00" 
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Weight size={14} className="text-emerald-500" /> Вес посылки (кг)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    className={inputClassName} 
                    placeholder="Например: 1.5" 
                    value={formData.weight}
                    onChange={e => setFormData({...formData, weight: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* БЛОК 3: Логистика */}
            <div className="space-y-5">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Логистика</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Store size={14} className="text-blue-500" /> Магазин
                  </label>
                  <input 
                    className={inputClassName} 
                    placeholder="Amazon, ASOS..." 
                    value={formData.shop}
                    onChange={e => setFormData({...formData, shop: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-500" /> Перевозчик
                  </label>
                  <input 
                    className={inputClassName} 
                    placeholder="USA2GE, Camex..." 
                    value={formData.carrier}
                    onChange={e => setFormData({...formData, carrier: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <User size={14} className="text-blue-500" /> Партнер (Кому)
                  </label>
                  <input 
                    className={inputClassName} 
                    placeholder="Имя получателя" 
                    value={formData.partner}
                    onChange={e => setFormData({...formData, partner: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* БЛОК 4: Даты и Заметки */}
            <div className="space-y-5">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Даты и детали</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-purple-500" /> Дата покупки
                  </label>
                  <input 
                    type="date"
                    className={inputClassName} 
                    value={formData.purchaseDate}
                    onChange={e => setFormData({...formData, purchaseDate: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <CalendarClock size={14} className="text-purple-500" /> Ожидаемая доставка
                  </label>
                  <input 
                    type="date"
                    className={inputClassName} 
                    value={formData.expectedDelivery}
                    onChange={e => setFormData({...formData, expectedDelivery: e.target.value})} 
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-slate-400" /> Комментарий
                  </label>
                  <textarea 
                    rows={3}
                    className={`${inputClassName} resize-none`} 
                    placeholder="Дополнительная информация, хрупкий груз и т.д." 
                    value={formData.comment}
                    onChange={e => setFormData({...formData, comment: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* ── КНОПКА ОТПРАВКИ ── */}
            <div className="pt-6 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-4.5 rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-indigo-200/50 disabled:opacity-60 disabled:hover:scale-100 hover:-translate-y-0.5"
                style={{ padding: '18px' }} // Чуть больше зона клика для мобильных
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <PackagePlus size={24} />}
                {loading ? 'Регистрация в системе...' : 'Добавить груз в мониторинг'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}