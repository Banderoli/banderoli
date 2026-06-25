// Опции подключения к Redis из URL. Передаём bullmq именно объект опций (не экземпляр
// ioredis), чтобы избежать конфликта дублированных типов ioredis между пакетами.
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

export function redisConnectionFromUrl(url: string): RedisConnectionOptions {
  const parsed = new URL(url);

  const options: RedisConnectionOptions = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    // Требование BullMQ для воркеров — отключить лимит повторов на запрос.
    maxRetriesPerRequest: null,
  };

  if (parsed.username) {
    options.username = decodeURIComponent(parsed.username);
  }
  if (parsed.password) {
    options.password = decodeURIComponent(parsed.password);
  }

  const db = parsed.pathname.replace(/^\//, '');
  if (db) {
    options.db = Number(db);
  }

  return options;
}
