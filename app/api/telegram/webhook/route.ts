// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramToUser } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;

    // Игнорируем всё, кроме текстовых сообщений
    if (!message || !message.text || !message.chat) {
      return NextResponse.json({ ok: true }); 
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    // Если пользователь перешел по ссылке из дашборда
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      
      if (parts.length > 1) {
        const userId = parts[1]; // Достаем ID пользователя из команды /start <ID>

        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (user) {
          // Записываем Telegram ID в базу
          await prisma.user.update({
            where: { id: userId },
            data: { telegramChatId: chatId }
          });

          const welcomeText = `🎉 <b>Подключение прошло успешно!</b>\n\nПривет, ${user.name}! Ваш аккаунт <b>Banderoli</b> привязан к этому боту.\n\nТеперь сюда будут приходить уведомления о рисках задержек и таможенных лимитах.`;
          await sendTelegramToUser(chatId, welcomeText);
        } else {
          await sendTelegramToUser(chatId, `❌ <b>Ошибка:</b> Пользователь не найден. Пожалуйста, запустите бота через кнопку в личном кабинете.`);
        }
      } else {
        await sendTelegramToUser(chatId, `👋 <b>Привет!</b> Чтобы получать уведомления, перейдите в ваш личный кабинет на сайте <b>Banderoli</b> и нажмите кнопку "Подключить уведомления".`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ошибка в Telegram Webhook:', error);
    return NextResponse.json({ ok: true }); 
  }
}