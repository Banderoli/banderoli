# Деплой Banderoli.AI (Vercel + Neon)

Архитектура деплоя — **Vercel-native**: фронтенд `apps/web-client` (Next.js 15)
ходит **напрямую в Postgres (Neon)** через Prisma и использует движок экспозиции
как библиотеку. Отдельный NestJS-шлюз и worker для прод-деплоя **не нужны**
(остаются в репозитории для локальной разработки и полного развёртывания).

## 1. База данных (Neon)

1. Возьмите строку подключения в Neon → **Connect** → Connection string
   (для serverless используйте **pooled**-вариант, хост вида `...-pooler...`).
2. Создайте схему в облачной БД (один раз, локально):
   ```bash
   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" \
     npx prisma db push --schema=packages/database/prisma/schema.prisma
   ```

## 2. Vercel

**Add New Project** → импорт `Banderoli/banderoli`.

Settings:
- **Root Directory:** `apps/web-client`
- Build/Install команды берутся из `apps/web-client/vercel.json`
  (install и build выполняются из корня монорепо: `npm install`,
  затем `prisma generate` + `turbo build --filter=@banderoli/web-client`).

### Переменные окружения (Vercel → Settings → Environment Variables)

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | строка подключения Neon (pooled) |
| `AUTH_SECRET` | случайная строка (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | (опц.) `Banderoli_bot` — для будущего Telegram-входа |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | (опц.) для Google-входа |

> `API_GATEWAY_URL` / `API_GATEWAY_SECRET` / `TELEGRAM_BOT_TOKEN` фронту в
> Vercel-native режиме НЕ нужны (шлюз и worker не задействованы).

## 3. Что работает после деплоя

- Регистрация/вход по email+паролю (NextAuth + Prisma → Neon).
- Дашборд, посылки, экспозиция, получатели, аналитика, ИИ-функции (мок) —
  всё напрямую из Postgres.

## 4. Фоновые задачи (позже)

Трекинг-симуляция и Telegram-уведомления сейчас в worker-сервисе (локально через
`docker compose -p banderoli-stack`). На Vercel их можно добавить через **Vercel Cron**,
дёргающий серверный route обновления трекинга.

## Локальная разработка (полный стек)

```bash
docker compose -p banderoli-stack up -d
npx prisma db push --schema=packages/database/prisma/schema.prisma   # с локальным DATABASE_URL
npm run dev -w @banderoli/web-client
# (опц.) шлюз/worker для полного режима — см. apps/*/.env
```
