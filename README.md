# CS2 Skin Analytics Service

Веб-сервис аналитики торговли скинами CS2 с интеграцией CSFloat и Market.CSGO.

## Стек

- **Frontend:** Next.js 14 + TypeScript + TailwindCSS
- **Backend:** NestJS + TypeScript + Prisma ORM
- **Database:** MySQL 8
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

---

## Деплой на продовый сервер (пошагово)

### Требования к серверу

- Docker + Docker Compose
- 1 ГБ RAM минимум
- Открытые порты: 3000 (frontend), 3001 (backend API)

### Шаг 1. Установить Docker (если ещё нет)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Перелогиниться чтобы группа применилась

# Проверить
docker --version
docker compose version
```

### Шаг 2. Клонировать репозиторий

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/cs2.git
cd cs2
```

### Шаг 3. Создать `.env` файл

```bash
cp .env.example .env
nano .env
```

Заполнить **все** значения:

```env
DATABASE_URL=mysql://root:root@mysql:3306/cs2_analytics
REDIS_HOST=redis
REDIS_PORT=6379

CSFLOAT_API_KEY=ваш_ключ_csfloat
CSFLOAT_BASE_URL=https://csfloat.com/api/v1
CSFLOAT_STEAM_ID=ваш_steam_id

MARKET_CSGO_API_KEY=ваш_ключ_market_csgo
MARKET_CSGO_BASE_URL=https://market.csgo.com

BACKEND_PORT=3001
FRONTEND_PORT=3000
```

> **Важно:** `DATABASE_URL` и `REDIS_HOST` в Docker используют имена контейнеров (`mysql`, `redis`), а не `localhost`.

### Шаг 4. Запустить всё через Docker Compose

```bash
docker compose up -d --build
```

Это запустит 4 контейнера:
- `cs2_mysql` — MySQL 8.4
- `cs2_redis` — Redis 7
- `cs2_backend` — NestJS API (порт 3001)
- `cs2_frontend` — Next.js Dashboard (порт 3000)

### Шаг 5. Проверить что всё работает

```bash
# Статус контейнеров
docker compose ps

# Логи бэкенда
docker compose logs backend -f --tail 50

# Проверить API
curl http://localhost:3001/api/analytics/summary
```

### Шаг 6. Первая синхронизация данных

```bash
# Синхронизировать CSFloat trades
curl -X POST http://localhost:3001/api/csfloat/sync/trades

# Синхронизировать Market.CSGO trades
curl -X POST http://localhost:3001/api/market-csgo/sync/trades

# Синхронизировать курс USDT→RUB
curl -X POST http://localhost:3001/api/market-csgo/sync/rate
```

После этого дашборд доступен по адресу: **http://ваш_ip:3000**

### Шаг 7. (Опционально) Настроить Nginx reverse proxy

```bash
sudo apt install nginx -y
```

Создать конфиг `/etc/nginx/sites-available/cs2`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cs2 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Обновление на сервере

```bash
cd /opt/cs2
git pull
docker compose up -d --build
```

---

## Локальная разработка (без Docker)

### 1. Настроить переменные окружения

```bash
cp .env.example backend/.env
# Заполнить API ключи, указать локальные MySQL и Redis
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

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

## Расписание автосинхронизации

| Источник | Интервал |
|----------|----------|
| CSFloat stall | каждые 3 мин |
| CSFloat trades | каждые 2 мин |
| Market.CSGO trades | каждые 2 мин |
| Market.CSGO rate | каждые 15 мин |

## Бизнес-логика

- **Inventory Value** — дедуплицированный инвентарь (по asset_id, затем name+float)
- **Purchases** — сумма buy_price из CSFloat trades (USD)
- **Sales** — сумма sell_price (Market.CSGO в RUB → конвертируется в USD по курсу)
- **Комиссия CSFloat** — 2%
- **Комиссия Market.CSGO** — 5%
- **Курс USDT→RUB** — с комиссией 3% (для вывода)
- **Profit** — `NetSell - BuyPrice`, где `NetSell = sell_price * (1 - commission)`

## Безопасность

- API ключи хранятся только в `.env` (не коммитятся)
- `.env` добавлен в `.gitignore`
