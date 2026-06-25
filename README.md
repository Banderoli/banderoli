# Banderoli.AI

SaaS для трекинга личных трансграничных посылок в Грузию и расчёта **таможенной экспозиции** (беспошлинный лимит 300 GEL). Приложение показывает реальную картину — где посылки, какова налоговая экспозиция, когда наступит порог — и держит пользователя честно-комплаентным. Оно **информирует о последствиях и обязанностях**, а не помогает обходить таможенный контроль.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, TailwindCSS v4 |
| Backend | NestJS 11 (API-first) |
| Очереди | BullMQ + Redis |
| СУБД/ORM | PostgreSQL + Prisma |
| Auth | NextAuth v5 — Google, Email+пароль (bcrypt), Telegram Login Widget |
| Монорепо | npm workspaces + Turborepo |
| Тесты | Vitest |

## Структура

```
apps/
  api-gateway/      NestJS API (recipients, parcels, exposure, health), JWT-guard, продюсер очередей
  worker-service/   BullMQ-консьюмер: трекинг, пересчёт экспозиции, Telegram-уведомления, планировщик
  web-client/       Next.js: дашборд, барометр экспозиции, формы, страница деталей посылки
libs/
  common/                   утилиты (Decimal→number, Redis URL, Prisma exception filter)
  customs-exposure-engine/  чистый движок Exposure Score (0–100)
  flight-intelligence/      оценка ETA (мок + интерфейс кэша)
packages/
  database/         Prisma-схема и клиент
  contracts/        Zod-схемы и типы, общие для фронта и бэка
docker-compose.yml  PostgreSQL + Redis
```

Внутренние пакеты компилируются в `dist` (`main → dist/index.js`), а `types → src/index.ts`, поэтому type-check и Next читают исходники без предварительной сборки, а рантайм — скомпилированный JS.

## Предустановки

- Node.js 20+
- Docker (для PostgreSQL и Redis)

## Запуск

```bash
# 1. Зависимости
npm install

# 2. Инфраструктура (PostgreSQL + Redis)
docker compose up -d

# 3. Схема БД + Prisma Client
npm run db:generate -w @banderoli/database
DATABASE_URL="postgresql://banderoli:banderoli_dev@localhost:5432/banderoli" \
  npx prisma db push --schema=packages/database/prisma/schema.prisma

# 4. Сборка всех пакетов (в порядке зависимостей)
npm run build

# 5. Запуск сервисов (в отдельных терминалах)
npm run start -w @banderoli/api-gateway      # http://localhost:3001/api
node apps/worker-service/dist/main.js        # фоновый воркер
npm run dev -w @banderoli/web-client         # http://localhost:3000
```

Откройте http://localhost:3000 — будет редирект на `/login`.

## Переменные окружения

Каждое приложение читает свой `.env` (`.env.local` для web). Шаблон — в [.env.example](.env.example).

| Переменная | Где | Назначение |
|---|---|---|
| `DATABASE_URL` | все | строка подключения PostgreSQL |
| `REDIS_URL` | gateway, worker | строка подключения Redis |
| `API_GATEWAY_SECRET` | gateway, web | общий секрет для подписи/проверки JWT (должен совпадать) |
| `AUTH_SECRET` | web | секрет сессий NextAuth |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | web | OAuth Google (опционально) |
| `TELEGRAM_BOT_TOKEN` | web, worker | токен бота для входа и уведомлений (опционально) |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | web | username бота для Login Widget (опционально) |

Без `TELEGRAM_BOT_TOKEN` уведомления логируются как `skipped`, кнопка Telegram скрыта. Без Google-кредов работает вход по email+паролю.

## Команды

```bash
npm run build        # сборка всех пакетов (turbo)
npm run type-check   # проверка типов
npm test             # юнит-тесты (Vitest)
npm run dev          # dev-режим всех приложений
```

## Тесты

`npm test` запускает Vitest по воркспейсу: движок экспозиции (дерево решений и комплаенс-проверки), парсер Redis-URL, проверка HMAC-подписи Telegram.

## Принцип комплаенса

Тексты алертов и UI описывают **последствия и обязанности** («вероятен НДС на совокупную стоимость», «заложите пошлину в бюджет») и **никогда не коучат обход** таможенного контроля. Фичи проходят тест легитимности: полезны ли они честному импортёру личных вещей.
