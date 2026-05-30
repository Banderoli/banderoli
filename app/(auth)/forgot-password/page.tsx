'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
    })
    if (res.ok) setMessage('Письмо отправлено! Проверьте почту.')
    else setMessage('Ошибка отправки. Проверьте Email.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">Восстановление пароля</h1>
        {message && <p className="text-center text-sm font-bold text-blue-600">{message}</p>}
        <input required type="email" placeholder="Ваш Email" className="w-full p-3 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">Отправить ссылку</button>
        <div className="text-center text-sm mt-4"><Link href="/login" className="text-blue-600 hover:underline">Вернуться ко входу</Link></div>
      </form>
    </div>
  )
}