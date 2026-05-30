'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '', idDocument: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают! Пожалуйста, проверьте ввод.')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...dataToSend } = formData
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || 'Ошибка при регистрации')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Создать аккаунт Banderoli</h1>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Имя и Фамилия</label>
            <input required type="text" placeholder="Иван Петров" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input required type="email" placeholder="ivan@example.com" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Телефон</label>
              <input required type="tel" placeholder="+995..." className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Личный номер</label>
              <input required type="text" placeholder="11 цифр" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.idDocument} onChange={(e) => setFormData({...formData, idDocument: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Пароль</label>
              <input required type="password" placeholder="Пароль" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Подтвердите</label>
              <input required type="password" placeholder="Еще раз" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2">
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Уже есть аккаунт? <Link href="/login" className="text-blue-600 hover:underline font-bold">Войти</Link>
        </p>
      </div>
    </div>
  )
}