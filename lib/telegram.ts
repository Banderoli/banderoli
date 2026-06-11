// lib/telegram.ts

export async function sendTelegramToUser(chatId: string, message: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN не найден в .env.");
    return { success: false };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: message, 
        parse_mode: 'HTML' // Обязательно для красивого форматирования (жирный шрифт, списки)
      }),
    });

    if (!response.ok) {
      console.error("Ошибка Telegram API:", await response.text());
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("Ошибка сети при отправке в Telegram:", error);
    return { success: false };
  }
}