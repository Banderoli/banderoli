'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// --- 1. ОПИСАНИЕ ТИПОВ ДАННЫХ (ДЛЯ TYPESCRIPT) ---
interface UserProfile {
  name?: string;
  phone?: string;
  idDocument?: string;
}

interface Partner {
  id: string;
  name: string;
  phone?: string;
  idDocument?: string;
}

interface Carrier {
  id: string;
  name: string;
  website?: string;
}

export default function ProfilePage() {
  const router = useRouter()
  
  // --- 2. СОСТОЯНИЯ ---
  const [formData, setFormData] = useState<UserProfile>({ name: '', phone: '', idDocument: '' })
  const [partners, setPartners] = useState<Partner[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])
  
  // Состояния для Telegram
  const [telegramId, setTelegramId] = useState('')
  const [telegramMessage, setTelegramMessage] = useState({ text: '', type: '' })
  const [isTelegramSaving, setIsTelegramSaving] = useState(false)
  
  const [newCarrier, setNewCarrier] = useState({ name: '', website: '' })
  const [newPartner, setNewPartner] = useState({ name: '', phone: '', idDocument: '' })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingPartner, setIsAddingPartner] = useState(false)

  // --- 3. ЗАГРУЗКА ДАННЫХ ---
  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then(res => res.ok ? res.json() : {}) as Promise<UserProfile>,
      fetch('/api/partners').then(res => res.ok ? res.json() : { partners: [] }) as Promise<{partners: Partner[]}>,
      fetch('/api/carriers').then(res => res.ok ? res.json() : { carriers: [] }) as Promise<{carriers: Carrier[]}>,
      fetch('/api/user/telegram').then(res => res.ok ? res.json() : { telegramChatId: '' }) as Promise<{telegramChatId: string}>
    ])
      .then(([p, pt, c, t]) => {
        setFormData({ 
          name: p.name || '', 
          phone: p.phone || '', 
          idDocument: p.idDocument || '' 
        })
        setPartners(pt.partners || [])
        setCarriers(c.carriers || [])
        setTelegramId(t.telegramChatId || '')
      })
      .catch(err => console.error('Ошибка загрузки данных:', err))
      .finally(() => setIsLoading(false))
  }, [])

  // --- 4. ОБРАБОТЧИКИ СОБЫТИЙ ---
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await fetch('/api/user/profile', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) 
      })
      alert('Профиль успешно обновлен!')
    } catch (error) {
      alert('Ошибка при обновлении профиля')
    } finally {
      setIsSaving(false)
    }
  }

  // Обработчик сохранения Telegram ID
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTelegramSaving(true)
    setTelegramMessage({ text: '', type: '' })

    try {
      const res = await fetch('/api/user/telegram', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramChatId: telegramId })
      })
      
      if (res.ok) {
        setTelegramMessage({ text: 'Настройки Telegram успешно сохранены!', type: 'success' })
      } else {
        setTelegramMessage({ text: 'Ошибка при сохранении Telegram', type: 'error' })
      }
    } catch (error) {
      setTelegramMessage({ text: 'Ошибка сети', type: 'error' })
    } finally {
      setIsTelegramSaving(false)
    }
  }

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/partners', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartner) 
      })
      if (res.ok) { 
        const data = await res.json()
        setPartners([...partners, data.partner])
        setNewPartner({ name: '', phone: '', idDocument: '' })
        setIsAddingPartner(false)
      }
    } catch (error) {
      console.error('Ошибка при добавлении партнера', error)
    }
  }

  const deletePartner = async (id: string) => {
    if (!confirm('Удалить партнера?')) return
    await fetch('/api/partners', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }) 
    })
    setPartners(partners.filter(p => p.id !== id))
  }

  const addCarrier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCarrier.name) return
    try {
      const res = await fetch('/api/carriers', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCarrier) 
      })
      if (res.ok) {
        const data = await res.json()
        setCarriers([...carriers, data.carrier])
        setNewCarrier({ name: '', website: '' })
      }
    } catch (error) {
      console.error('Ошибка при добавлении службы', error)
    }
  }

  const deleteCarrier = async (id: string) => {
    if (!confirm('Удалить почтовую службу?')) return
    await fetch('/api/carriers', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }) 
    })
    setCarriers(carriers.filter(c => c.id !== id))
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Вы уверены? Это действие нельзя отменить!')) return
    await fetch('/api/user/profile', { method: 'DELETE' })
    router.push('/login')
  }

  // --- 5. ИНТЕРФЕЙС (JSX) ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 text-gray-500 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Загрузка кабинета...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      
      {/* Шапка */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-extrabold text-gray-800">Настройки профиля</h1>
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-lg">
          &larr; В панель
        </Link>
      </div>

      {/* Форма профиля */}
      <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Личные данные</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Имя и фамилия</label>
            <input className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Телефон</label>
              <input className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ID Документа</label>
              <input className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.idDocument} onChange={e => setFormData({...formData, idDocument: e.target.value})} />
            </div>
          </div>
          <button disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </section>

      {/* НАСТРОЙКИ TELEGRAM БОТА */}
      <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Уведомления Telegram</h2>
        <p className="text-sm text-gray-500 mb-6">
          Привяжите свой аккаунт Telegram, чтобы получать мгновенные предупреждения о таможенных рисках (при 60%+) и напоминания за день до прибытия посылок.
        </p>

        <form onSubmit={handleSaveTelegram} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Ваш Telegram Chat ID</label>
            <input
              type="text"
              placeholder="Например: 123456789"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2">
              💡 <b>Как узнать свой ID?</b> Найдите в Telegram бота <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">@userinfobot</a>, напишите ему /start, и он пришлет ваш уникальный номер (Id).
            </p>
          </div>

          {telegramMessage.text && (
            <div className={`p-3 rounded-xl text-sm font-bold ${telegramMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {telegramMessage.text}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isTelegramSaving}
            className="w-full bg-slate-800 text-white p-3 rounded-xl font-medium shadow-sm hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            {isTelegramSaving ? 'Сохранение...' : 'Сохранить настройки Telegram'}
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Секция: Партнеры */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Партнеры</h2>
          
          <div className="space-y-3 mb-6">
            {partners.length === 0 && <p className="text-sm text-gray-400">У вас пока нет партнеров</p>}
            {partners.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-medium text-gray-800">{p.name}</p>
                  <div className="flex gap-3 mt-1">
                    {p.phone && <p className="text-xs text-gray-500">📞 {p.phone}</p>}
                    {p.idDocument && <p className="text-xs text-gray-500">🆔 ID: {p.idDocument}</p>}
                  </div>
                </div>
                <button onClick={() => deletePartner(p.id)} className="text-sm text-red-500 hover:text-red-700 transition-colors px-2">Удалить</button>
              </div>
            ))}
          </div>

          {!isAddingPartner ? (
            <button onClick={() => setIsAddingPartner(true)} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all font-medium">
              + Добавить партнера
            </button>
          ) : (
            <form onSubmit={handleAddPartner} className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3 mt-4">
              <input required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" placeholder="Имя партнера" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} />
              <input className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" placeholder="Телефон" value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})} />
              <input className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" placeholder="Номер ID (документа)" value={newPartner.idDocument} onChange={e => setNewPartner({...newPartner, idDocument: e.target.value})} />
              
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Сохранить</button>
                <button type="button" onClick={() => setIsAddingPartner(false)} className="flex-1 bg-white text-gray-600 border p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Отмена</button>
              </div>
            </form>
          )}
        </section>

        {/* Секция: Почтовые службы */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Почтовые службы</h2>
          
          <div className="space-y-3 mb-6">
             {carriers.length === 0 && <p className="text-sm text-gray-400">Нет добавленных служб</p>}
             {carriers.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-medium text-gray-800">{c.name}</p>
                  {c.website && <p className="text-xs text-blue-500 truncate max-w-[120px]">{c.website}</p>}
                </div>
                <button onClick={() => deleteCarrier(c.id)} className="text-gray-400 hover:text-red-500 transition-colors text-lg font-bold px-2">&times;</button>
              </div>
            ))}
          </div>

          <form onSubmit={addCarrier} className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Добавить новую службу</h3>
            <input required className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all" placeholder="Название (например, DHL)" value={newCarrier.name} onChange={e => setNewCarrier({...newCarrier, name: e.target.value})} />
            <input className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all" placeholder="Сайт (необязательно)" value={newCarrier.website} onChange={e => setNewCarrier({...newCarrier, website: e.target.value})} />
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-medium p-2.5 rounded-lg transition-colors">
              + Добавить службу
            </button>
          </form>
        </section>
      </div>

      {/* Опасная зона */}
      <div className="mt-12 pt-6 border-t border-red-100 flex justify-center">
        <button onClick={handleDeleteAccount} className="text-red-500 hover:text-red-700 hover:underline text-sm font-medium transition-colors">
          Удалить аккаунт навсегда
        </button>
      </div>

    </div>
  )
}