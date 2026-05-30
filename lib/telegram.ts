/**
 * Сервисный модуль для работы с Telegram Bot API.
 * Использует стандартный fetch для отправки уведомлений.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Отправляет текстовое сообщение пользователю в Telegram.
 * @param {string} chatId - Уникальный идентификатор чата пользователя в Telegram
 * @param {string} message - Текст уведомления (поддерживает HTML разметку)
 * @returns {Promise<boolean>} - Результат отправки (true, если успешно)
 */
export async function sendTelegramNotification(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Ошибка Telegram: Секретный токен TELEGRAM_BOT_TOKEN не задан в .env');
    return false;
  }

  if (!chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML', // Включает поддержку тегов <b>, <i>, <code>
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      console.error('Ошибка отправки в Telegram API:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Критическое исключение при отправке в Telegram:', error);
    return false;
  }
}