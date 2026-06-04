'use client'

import { useState, useEffect } from 'react'
import { 
  User, Users, Smartphone, Trash2, Check, Loader2, Plus, 
  ShieldCheck, Phone, Send, CreditCard, Mail, Edit2, Save, XCircle, Truck // <-- Добавлен Truck
} from 'lucide-react'

// ── СТРОГАЯ ТИПИЗАЦИЯ ─────────────────────────────────────────
interface OwnerProfile {
  name: string;
  phone: string;
  telegram: string;
  documentId: string;
}

interface Partner { 
  id: string; 
  name: string; 
  phone: string | null;
  email: string | null;
  documentId: string | null;
  isActive: boolean; 
}

// 🔥 НОВОЕ: Тип для перевозчика
interface Carrier {
  id: string;
  name: string;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

export default function ProfilePage() {
  // Состояние основного получателя
  const [owner, setOwner] = useState<OwnerProfile>({ name: '', phone: '', telegram: '', documentId: '' })
  
  // Состояние дополнительных получателей
  const [partners, setPartners] = useState<Partner[]>([])
  const [newPartner, setNewPartner] = useState({ name: '', phone: '', email: '', documentId: '' })
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  
  // 🔥 НОВОЕ: Состояние перевозчиков
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [newCarrierName, setNewCarrierName] = useState('')
  const [isAddingCarrier, setIsAddingCarrier] = useState(false)

  // Состояния UI
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isAdding, setIsAdding] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Состояния PWA
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  // ── ЗАГРУЗКА ДАННЫХ ─────────────────────────────────────────
  useEffect(() => {
    fetchData();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const fetchData = async () => {
    try {
      // 🔥 Загружаем и партнеров, и перевозчиков параллельно
      const [resPartners, resCarriers] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/carriers').catch(() => null) 
      ])

      if (resPartners.ok) {
        const data = await resPartners.json()
        setOwner({
          name: data.ownerName || '',
          phone: data.ownerPhone || '',
          telegram: data.ownerTelegram || '',
          documentId: data.ownerDocumentId || ''
        })
        setPartners(data.partners || [])
      }

      if (resCarriers && resCarriers.ok) {
        const cData = await resCarriers.json()
        setCarriers(cData.carriers || [])
      }

    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── ОБРАБОТЧИКИ (ОСНОВНОЙ ПОЛУЧАТЕЛЬ) ──────────────────────
  const handleUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveStatus('saving')
    try {
      await fetch('/api/partners', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          ownerName: owner.name,
          ownerPhone: owner.phone,
          ownerTelegram: owner.telegram,
          ownerDocumentId: owner.documentId
        }) 
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('idle')
    }
  }

  // ── ОБРАБОТЧИКИ (ПАРТНЕРЫ) ─────────────────────────────────
  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartner.name.trim()) return
    
    setIsAdding(true)
    try {
      await fetch('/api/partners', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newPartner) 
      })
      setNewPartner({ name: '', phone: '', email: '', documentId: '' })
      await fetchData()
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPartner) return
    setProcessingId(editingPartner.id)
    try {
      await fetch(`/api/partners/${editingPartner.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(editingPartner) 
      })
      setEditingPartner(null)
      await fetchData()
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm('Удалить получателя? Это действие необратимо.')) return
    setProcessingId(id)
    try {
      await fetch(`/api/partners/${id}`, { method: 'DELETE' })
      setPartners(prev => prev.filter(p => p.id !== id))
    } finally {
      setProcessingId(null)
    }
  }

  // ── 🔥 ОБРАБОТЧИКИ (ПЕРЕВОЗЧИКИ) 🔥 ──────────────────────────
  const handleAddCarrier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCarrierName.trim()) return
    
    setIsAddingCarrier(true)
    try {
      await fetch('/api/carriers', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name: newCarrierName.trim() }) 
      })
      setNewCarrierName('')
      await fetchData()
    } finally {
      setIsAddingCarrier(false)
    }
  }

  const handleDeleteCarrier = async (id: string) => {
    if (!window.confirm('Удалить эту транспортную компанию?')) return
    try {
      await fetch(`/api/carriers/${id}`, { method: 'DELETE' })
      setCarriers(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // ── PWA ───────────────────────────────────────────────────
  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstallable(false)
    setDeferredPrompt(null)
  }

  const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-400 outline-none"

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Синхронизация профиля...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        input, textarea, select {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
          opacity: 1 !important;
        }
        input::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
        }
        .text-fix {
          color: #0f172a !important;
          -webkit-text-fill-color: #0f172a !important;
        }
      `}</style>

      <div className="py-6 space-y-8 animate-fade-in max-w-4xl mx-auto px-4 md:px-8 min-h-screen bg-slate-50/50">
        
        {/* Шапка */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center mb-4 shadow-md">
            <User size={36} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight text-fix">Настройки профиля</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-lg">
            Управление таможенными получателями и логистикой. Актуальные данные ускоряют процесс работы с посылками.
          </p>
        </div>

        {/* 1. ОСНОВНОЙ ПОЛУЧАТЕЛЬ */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 text-fix">Основной получатель</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Владелец аккаунта</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdateOwner} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5"><User size={14} className="text-indigo-500" /> Имя и Фамилия</label>
                <input required className={inputClass} placeholder="Giorgi Beridze" value={owner.name || ''} onChange={e => setOwner({ ...owner, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5"><CreditCard size={14} className="text-indigo-500" /> Номер документа (ID)</label>
                <input required className={inputClass} placeholder="01011012345" value={owner.documentId || ''} onChange={e => setOwner({ ...owner, documentId: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Phone size={14} className="text-emerald-500" /> Телефон</label>
                <input required type="tel" className={inputClass} placeholder="+995 555 123 456" value={owner.phone || ''} onChange={e => setOwner({ ...owner, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Send size={14} className="text-blue-500" /> Telegram (Username)</label>
                <input className={inputClass} placeholder="@username" value={owner.telegram || ''} onChange={e => setOwner({ ...owner, telegram: e.target.value })} />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" disabled={saveStatus === 'saving'} className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black transition-all shadow-md w-full md:w-auto ${saveStatus === 'saved' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'} disabled:opacity-70`}>
                {saveStatus === 'saving' && <Loader2 size={20} className="animate-spin" />}
                {saveStatus === 'saved' && <Check size={20} />}
                {saveStatus === 'idle' && 'Сохранить профиль'}
                {saveStatus === 'saved' && 'Успешно сохранено'}
              </button>
            </div>
          </form>
        </div>

        {/* 2. ДОПОЛНИТЕЛЬНЫЕ ПОЛУЧАТЕЛИ */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 text-fix">Доп. получатели</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Разделение лимитов</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            Добавьте членов семьи или друзей для распределения таможенного лимита.
          </p>
          
          <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 mb-8">
            <h3 className="text-sm font-black text-slate-800 mb-4 text-fix flex items-center gap-2"><Plus size={16} className="text-indigo-500"/> Добавить нового получателя</h3>
            <form onSubmit={handleAddPartner} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required className={inputClass} placeholder="Имя и Фамилия" value={newPartner.name || ''} onChange={e => setNewPartner({ ...newPartner, name: e.target.value })} />
                <input className={inputClass} placeholder="Номер документа (ID)" value={newPartner.documentId || ''} onChange={e => setNewPartner({ ...newPartner, documentId: e.target.value })} />
                <input type="tel" className={inputClass} placeholder="Телефон" value={newPartner.phone || ''} onChange={e => setNewPartner({ ...newPartner, phone: e.target.value })} />
                <input type="email" className={inputClass} placeholder="Email" value={newPartner.email || ''} onChange={e => setNewPartner({ ...newPartner, email: e.target.value })} />
              </div>
              <button type="submit" disabled={isAdding} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-xl font-black hover:bg-slate-800 transition-colors shadow-md">
                {isAdding ? <Loader2 size={18} className="animate-spin" /> : 'Добавить в систему'}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {partners.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-400">У вас пока нет дополнительных получателей.</p>
              </div>
            ) : (
              partners.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-indigo-200 hover:shadow-md">
                  {editingPartner?.id === p.id ? (
                    <form onSubmit={handleUpdatePartner} className="p-5 bg-indigo-50/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input required className={inputClass} placeholder="Имя и Фамилия" value={editingPartner.name || ''} onChange={e => setEditingPartner({ ...editingPartner, name: e.target.value })} />
                        <input className={inputClass} placeholder="ID Документа" value={editingPartner.documentId || ''} onChange={e => setEditingPartner({ ...editingPartner, documentId: e.target.value })} />
                        <input className={inputClass} placeholder="Телефон" value={editingPartner.phone || ''} onChange={e => setEditingPartner({ ...editingPartner, phone: e.target.value })} />
                        <input className={inputClass} placeholder="Email" value={editingPartner.email || ''} onChange={e => setEditingPartner({ ...editingPartner, email: e.target.value })} />
                      </div>
                      <div className="flex gap-3 justify-end border-t border-indigo-100 pt-4">
                        <button type="button" onClick={() => setEditingPartner(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Отмена</button>
                        <button type="submit" disabled={processingId === p.id} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm">
                          {processingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Сохранить
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 w-full">
                        <div className="font-extrabold text-slate-900 text-lg text-fix md:col-span-2 mb-1">{p.name}</div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><CreditCard size={14} className="text-slate-400"/> ID: <span className="font-mono text-xs bg-slate-100 px-1.5 rounded">{p.documentId || 'Не указан'}</span></div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Phone size={14} className="text-slate-400"/> {p.phone || 'Не указан'}</div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 md:col-span-2"><Mail size={14} className="text-slate-400"/> {p.email || 'Нет email'}</div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 border-slate-100">
                        <button onClick={() => setEditingPartner(p)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl bg-slate-50"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeletePartner(p.id)} disabled={processingId === p.id} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl bg-slate-50 disabled:opacity-50">
                          {processingId === p.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. 🔥 НОВОЕ: ПЕРЕВОЗЧИКИ (ФОРВАРДЕРЫ) 🔥 */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl"><Truck size={24} /></div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 text-fix">Транспортные компании</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Службы доставки</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            Добавьте компании-форвардеры (USA2GE, Camex, Inex и т.д.), чтобы быстро выбирать их при добавлении новых посылок.
          </p>

          <form onSubmit={handleAddCarrier} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input 
              required 
              className={inputClass} 
              placeholder="Название компании (например: USA2GE)" 
              value={newCarrierName} 
              onChange={e => setNewCarrierName(e.target.value)} 
            />
            <button type="submit" disabled={isAddingCarrier} className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl font-black hover:bg-slate-800 transition-colors disabled:opacity-70 shadow-sm sm:w-auto w-full">
              {isAddingCarrier ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Добавить</>}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {carriers.length === 0 ? (
              <div className="col-span-full text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400">Нет добавленных перевозчиков.</p>
              </div>
            ) : (
              carriers.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                  <span className="font-extrabold text-slate-800 text-fix">{c.name}</span>
                  <button type="button" onClick={() => handleDeleteCarrier(c.id)} className="text-slate-300 hover:text-rose-500 transition-colors" title="Удалить">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. PWA */}
        {isInstallable && (
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-lg text-white text-center relative overflow-hidden flex flex-col items-center">
            <div className="relative z-10 flex flex-col items-center space-y-3">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm mb-2 shadow-inner"><Smartphone size={32} className="text-white" /></div>
              <h2 className="text-xl font-extrabold tracking-tight">Установить Banderoli App</h2>
              <button onClick={handleInstallClick} className="mt-6 bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-black shadow-md hover:scale-105 active:scale-95 transition-transform">Добавить на экран</button>
            </div>
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-400 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        )}

      </div>
    </>
  )
}