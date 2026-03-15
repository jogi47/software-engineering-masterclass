# Trading App - Paper Trading Platform Plan

## 1. Project Overview

A paper trading platform that simulates stock market trading without using real money. Users can practice trading strategies, track portfolio performance, and learn market dynamics in a risk-free environment. This project focuses on real-time data handling, charting, and financial calculations.

### Core Value Proposition
- Practice stock trading with virtual money
- Real-time stock price updates
- Track portfolio performance over time
- Learn trading without financial risk

### Key Learning Outcomes
- Real-time data streaming (WebSockets)
- Financial data APIs integration
- Chart/visualization libraries
- Complex calculations (P&L, returns)
- Time-series data handling
- Responsive dashboard design

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] User authentication
- [ ] Virtual wallet with starting balance ($100,000)
- [ ] Stock search and lookup
- [ ] Real-time stock price display
- [ ] Buy/sell stock functionality
- [ ] Portfolio view with holdings
- [ ] Transaction history
- [ ] Basic price chart

### V2 Features (Nice-to-Have)
- [ ] Watchlist for favorite stocks
- [ ] Advanced charts (candlestick, indicators)
- [ ] Price alerts
- [ ] Portfolio analytics (returns, allocation)
- [ ] Leaderboard (compare with others)
- [ ] Trading competitions
- [ ] Historical performance graphs
- [ ] News feed integration
- [ ] Options/futures (simplified)
- [ ] Social features (follow traders)
- [ ] Paper trading contests

### User Stories
1. As a user, I want to search for a stock by symbol or name
2. As a user, I want to see real-time price updates
3. As a user, I want to buy stocks with my virtual balance
4. As a user, I want to sell stocks I own
5. As a user, I want to see my current portfolio value
6. As a user, I want to track my gains/losses
7. As a user, I want to view price charts
8. As a user, I want to see my transaction history

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14+ | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| TradingView Lightweight Charts | Price charts |
| OR Recharts/Chart.js | Alternative charting |
| TanStack Query | Data fetching |
| Zustand | State management |
| Socket.io Client | Real-time updates |

### Backend
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Primary API |
| Prisma | ORM |
| PostgreSQL | Database |
| Redis | Price caching, pub/sub |
| Socket.io | Real-time price streaming |

### External APIs
| API | Purpose |
|-----|---------|
| Alpha Vantage | Stock data (free tier) |
| Finnhub | Real-time quotes (free tier) |
| Polygon.io | Alternative data source |
| Yahoo Finance | Alternative (unofficial) |
| Twelve Data | Comprehensive market data |

### DevOps
| Technology | Purpose |
|------------|---------|
| Vercel | Deployment |
| Upstash Redis | Serverless Redis |
| Neon/Supabase | Hosted PostgreSQL |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Next.js Frontend                               │  │
│  │                                                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │Dashboard │ │  Trade   │ │Portfolio │ │  Charts  │ │  Watch-  │   │  │
│  │  │          │ │  Panel   │ │   View   │ │          │ │  list    │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  │         │            │                        ▲                       │  │
│  │         └────────────┼────────────────────────│───────────────────    │  │
│  │                      │ REST API               │ WebSocket              │  │
│  └──────────────────────│────────────────────────│───────────────────────┘  │
└─────────────────────────│────────────────────────│───────────────────────────┘
                          │                        │
                          ▼                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Next.js API Routes                                │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   /stocks    │  │   /trades    │  │  /portfolio  │                │  │
│  │  │  (quotes,    │  │  (buy/sell)  │  │  (holdings)  │                │  │
│  │  │   search)    │  │              │  │              │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         │                 │                  │                        │  │
│  └─────────│─────────────────│──────────────────│────────────────────────┘  │
│            │                 │                  │                            │
│            ▼                 ▼                  ▼                            │
│  ┌─────────────────┐   ┌─────────────────────────────────────┐              │
│  │   External API  │   │            PostgreSQL                │              │
│  │  (Alpha Vantage │   │  Users | Portfolios | Holdings |    │              │
│  │   / Finnhub)    │   │  Transactions | Watchlists          │              │
│  └─────────────────┘   └─────────────────────────────────────┘              │
│            │                                                                 │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                         Redis                                │            │
│  │   Price Cache | Rate Limit | WebSocket Pub/Sub              │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              │                                               │
│  ┌───────────────────────────┴───────────────────────────────────┐          │
│  │                     Price Streaming Service                    │          │
│  │   - Fetches prices from external API                          │          │
│  │   - Caches in Redis                                           │          │
│  │   - Broadcasts via Socket.io                                  │          │
│  └───────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trade Execution Flow

```
1. User clicks "Buy 10 shares of AAPL"
         │
         ▼
2. Client sends request to /api/trades
         │
         ▼
3. Server validates:
   ├── User has sufficient balance?
   ├── Market is open? (or allow after-hours)
   └── Valid stock symbol?
         │
         ▼
4. Fetch current price from cache/API
         │
         ▼
5. Calculate total cost:
   cost = shares × price + commission (optional)
         │
         ▼
6. Database transaction:
   ├── Deduct from user balance
   ├── Create/update holding record
   └── Create transaction record
         │
         ▼
7. Return success with trade confirmation
         │
         ▼
8. Client updates portfolio display
```

---

## 5. Database Design

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      User        │       │    Portfolio     │       │     Holding      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id          PK   │───┐   │ id          PK   │───┐   │ id          PK   │
│ email            │   │   │ userId      FK   │   │   │ portfolioId FK   │
│ password         │   └──▶│ name             │   └──▶│ symbol           │
│ name             │       │ balance          │       │ shares           │
│ createdAt        │       │ initialBalance   │       │ averageCost      │
└──────────────────┘       │ createdAt        │       │ createdAt        │
                           └──────────────────┘       │ updatedAt        │
                                    │                 └──────────────────┘
                                    │
                                    ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Transaction    │       │    Watchlist     │       │  WatchlistItem   │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id          PK   │       │ id          PK   │───┐   │ id          PK   │
│ portfolioId FK   │       │ userId      FK   │   │   │ watchlistId FK   │
│ symbol           │       │ name             │   └──▶│ symbol           │
│ type (BUY/SELL)  │       │ createdAt        │       │ addedAt          │
│ shares           │       └──────────────────┘       └──────────────────┘
│ price            │
│ total            │
│ createdAt        │
└──────────────────┘
```

### Prisma Schema

```prisma
model User {
  id          String      @id @default(cuid())
  email       String      @unique
  password    String
  name        String?
  portfolios  Portfolio[]
  watchlists  Watchlist[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Portfolio {
  id             String        @id @default(cuid())
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId         String
  name           String        @default("Main Portfolio")
  balance        Decimal       @db.Decimal(15, 2)  // Cash balance
  initialBalance Decimal       @db.Decimal(15, 2)  // Starting amount
  holdings       Holding[]
  transactions   Transaction[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@unique([userId, name])
}

model Holding {
  id          String    @id @default(cuid())
  portfolio   Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  portfolioId String
  symbol      String
  shares      Decimal   @db.Decimal(15, 6)
  averageCost Decimal   @db.Decimal(15, 4)  // Average purchase price
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([portfolioId, symbol])
}

model Transaction {
  id          String          @id @default(cuid())
  portfolio   Portfolio       @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  portfolioId String
  symbol      String
  type        TransactionType
  shares      Decimal         @db.Decimal(15, 6)
  price       Decimal         @db.Decimal(15, 4)  // Price per share
  total       Decimal         @db.Decimal(15, 2)  // Total amount
  createdAt   DateTime        @default(now())
}

model Watchlist {
  id        String          @id @default(cuid())
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String          @default("My Watchlist")
  items     WatchlistItem[]
  createdAt DateTime        @default(now())

  @@unique([userId, name])
}

model WatchlistItem {
  id          String    @id @default(cuid())
  watchlist   Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)
  watchlistId String
  symbol      String
  addedAt     DateTime  @default(now())

  @@unique([watchlistId, symbol])
}

enum TransactionType {
  BUY
  SELL
}
```

---

## 6. API Design

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Stocks/Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks/search?q=` | Search stocks by symbol/name |
| GET | `/api/stocks/:symbol` | Get stock details |
| GET | `/api/stocks/:symbol/quote` | Get current price |
| GET | `/api/stocks/:symbol/chart` | Get historical prices |

### Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trades` | Execute buy/sell |
| GET | `/api/trades` | Get transaction history |
| GET | `/api/trades/:id` | Get trade details |

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | Get portfolio overview |
| GET | `/api/portfolio/holdings` | Get all holdings |
| GET | `/api/portfolio/performance` | Get P&L metrics |

### Watchlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist` | Get user's watchlist |
| POST | `/api/watchlist` | Add stock to watchlist |
| DELETE | `/api/watchlist/:symbol` | Remove from watchlist |

### WebSocket Events

```typescript
// Subscribe to price updates
socket.emit('subscribe', ['AAPL', 'GOOGL', 'MSFT']);

// Receive price updates
socket.on('price', {
  symbol: 'AAPL',
  price: 175.23,
  change: 2.45,
  changePercent: 1.42,
  timestamp: 1704067200000
});

// Unsubscribe
socket.emit('unsubscribe', ['AAPL']);
```

### Trade Request/Response

```typescript
// POST /api/trades
// Request
{
  "symbol": "AAPL",
  "type": "BUY",
  "shares": 10
}

// Response
{
  "id": "tx_123",
  "symbol": "AAPL",
  "type": "BUY",
  "shares": 10,
  "price": 175.50,
  "total": 1755.00,
  "portfolioBalance": 98245.00,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 7. Frontend Structure

### Page Routes

```
/                       → Landing page
/login                  → Login
/register               → Register
/dashboard              → Main dashboard (protected)
/trade/:symbol          → Trade page for specific stock
/portfolio              → Portfolio details
/history                → Transaction history
/watchlist              → Watchlist management
/leaderboard            → Top traders (v2)
```

### Component Hierarchy

```
app/
├── layout.tsx
├── page.tsx                    # Landing
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (protected)/
│   ├── layout.tsx              # Shared layout with nav
│   ├── dashboard/page.tsx      # Main view
│   ├── trade/[symbol]/page.tsx # Trade page
│   ├── portfolio/page.tsx      # Holdings detail
│   ├── history/page.tsx        # Transactions
│   └── watchlist/page.tsx
└── api/

components/
├── dashboard/
│   ├── MarketOverview.tsx      # Market summary
│   ├── PortfolioSummary.tsx    # Quick portfolio view
│   ├── RecentTransactions.tsx
│   └── WatchlistWidget.tsx
├── trading/
│   ├── StockSearch.tsx
│   ├── StockQuote.tsx          # Real-time price display
│   ├── PriceChart.tsx          # TradingView chart
│   ├── TradeForm.tsx           # Buy/sell form
│   ├── OrderBook.tsx           # Optional
│   └── TradeConfirmation.tsx
├── portfolio/
│   ├── HoldingsList.tsx
│   ├── HoldingCard.tsx
│   ├── PortfolioChart.tsx      # Allocation pie
│   ├── PerformanceMetrics.tsx
│   └── PLDisplay.tsx
├── common/
│   ├── PriceDisplay.tsx        # Formatted price
│   ├── ChangeIndicator.tsx     # Green/red change
│   ├── StockSymbol.tsx         # Symbol badge
│   └── NumberFormatter.tsx
└── ui/
```

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | Search [______] | Portfolio: $102,450 | User   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
│  │     Portfolio Summary       │  │       Market Overview   │  │
│  │  Total Value: $102,450.00   │  │  S&P 500:  4,850 +0.5% │  │
│  │  Today's P&L: +$450 (+0.4%) │  │  NASDAQ:  15,200 +0.8% │  │
│  │  Total Return: +2.45%       │  │  DOW:     38,100 +0.3% │  │
│  └─────────────────────────────┘  └─────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Your Holdings                          │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │  │
│  │  │  Symbol  │  Shares  │   Value  │   P&L    │ Action │ │  │
│  │  ├──────────┼──────────┼──────────┼──────────┼────────┤ │  │
│  │  │  AAPL    │   50     │ $8,750   │ +$250    │ Trade  │ │  │
│  │  │  GOOGL   │   20     │ $2,800   │ -$100    │ Trade  │ │  │
│  │  │  MSFT    │   30     │ $11,250  │ +$450    │ Trade  │ │  │
│  │  └──────────┴──────────┴──────────┴──────────┴────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────┐  ┌────────────────────────────┐   │
│  │      Watchlist         │  │    Recent Transactions     │   │
│  │  NVDA  $450.25 +2.3%  │  │  BUY AAPL 10 @ $175.50    │   │
│  │  AMZN  $155.00 -0.5%  │  │  SELL TSLA 5 @ $245.00    │   │
│  │  META  $350.00 +1.2%  │  │  BUY GOOGL 8 @ $140.00    │   │
│  └────────────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Trade Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  < Back to Dashboard    AAPL - Apple Inc.                       │
├────────────────────────────────────┬────────────────────────────┤
│                                    │                            │
│         Price Chart                │      Trade Panel           │
│   ┌────────────────────────────┐  │  ┌──────────────────────┐  │
│   │                            │  │  │  $175.50             │  │
│   │      [TradingView          │  │  │  +$2.45 (+1.42%)     │  │
│   │       Candlestick          │  │  │                      │  │
│   │       Chart]               │  │  │  ○ Buy  ○ Sell       │  │
│   │                            │  │  │                      │  │
│   │                            │  │  │  Shares: [____10__]  │  │
│   │                            │  │  │                      │  │
│   └────────────────────────────┘  │  │  Est. Cost: $1,755   │  │
│                                    │  │                      │  │
│   [1D] [1W] [1M] [3M] [1Y] [ALL]  │  │  Balance: $98,245    │  │
│                                    │  │                      │  │
│   ─────────────────────────────   │  │  [  Execute Trade  ] │  │
│                                    │  │                      │  │
│   Key Stats:                       │  └──────────────────────┘  │
│   Market Cap: $2.8T               │                            │
│   P/E Ratio: 28.5                 │  Your Position:            │
│   52W High: $199.62               │  50 shares @ $170.00 avg   │
│   52W Low: $124.17                │  Value: $8,775             │
│   Volume: 52.3M                   │  P&L: +$275 (+3.2%)        │
│                                    │                            │
└────────────────────────────────────┴────────────────────────────┘
```

---

## 8. Real-Time Price Updates

### Price Streaming Service

```typescript
// lib/price-stream.ts
import { Server as SocketServer } from 'socket.io';
import Redis from 'ioredis';

const redis = new Redis();
const PRICE_CACHE_TTL = 5; // seconds

class PriceStreamService {
  private io: SocketServer;
  private subscriptions: Map<string, Set<string>> = new Map(); // symbol -> socketIds

  constructor(io: SocketServer) {
    this.io = io;
    this.startPriceUpdates();
  }

  subscribe(socketId: string, symbols: string[]) {
    symbols.forEach(symbol => {
      if (!this.subscriptions.has(symbol)) {
        this.subscriptions.set(symbol, new Set());
      }
      this.subscriptions.get(symbol)!.add(socketId);
    });
  }

  unsubscribe(socketId: string, symbols: string[]) {
    symbols.forEach(symbol => {
      this.subscriptions.get(symbol)?.delete(socketId);
    });
  }

  private async startPriceUpdates() {
    // Fetch prices every 5 seconds
    setInterval(async () => {
      const symbols = Array.from(this.subscriptions.keys());
      if (symbols.length === 0) return;

      const prices = await this.fetchPrices(symbols);

      prices.forEach(quote => {
        const sockets = this.subscriptions.get(quote.symbol);
        if (sockets?.size) {
          this.io.to([...sockets]).emit('price', quote);
        }
      });
    }, 5000);
  }

  private async fetchPrices(symbols: string[]): Promise<Quote[]> {
    // Check cache first
    const cached = await redis.mget(symbols.map(s => `price:${s}`));

    const needsFetch = symbols.filter((s, i) => !cached[i]);

    if (needsFetch.length > 0) {
      // Fetch from external API (Finnhub/Alpha Vantage)
      const freshPrices = await fetchFromExternalAPI(needsFetch);

      // Cache results
      const pipeline = redis.pipeline();
      freshPrices.forEach(p => {
        pipeline.setex(`price:${p.symbol}`, PRICE_CACHE_TTL, JSON.stringify(p));
      });
      await pipeline.exec();
    }

    // Return all prices
    return symbols.map((s, i) => {
      if (cached[i]) return JSON.parse(cached[i]);
      return freshPrices.find(p => p.symbol === s);
    });
  }
}
```

### External API Integration

```typescript
// lib/stock-api.ts

// Using Finnhub (free tier: 60 calls/minute)
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function getQuote(symbol: string) {
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
  );
  const data = await response.json();

  return {
    symbol,
    price: data.c,      // Current price
    change: data.d,     // Change
    changePercent: data.dp,
    high: data.h,       // High of the day
    low: data.l,        // Low of the day
    open: data.o,       // Open
    previousClose: data.pc,
    timestamp: Date.now()
  };
}

export async function searchStocks(query: string) {
  const response = await fetch(
    `https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_API_KEY}`
  );
  const data = await response.json();

  return data.result.map((item: any) => ({
    symbol: item.symbol,
    name: item.description,
    type: item.type
  }));
}

export async function getHistoricalData(symbol: string, resolution: string, from: number, to: number) {
  const response = await fetch(
    `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
  );
  return response.json();
}
```

---

## 9. Trading Logic

### Buy Order Execution

```typescript
// lib/trading.ts
import { prisma } from './prisma';
import { getQuote } from './stock-api';

export async function executeBuyOrder(
  userId: string,
  symbol: string,
  shares: number
) {
  // Get current price
  const quote = await getQuote(symbol);
  const price = quote.price;
  const total = shares * price;

  // Use transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // Get portfolio
    const portfolio = await tx.portfolio.findFirst({
      where: { userId },
      include: { holdings: { where: { symbol } } }
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // Check balance
    if (portfolio.balance.toNumber() < total) {
      throw new Error('Insufficient balance');
    }

    // Update balance
    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { balance: { decrement: total } }
    });

    // Update or create holding
    const existingHolding = portfolio.holdings[0];

    if (existingHolding) {
      // Calculate new average cost
      const currentShares = existingHolding.shares.toNumber();
      const currentCost = existingHolding.averageCost.toNumber();
      const totalCostBasis = (currentShares * currentCost) + total;
      const newShares = currentShares + shares;
      const newAvgCost = totalCostBasis / newShares;

      await tx.holding.update({
        where: { id: existingHolding.id },
        data: {
          shares: newShares,
          averageCost: newAvgCost
        }
      });
    } else {
      await tx.holding.create({
        data: {
          portfolioId: portfolio.id,
          symbol,
          shares,
          averageCost: price
        }
      });
    }

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        portfolioId: portfolio.id,
        symbol,
        type: 'BUY',
        shares,
        price,
        total
      }
    });

    return {
      transaction,
      executedPrice: price,
      newBalance: portfolio.balance.toNumber() - total
    };
  });
}
```

### Portfolio Calculations

```typescript
// lib/portfolio.ts
export async function getPortfolioWithValues(userId: string) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { userId },
    include: { holdings: true }
  });

  if (!portfolio || portfolio.holdings.length === 0) {
    return {
      ...portfolio,
      holdings: [],
      totalValue: portfolio?.balance.toNumber() || 0,
      totalPL: 0,
      totalPLPercent: 0
    };
  }

  // Fetch current prices for all holdings
  const symbols = portfolio.holdings.map(h => h.symbol);
  const quotes = await getQuotes(symbols);

  const holdingsWithValues = portfolio.holdings.map(holding => {
    const quote = quotes.find(q => q.symbol === holding.symbol);
    const currentPrice = quote?.price || 0;
    const shares = holding.shares.toNumber();
    const avgCost = holding.averageCost.toNumber();

    const marketValue = shares * currentPrice;
    const costBasis = shares * avgCost;
    const pl = marketValue - costBasis;
    const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;

    return {
      ...holding,
      currentPrice,
      marketValue,
      costBasis,
      pl,
      plPercent
    };
  });

  const totalMarketValue = holdingsWithValues.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCostBasis = holdingsWithValues.reduce((sum, h) => sum + h.costBasis, 0);
  const totalValue = totalMarketValue + portfolio.balance.toNumber();
  const totalPL = totalMarketValue - totalCostBasis;
  const totalPLPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

  return {
    ...portfolio,
    holdings: holdingsWithValues,
    totalValue,
    totalPL,
    totalPLPercent
  };
}
```

---

## 10. Implementation Phases

### Phase 1: Project Setup
1. Initialize Next.js with TypeScript and Tailwind
2. Set up Prisma with PostgreSQL
3. Create database schema
4. Set up authentication
5. Create basic layout and navigation
6. Set up UI component library

### Phase 2: Stock Data Integration
1. Set up external API integration (Finnhub/Alpha Vantage)
2. Create stock search functionality
3. Build stock quote display component
4. Set up Redis for price caching
5. Create historical data endpoint
6. Integrate charting library (TradingView)

### Phase 3: Trading Core
1. Build trade form component
2. Implement buy order API
3. Implement sell order API
4. Create portfolio model and API
5. Build holdings list component
6. Add transaction history

### Phase 4: Portfolio Features
1. Create portfolio summary component
2. Add P&L calculations
3. Build performance metrics
4. Create portfolio allocation chart
5. Add total returns tracking

### Phase 5: Real-Time Updates
1. Set up Socket.io server
2. Implement price streaming service
3. Create client-side price subscription
4. Update components for real-time prices
5. Add live portfolio value updates

### Phase 6: Polish & Features
1. Create watchlist functionality
2. Add stock details page
3. Improve chart features
4. Mobile responsiveness
5. Error handling and validation
6. Loading states

### Phase 7: Deployment
1. Set up Vercel deployment
2. Configure production database
3. Set up Upstash Redis
4. Configure API rate limiting
5. Add monitoring

---

## 11. Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | HTML/CSS | Dashboard layouts, responsive design |
| 2 | JS Basics | Calculations, event handling |
| 3 | JS Architecture | State management patterns |
| 4 | Async JS | API calls, real-time updates |
| 5 | Node vs Browser | Price streaming server-side |
| 6 | HTTP and Express | REST APIs |
| 7 | Databases and Mongo | - |
| 8 | Postgres + Prisma | All data storage |
| 9 | TypeScript | Full type safety |
| 10 | Turborepo | - |
| 11 | BunJS | - |
| 12 | React | UI components, hooks |
| 13 | Tailwind | Styling |
| 14 | NextJS | Full-stack framework |
| 15 | Websockets | Real-time price updates |
| 16 | Queues/Pubsubs | Redis pub/sub for prices |

---

## 12. Folder Structure

```
trading-app/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (protected)/
│   │   │   ├── dashboard/
│   │   │   ├── trade/[symbol]/
│   │   │   ├── portfolio/
│   │   │   ├── history/
│   │   │   └── watchlist/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── stocks/
│   │   │   ├── trades/
│   │   │   ├── portfolio/
│   │   │   └── watchlist/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   ├── trading/
│   │   ├── portfolio/
│   │   └── ui/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── stock-api.ts
│   │   ├── trading.ts
│   │   ├── portfolio.ts
│   │   └── price-stream.ts
│   ├── hooks/
│   │   ├── useQuote.ts
│   │   ├── usePortfolio.ts
│   │   └── usePriceStream.ts
│   ├── stores/
│   │   └── trading.ts
│   └── types/
├── public/
├── .env
└── package.json
```

---

## 13. Development Commands

```bash
# Create project
npx create-next-app@latest trading-app --typescript --tailwind --eslint --app

# Install dependencies
npm install prisma @prisma/client ioredis socket.io socket.io-client
npm install @tanstack/react-query zustand
npm install lightweight-charts  # TradingView charts
npm install decimal.js  # Precise decimal math
npm install -D @types/decimal.js

# Initialize Prisma
npx prisma init

# Run development
npm run dev

# Build
npm run build
```

---

## 14. API Rate Limiting Considerations

Most free stock APIs have rate limits:
- **Finnhub**: 60 calls/minute
- **Alpha Vantage**: 5 calls/minute (free), 75 calls/minute (premium)
- **Twelve Data**: 8 calls/minute (free)

### Strategies:
1. **Cache aggressively**: Store prices in Redis for 5-15 seconds
2. **Batch requests**: Fetch multiple symbols in one call when possible
3. **Prioritize**: Only fetch prices for subscribed symbols
4. **Rate limit clients**: Limit how often users can refresh

---

## Summary

The Paper Trading App is an excellent project for learning real-time web development and financial concepts. Start with basic buy/sell functionality and static prices, then add real-time features progressively. Focus on accuracy in financial calculations using proper decimal handling.

**Estimated Complexity**: Intermediate-Advanced
**Core Skills**: Real-time Data, WebSockets, Financial Calculations, Charts
**Unique Challenge**: Reliable real-time price streaming with API rate limits
