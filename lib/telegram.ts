// lib/telegram.ts

export async function sendTelegramAlert(message: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("⚠️ Telegram ключи не найдены в .env. Уведомление пропущено.");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: message, 
        parse_mode: 'HTML' 
      }),
    });

    if (!response.ok) {
      console.error("Ошибка Telegram API:", await response.text());
    }
  } catch (error) {
    console.error("Ошибка при отправке в Telegram:", error);
  }
}

// Добавь это в конец файла lib/telegram.ts
export async function sendTelegramToUser(chatId: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN; 
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN не задан в .env');
    return;
  }
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
  } catch (error) {
    console.error('Ошибка отправки пользователю в Telegram:', error);
  }
}