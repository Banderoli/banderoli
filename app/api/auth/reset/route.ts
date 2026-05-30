import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// import nodemailer from 'nodemailer' // Пока отключаем почтальона
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const user = await prisma.user.findUnique({ where: { email } })
    
    // В целях безопасности лучше всегда возвращать success: true, 
    // чтобы хакеры не могли перебирать email-адреса.
    if (!user) {
      return NextResponse.json({ success: true })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry }
    })

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${resetToken}`
    
    // ========================================================
    // ТРЮК ДЛЯ РАЗРАБОТКИ: Вместо реального письма выводим ссылку в терминал
    console.log('\n=========================================');
    console.log('🚨 ЗАПРОС НА СБРОС ПАРОЛЯ!');
    console.log(`📧 Для пользователя: ${email}`);
    console.log(`🔗 ПЕРЕЙДИТЕ ПО ЭТОЙ ССЫЛКЕ ДЛЯ СБРОСА:`);
    console.log(resetUrl);
    console.log('=========================================\n');
    // ========================================================

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ошибка отправки:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()
    
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }
    })

    if (!user) return NextResponse.json({ error: 'Ссылка недействительна или просрочена' }, { status: 400 })

    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword, resetToken: null, resetTokenExpiry: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}