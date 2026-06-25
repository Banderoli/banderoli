import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramClient {
  private readonly logger = new Logger(TelegramClient.name);

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) {
      this.logger.warn(`TELEGRAM_BOT_TOKEN не задан — сообщение для ${chatId} не отправлено`);
      return false;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });

      if (!response.ok) {
        this.logger.error(`Telegram sendMessage failed: HTTP ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Telegram sendMessage error: ${String(error)}`);
      return false;
    }
  }
}
