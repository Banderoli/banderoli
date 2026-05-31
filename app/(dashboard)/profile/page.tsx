'use client'
import { useState, useEffect } from 'react'

interface Partner { id: string; name: string; isActive: boolean; }

export default function ProfilePage() {
  const [ownerName, setOwnerName] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [newPartnerName, setNewPartnerName] = useState('')
  const [loading, setLoading] = useState(true)

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    fetchData();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
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
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  const handleUpdateOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/partners', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerName }) })
    alert('Имя владельца обновлено')
  }

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartnerName.trim()) return
    await fetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newPartnerName, isActive: true }) })
    setNewPartnerName('')
    fetchData()
  }

  const handleDeletePartner = async (id: string) => {
    if (confirm('Удалить партнера?')) {
      await fetch(`/api/partners?id=${id}`, { method: 'DELETE' })
      fetchData()
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstallable(false)
    setDeferredPrompt(null)
  }

  if (loading) return <div className="p-20 text-center text-slate-500">Загрузка профиля...</div>

  return (
    <div className="py-6 space-y-8 animate-fade-in max-w-2xl mx-auto">
      
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">👤</div>
        <h1 className="text-2xl font-black text-slate-800">Личный Кабинет</h1>
        <p className="text-slate-500 mt-2">Управление аккаунтом и партнерами для лимитов.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Владелец аккаунта</h2>
        <form onSubmit={handleUpdateOwner} className="flex gap-3">
          <input required className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" placeholder="Ваше имя" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Сохранить</button>
        </form>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Партнеры (Члены семьи)</h2>
        <form onSubmit={handleAddPartner} className="flex gap-3 mb-6">
          <input required className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" placeholder="Имя получателя" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} />
          <button type="submit" className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors">Добавить</button>
        </form>

        <div className="space-y-3">
          {partners.map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-700">{p.name}</span>
              <button onClick={() => handleDeletePartner(p.id)} className="text-rose-500 font-bold text-sm hover:underline">Удалить</button>
            </div>
          ))}
          {partners.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Нет добавленных партнеров.</p>}
        </div>
      </div>

      {isInstallable && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-lg text-white text-center relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-xl font-bold">Установить Banderoli.AI</h2>
            <p className="text-indigo-100 text-sm">Добавьте наше приложение на главный экран телефона для быстрого доступа.</p>
            <button onClick={handleInstallClick} className="mt-4 bg-white text-indigo-600 px-6 py-3 rounded-xl font-black shadow-md hover:scale-105 transition-transform">
              📱 Добавить на экран
            </button>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        </div>
      )}

    </div>
  )
}