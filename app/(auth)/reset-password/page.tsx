'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Компонент, содержащий всю логику работы с параметрами и формой
function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return setError('Пароли не совпадают')
    
    const res = await fetch('/api/auth/reset', {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ token, newPassword: password })
    })
    
    if (res.ok) router.push('/login')
    else setError('Ошибка или срок ссылки истек')
  }

  if (!token) return <p className="text-center mt-10">Неверная ссылка</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Новый пароль</h1>
        {error && <p className="text-center text-red-600 text-sm font-bold">{error}</p>}
        <input required type="password" placeholder="Новый пароль" className="w-full p-3 border rounded-lg" value={password} onChange={e => setPassword(e.target.value)} />
        <input required type="password" placeholder="Подтвердите пароль" className="w-full p-3 border rounded-lg" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-lg font-bold">Сохранить и войти</button>
      </form>
    </div>
  )
}

// Основной экспорт, который оборачивает контент в Suspense
export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}