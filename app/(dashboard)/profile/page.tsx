'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Users, 
  Smartphone, 
  Trash2, 
  Check, 
  Loader2, 
  Plus, 
  ShieldCheck 
} from 'lucide-react'

// Строгая типизация данных
interface Partner { 
  id: string; 
  name: string; 
  isActive: boolean; 
}

// Строгая типизация для PWA (заменяем any)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

export default function ProfilePage() {
  const [ownerName, setOwnerName] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  
  // Состояния загрузки
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Состояния PWA
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

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
      const res = await fetch('/api/partners')
      if (res.ok) {
        const data = await res.json()
        setOwnerName(data.ownerName || '')
        setPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
    } finally {
      setLoading(false)
    }
  }

  // Обновление владельца с красивым UI-фидбеком (без alert)
  const handleUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveStatus('saving')
    try {
      await fetch('/api/partners', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ownerName }) 
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000) // Возвращаем кнопку в исходное состояние через 3 сек
    } catch (error) {
      setSaveStatus('idle')
      console.error(error)
    }
  }

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartnerName.trim()) return
    
    setIsAdding(true)
    try {
      await fetch('/api/partners', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name: newPartnerName, isActive: true }) 
      })
      setNewPartnerName('')
      await fetchData()
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить получателя? Это не повлияет на архивные посылки.')) return
    
    setDeletingId(id)
    try {
      await fetch(`/api/partners?id=${id}`, { method: 'DELETE' })
      await fetchData()
    } finally {
      setDeletingId(null)
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstallable(false)
    setDeferredPrompt(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="font-medium">Загрузка данных профиля...</p>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-8 animate-fade-in max-w-3xl mx-auto px-4 md:px-8">
      
      {/* Заголовок профиля */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
          <User size={36} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Настройки профиля</h1>
        <p className="text-slate-500 mt-2 font-medium">Управление аккаунтом и получателями для распределения лимитов.</p>
      </div>

      {/* Блок владельца */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="text-emerald-500" size={24} />
          <h2 className="text-xl font-extrabold text-slate-800">Основной получатель</h2>
        </div>
        <form onSubmit={handleUpdateOwner} className="flex flex-col sm:flex-row gap-3">
          <input 
            required 
            className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800" 
            placeholder="Имя и Фамилия владельца" 
            value={ownerName} 
            onChange={e => setOwnerName(e.target.value)} 
          />
          <button 
            type="submit" 
            disabled={saveStatus === 'saving'}
            className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold transition-all min-w-[160px] ${
              saveStatus === 'saved' 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } disabled:opacity-70`}
          >
            {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
            {saveStatus === 'saved' && <Check size={18} />}
            {saveStatus === 'idle' && 'Сохранить'}
            {saveStatus === 'saved' && 'Сохранено'}
          </button>
        </form>
      </div>

      {/* Блок партнеров */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="text-blue-500" size={24} />
          <h2 className="text-xl font-extrabold text-slate-800">Дополнительные получатели</h2>
        </div>
        <p className="text-sm text-slate-500 font-medium mb-6">
          Добавьте членов семьи, чтобы распределять на них посылки. Это позволит легально обойти ограничение в 300 ₾ на одного человека.
        </p>
        
        <form onSubmit={handleAddPartner} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input 
            required 
            className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800" 
            placeholder="Имя получателя (например: Нина)" 
            value={newPartnerName} 
            onChange={e => setNewPartnerName(e.target.value)} 
          />
          <button 
            type="submit" 
            disabled={isAdding}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-70 min-w-[160px]"
          >
            {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Добавить
          </button>
        </form>

        {/* Список партнеров */}
        <div className="space-y-3">
          {partners.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-medium text-slate-400">У вас пока нет добавленных получателей.</p>
            </div>
          ) : (
            partners.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:border-slate-200 hover:shadow-sm">
                <span className="font-bold text-slate-700">{p.name}</span>
                <button 
                  onClick={() => handleDeletePartner(p.id)} 
                  disabled={deletingId === p.id}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Удалить получателя"
                >
                  {deletingId === p.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Блок PWA (Установка приложения) */}
      {isInstallable && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-lg text-white text-center relative overflow-hidden flex flex-col items-center">
          <div className="relative z-10 flex flex-col items-center space-y-3">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm mb-2">
              <Smartphone size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Установить Banderoli App</h2>
            <p className="text-indigo-100 text-sm font-medium max-w-sm">
              Установите наше приложение на главный экран вашего телефона для мгновенного доступа к трекам и лимитам.
            </p>
            <button 
              onClick={handleInstallClick} 
              className="mt-6 bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-black shadow-md hover:scale-105 transition-transform"
            >
              Добавить на экран
            </button>
          </div>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-400 opacity-20 rounded-full blur-3xl"></div>
        </div>
      )}

    </div>
  )
}