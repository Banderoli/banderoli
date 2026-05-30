'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ProfilePage() {
  const [formData, setFormData] = useState({ name: '', phone: '', idDocument: '' })
  const [partners, setPartners] = useState<any[]>([])
  const [carriers, setCarriers] = useState<any[]>([])
  const [newCarrier, setNewCarrier] = useState({ name: '', website: '' })
  const [newPartner, setNewPartner] = useState({ name: '', phone: '', idDocument: '' })
  const [isAddingPartner, setIsAddingPartner] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then(res => res.json()),
      fetch('/api/partners').then(res => res.json()),
      fetch('/api/carriers').then(res => res.json())
    ]).then(([p, pt, c]) => {
      setFormData({ name: p.name || '', phone: p.phone || '', idDocument: p.idDocument || '' })
      setPartners(pt.partners || [])
      setCarriers(c.carriers || [])
    })
  }, [])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(formData) })
    alert('Профиль обновлен')
  }

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/partners', { method: 'POST', body: JSON.stringify(newPartner) })
    if (res.ok) { 
        const data = await res.json()
        setPartners([...partners, data.partner])
        setIsAddingPartner(false)
    }
  }

  const deletePartner = async (id: string) => {
    await fetch('/api/partners', { method: 'DELETE', body: JSON.stringify({ id }) })
    setPartners(partners.filter(p => p.id !== id))
  }

  const addCarrier = async () => {
    const res = await fetch('/api/carriers', { method: 'POST', body: JSON.stringify(newCarrier) })
    if (res.ok) {
        const data = await res.json()
        setCarriers([...carriers, data.carrier])
        setNewCarrier({ name: '', website: '' })
    }
  }

  const deleteCarrier = async (id: string) => {
    await fetch('/api/carriers', { method: 'DELETE', body: JSON.stringify({ id }) })
    setCarriers(carriers.filter(c => c.id !== id))
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Профиль</h1><Link href="/dashboard">Назад</Link></div>

      <form onSubmit={handleProfileSubmit} className="bg-white p-6 rounded-xl border space-y-4">
        <input className="w-full p-2 border rounded" placeholder="Имя" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input className="w-full p-2 border rounded" placeholder="Телефон" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        <input className="w-full p-2 border rounded" placeholder="ID Документа" value={formData.idDocument} onChange={e => setFormData({...formData, idDocument: e.target.value})} />
        <button className="w-full bg-blue-600 text-white p-2 rounded">Сохранить профиль</button>
      </form>

      <div className="bg-white p-6 rounded-xl border space-y-4">
        <h2 className="font-bold">Партнеры</h2>
        {partners.map(p => <div key={p.id} className="flex justify-between">{p.name} <button onClick={() => deletePartner(p.id)} className="text-red-500">Удалить</button></div>)}
        <button onClick={() => setIsAddingPartner(true)} className="text-blue-600">+ Добавить партнера</button>
      </div>

      <div className="bg-white p-6 rounded-xl border space-y-4">
        <h2 className="font-bold">Почтовые службы</h2>
        <input className="border p-2 rounded w-full" placeholder="Название" value={newCarrier.name} onChange={e => setNewCarrier({...newCarrier, name: e.target.value})} />
        <input className="border p-2 rounded w-full" placeholder="Сайт" value={newCarrier.website} onChange={e => setNewCarrier({...newCarrier, website: e.target.value})} />
        <button onClick={addCarrier} className="bg-green-600 text-white w-full p-2 rounded">Добавить службу</button>
        {carriers.map(c => <div key={c.id} className="flex justify-between">{c.name} ({c.website}) <button onClick={() => deleteCarrier(c.id)} className="text-red-500">x</button></div>)}
      </div>

      <button onClick={async () => { await fetch('/api/user/profile', {method: 'DELETE'}); window.location.href='/login' }} className="text-red-600 font-bold">Удалить аккаунт навсегда</button>
    </div>
  )
}