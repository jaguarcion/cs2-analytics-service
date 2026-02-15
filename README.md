# CS2 Skin Analytics Service

Веб-сервис аналитики торговли скинами CS2 с интеграцией CSFloat и Market.CSGO.

## Стек

- **Frontend:** Next.js 14 + TypeScript + TailwindCSS
- **Backend:** NestJS + TypeScript + Prisma ORM
- **Database:** PostgreSQL
- **Queue:** Redis + BullMQ
- **Containerization:** Docker Compose

## Структура проекта

```
cs2/
├── backend/                 # NestJS API
│   ├── prisma/              # Prisma schema & migrations
│   └── src/
│       ├── analytics/       # Аналитика: summary, purchases, sales, profit
│       ├── collectors/
│       │   ├── csfloat/     # Collector CSFloat (stall + trades)
│       │   └── market-csgo/ # Collector Market.CSGO (trades + rate)
│       ├── matcher/         # Дедупликация и матчинг buy↔sell
│       ├── normalizer/      # Нормализация имён, wear, float
│       ├── prisma/          # Prisma service
│       └── sync/            # BullMQ очереди + cron-расписание
├── frontend/                # Next.js Dashboard
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # UI компоненты
│       └── lib/             # API client, утилиты
├── docker-compose.yml
├── .env.example
└── README.md
```

## Быстрый старт

### 1. Клонировать и настроить переменные окружения

```bash
cp .env.example .env
# Заполнить API ключи в .env:
# - CSFLOAT_API_KEY
# - MARKET_CSGO_API_KEY
```

### 2. Запуск через Docker Compose (рекомендуется)

```bash
docker-compose up -d
```

Сервисы:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 3. Запуск вручную (для разработки)

#### Инфраструктура (PostgreSQL + Redis)

```bash
docker-compose up -d postgres redis
```

#### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Analytics

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/analytics/summary` | Сводка: inventory, purchases, sales, profit, fx rate |
| GET | `/api/analytics/purchases` | Список покупок |
| GET | `/api/analytics/sales` | Список продаж |
| GET | `/api/analytics/profit` | Сматченные сделки с расчётом профита |
| GET | `/api/analytics/sync-status` | Статус последних синхронизаций |

**Query параметры:** `period` (week/month/3months), `platform` (ALL/CSFLOAT/MARKET_CSGO), `from`, `to`

### Sync (ручной запуск)

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/csfloat/sync/stall` | Синхронизация CSFloat stall |
| POST | `/api/csfloat/sync/trades` | Синхронизация CSFloat trades |
| POST | `/api/market-csgo/sync/trades` | Синхронизация Market.CSGO trades |
| POST | `/api/market-csgo/sync/rate` | Синхронизация курса USDT→RUB |

## Расписание синхронизации

| Источник | Интервал |
|----------|----------|
| CSFloat stall | каждые 3 мин |
| CSFloat trades | каждые 2 мин |
| Market.CSGO trades | каждые 2 мин |
| Market.CSGO rate | каждые 15 мин |

## Бизнес-логика

- **Inventory Value** — дедуплицированный инвентарь (по asset_id, затем name+float)
- **Purchases (Spent)** — сумма buy_price из CSFloat trades
- **Sales Volume** — сумма sell_price из Market.CSGO
- **Profit** — `NetSell - BuyPrice`, где `NetSell = sell_price * (1 - 0.06)`
- **Profit%** — `Profit / BuyPrice * 100`

## Безопасность

- API ключи хранятся только в `.env` (не коммитятся)
- Токены маскируются в логах
