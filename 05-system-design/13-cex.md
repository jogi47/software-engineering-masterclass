# CEX - Centralized Exchange Backend

Build a full centralized exchange backend with order matching engine, custody system, and blockchain integration.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features & Requirements](#features--requirements)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Database Design](#database-design)
6. [Core Implementation](#core-implementation)
7. [Order Matching Engine](#order-matching-engine)
8. [Wallet & Custody System](#wallet--custody-system)
9. [API Design](#api-design)
10. [Testing](#testing)
11. [Implementation Phases](#implementation-phases)
12. [Concepts Covered](#concepts-covered)
13. [Folder Structure](#folder-structure)
14. [Development Commands](#development-commands)

---

## Project Overview

### What is a CEX?

A **Centralized Exchange (CEX)** is a traditional cryptocurrency exchange where:
- Users deposit funds into exchange-controlled wallets
- Trades happen off-chain in an internal order book
- The exchange is custodial (holds user funds)
- Faster execution and lower fees than DEXs
- Requires KYC/AML compliance

### CEX vs DEX

| Aspect | CEX | DEX |
|--------|-----|-----|
| Custody | Exchange holds funds | User holds funds |
| Speed | Milliseconds | Block time (400ms-12s) |
| Fees | Lower (no gas) | Higher (gas + protocol) |
| Liquidity | Usually deeper | Fragmented |
| Privacy | KYC required | Pseudonymous |
| Counterparty Risk | Exchange failure | Smart contract bugs |

### Core Components

1. **Order Matching Engine**: Matches buy/sell orders (FIFO, price-time priority)
2. **Wallet System**: Hot/cold wallet management, deposits, withdrawals
3. **Balance Ledger**: Internal accounting of user balances
4. **API Gateway**: REST/WebSocket APIs for trading
5. **Risk Engine**: Position limits, circuit breakers

### Learning Outcomes

After building this project, you will understand:
- Order book data structures and matching algorithms
- Price-time priority (FIFO) matching
- Hot/cold wallet architecture
- Deposit detection via blockchain listeners
- Event sourcing for financial systems
- High-performance system design
- Custody and security best practices

---

## Features & Requirements

### MVP Features

| Feature | Description |
|---------|-------------|
| User Registration | Account creation with email verification |
| Deposits | Detect on-chain deposits, credit user balance |
| Withdrawals | Process withdrawal requests through hot wallet |
| Order Book | Limit and market orders |
| Matching Engine | Price-time priority order matching |
| Trade History | Historical trades with P&L |
| WebSocket Feeds | Real-time order book and trades |

### V2 Features (Future)

| Feature | Description |
|---------|-------------|
| Stop Orders | Stop-loss and take-profit orders |
| Margin Trading | Leveraged positions with liquidation |
| Maker/Taker Fees | Tiered fee structure |
| Multi-sig Custody | Threshold signatures for withdrawals |
| Admin Dashboard | Risk management, circuit breakers |

---

## Tech Stack

### Backend Services

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Go / Rust | High-performance backend |
| API Framework | Gin / Axum | REST API endpoints |
| WebSocket | gorilla/websocket | Real-time feeds |
| Database | PostgreSQL | User data, orders, trades |
| Cache | Redis | Order book, sessions, rate limiting |
| Message Queue | Kafka / NATS | Event streaming |

### Blockchain Integration

| Component | Technology | Purpose |
|-----------|------------|---------|
| Solana RPC | @solana/web3.js | Blockchain queries |
| Deposit Listener | WebSocket subscription | Detect incoming deposits |
| Hot Wallet | Ed25519 keypair | Automated withdrawals |
| Cold Wallet | Hardware wallet | Bulk fund storage |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Container | Docker | Service isolation |
| Orchestration | Kubernetes | Scaling, deployment |
| Monitoring | Prometheus + Grafana | Metrics, alerting |
| Logging | ELK Stack | Centralized logs |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Clients                                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │ Web App  │    │ Mobile   │    │ Trading  │    │ Market   │     │
│   │          │    │ App      │    │ Bots     │    │ Makers   │     │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘     │
└────────┼───────────────┼───────────────┼───────────────┼────────────┘
         │               │               │               │
         └───────────────┴───────┬───────┴───────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────┐
│                         API Gateway                                  │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │  Load Balancer (nginx/HAProxy)                           │    │
│    │  Rate Limiting │ Authentication │ Request Routing        │    │
│    └──────────────────────────────────────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│   REST API      │   │   WebSocket     │   │   Admin API             │
│   Service       │   │   Service       │   │   Service               │
│                 │   │                 │   │                         │
│ • Orders        │   │ • Order Book    │   │ • Risk Management       │
│ • Balances      │   │ • Trades        │   │ • User Management       │
│ • History       │   │ • Tickers       │   │ • Wallet Operations     │
└────────┬────────┘   └────────┬────────┘   └────────────┬────────────┘
         │                     │                         │
         └─────────────────────┼─────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Message Queue (Kafka/NATS)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ orders      │  │ trades      │  │ balances    │  │ deposits   │ │
│  │ topic       │  │ topic       │  │ topic       │  │ topic      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│  Matching       │   │  Balance        │   │   Wallet                │
│  Engine         │   │  Service        │   │   Service               │
│                 │   │                 │   │                         │
│ • Order Book    │   │ • Ledger        │   │ • Hot Wallet            │
│ • Price-Time    │   │ • Reserves      │   │ • Deposit Listener      │
│ • Partial Fills │   │ • Settlements   │   │ • Withdrawal Queue      │
└────────┬────────┘   └────────┬────────┘   └────────────┬────────────┘
         │                     │                         │
         └─────────────────────┼─────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   PostgreSQL    │    │     Redis       │    │   TimescaleDB   │  │
│  │                 │    │                 │    │                 │  │
│  │ • Users         │    │ • Order Book    │    │ • Trade History │  │
│  │ • Orders        │    │ • Sessions      │    │ • OHLCV Data    │  │
│  │ • Balances      │    │ • Rate Limits   │    │ • Analytics     │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Deposit      │    │ Hot Wallet   │    │ Cold Wallet          │   │
│  │ Addresses    │    │ (Online)     │    │ (Hardware/Multi-sig) │   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Order Flow

```
User                API              Matching Engine        Balance Service
  │                  │                     │                      │
  │  POST /orders    │                     │                      │
  │─────────────────>│                     │                      │
  │                  │                     │                      │
  │                  │  Validate & Lock    │                      │
  │                  │─────────────────────│─────────────────────>│
  │                  │                     │                      │
  │                  │                     │   Lock Balance       │
  │                  │                     │<─────────────────────│
  │                  │                     │                      │
  │                  │  Submit Order       │                      │
  │                  │────────────────────>│                      │
  │                  │                     │                      │
  │                  │                     │  Match Orders        │
  │                  │                     │  ─────────────>      │
  │                  │                     │                      │
  │                  │                     │  Trade Executed      │
  │                  │                     │─────────────────────>│
  │                  │                     │                      │
  │                  │                     │   Update Balances    │
  │                  │                     │<─────────────────────│
  │                  │                     │                      │
  │  Order Response  │                     │                      │
  │<─────────────────│                     │                      │
  │                  │                     │                      │
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    balances     │       │     assets      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │    ┌──│ id (PK)         │
│ email           │  │    │ user_id (FK)    │────┘  │ symbol          │
│ password_hash   │  └───>│ asset_id (FK)   │<──────│ name            │
│ created_at      │       │ available       │       │ decimals        │
│ updated_at      │       │ locked          │       │ contract_addr   │
└─────────────────┘       │ updated_at      │       └─────────────────┘
         │                └─────────────────┘
         │
         │         ┌─────────────────┐       ┌─────────────────┐
         │         │     orders      │       │    markets      │
         │         ├─────────────────┤       ├─────────────────┤
         └────────>│ id (PK)         │    ┌──│ id (PK)         │
                   │ user_id (FK)    │    │  │ base_asset_id   │
                   │ market_id (FK)  │<───┘  │ quote_asset_id  │
                   │ side (buy/sell) │       │ min_order_size  │
                   │ type (limit/mkt)│       │ tick_size       │
                   │ price           │       │ status          │
                   │ quantity        │       └─────────────────┘
                   │ filled_qty      │
                   │ status          │       ┌─────────────────┐
                   │ created_at      │       │     trades      │
                   └────────┬────────┘       ├─────────────────┤
                            │                │ id (PK)         │
                            └───────────────>│ market_id (FK)  │
                                             │ maker_order_id  │
                                             │ taker_order_id  │
                                             │ price           │
                                             │ quantity        │
                                             │ maker_fee       │
                                             │ taker_fee       │
                                             │ created_at      │
                                             └─────────────────┘
```

### SQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Assets (cryptocurrencies/tokens)
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 9,
    contract_address VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

-- Markets (trading pairs)
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    base_asset_id INTEGER REFERENCES assets(id),
    quote_asset_id INTEGER REFERENCES assets(id),
    min_order_size DECIMAL(20, 8) NOT NULL,
    tick_size DECIMAL(20, 8) NOT NULL,
    maker_fee DECIMAL(10, 6) DEFAULT 0.001,
    taker_fee DECIMAL(10, 6) DEFAULT 0.002,
    status VARCHAR(20) DEFAULT 'active'
);

-- User balances
CREATE TABLE balances (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    asset_id INTEGER REFERENCES assets(id),
    available DECIMAL(30, 18) DEFAULT 0,
    locked DECIMAL(30, 18) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, asset_id)
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    market_id INTEGER REFERENCES markets(id),
    client_order_id VARCHAR(100),
    side VARCHAR(4) NOT NULL, -- 'buy' or 'sell'
    order_type VARCHAR(10) NOT NULL, -- 'limit', 'market'
    price DECIMAL(30, 18),
    quantity DECIMAL(30, 18) NOT NULL,
    filled_quantity DECIMAL(30, 18) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'new', -- new, partial, filled, cancelled
    time_in_force VARCHAR(10) DEFAULT 'GTC', -- GTC, IOC, FOK
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_market_status ON orders(market_id, status);
CREATE INDEX idx_orders_market_side_price ON orders(market_id, side, price);

-- Trades
CREATE TABLE trades (
    id BIGSERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES markets(id),
    maker_order_id UUID REFERENCES orders(id),
    taker_order_id UUID REFERENCES orders(id),
    maker_user_id UUID REFERENCES users(id),
    taker_user_id UUID REFERENCES users(id),
    price DECIMAL(30, 18) NOT NULL,
    quantity DECIMAL(30, 18) NOT NULL,
    quote_quantity DECIMAL(30, 18) NOT NULL,
    maker_fee DECIMAL(30, 18) NOT NULL,
    taker_fee DECIMAL(30, 18) NOT NULL,
    is_buyer_maker BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_market ON trades(market_id, created_at DESC);
CREATE INDEX idx_trades_user ON trades(maker_user_id);

-- Deposits
CREATE TABLE deposits (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    asset_id INTEGER REFERENCES assets(id),
    amount DECIMAL(30, 18) NOT NULL,
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    confirmations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

-- Withdrawals
CREATE TABLE withdrawals (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    asset_id INTEGER REFERENCES assets(id),
    amount DECIMAL(30, 18) NOT NULL,
    fee DECIMAL(30, 18) NOT NULL,
    destination_address VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Deposit addresses (unique per user per asset)
CREATE TABLE deposit_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    asset_id INTEGER REFERENCES assets(id),
    address VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, asset_id)
);
```

---

## Core Implementation

### Project Structure (Go)

```go
// cmd/api/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "exchange/internal/api"
    "exchange/internal/config"
    "exchange/internal/matching"
    "exchange/internal/repository"
    "exchange/internal/wallet"
)

func main() {
    cfg := config.Load()

    // Initialize database
    db, err := repository.NewPostgres(cfg.DatabaseURL)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Initialize Redis
    redis, err := repository.NewRedis(cfg.RedisURL)
    if err != nil {
        log.Fatalf("Failed to connect to Redis: %v", err)
    }

    // Initialize matching engines for each market
    engines := make(map[string]*matching.Engine)
    markets, _ := db.GetActiveMarkets(context.Background())
    for _, market := range markets {
        engines[market.Symbol] = matching.NewEngine(market, db, redis)
    }

    // Initialize wallet service
    walletSvc := wallet.NewService(cfg, db)

    // Start deposit listener
    go walletSvc.StartDepositListener(context.Background())

    // Start API server
    server := api.NewServer(cfg, db, redis, engines, walletSvc)
    go server.Start()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down...")
    server.Shutdown()
}
```

### Configuration

```go
// internal/config/config.go
package config

import "os"

type Config struct {
    Port            string
    DatabaseURL     string
    RedisURL        string
    SolanaRPCURL    string
    HotWalletKey    string
    JWTSecret       string
}

func Load() *Config {
    return &Config{
        Port:            getEnv("PORT", "8080"),
        DatabaseURL:     getEnv("DATABASE_URL", "postgres://localhost/exchange"),
        RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
        SolanaRPCURL:    getEnv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
        HotWalletKey:    os.Getenv("HOT_WALLET_KEY"),
        JWTSecret:       os.Getenv("JWT_SECRET"),
    }
}

func getEnv(key, defaultVal string) string {
    if val := os.Getenv(key); val != "" {
        return val
    }
    return defaultVal
}
```

---

## Order Matching Engine

### Order Book Data Structure

```go
// internal/matching/orderbook.go
package matching

import (
    "container/heap"
    "sync"
    "time"

    "github.com/shopspring/decimal"
)

// Order represents a single order
type Order struct {
    ID        string
    UserID    string
    Side      Side
    Type      OrderType
    Price     decimal.Decimal
    Quantity  decimal.Decimal
    Filled    decimal.Decimal
    Timestamp time.Time
}

type Side string

const (
    Buy  Side = "buy"
    Sell Side = "sell"
)

type OrderType string

const (
    Limit  OrderType = "limit"
    Market OrderType = "market"
)

// PriceLevel represents orders at a single price
type PriceLevel struct {
    Price  decimal.Decimal
    Orders []*Order
    Total  decimal.Decimal
}

// OrderBook maintains buy and sell orders
type OrderBook struct {
    mu       sync.RWMutex
    Symbol   string
    Bids     *PriceLevelHeap // Max heap for bids (highest first)
    Asks     *PriceLevelHeap // Min heap for asks (lowest first)
    Orders   map[string]*Order
    Levels   map[string]*PriceLevel
}

// PriceLevelHeap implements heap.Interface for price levels
type PriceLevelHeap struct {
    levels []*PriceLevel
    isMax  bool // true for bids (max heap), false for asks (min heap)
}

func (h PriceLevelHeap) Len() int { return len(h.levels) }

func (h PriceLevelHeap) Less(i, j int) bool {
    if h.isMax {
        return h.levels[i].Price.GreaterThan(h.levels[j].Price)
    }
    return h.levels[i].Price.LessThan(h.levels[j].Price)
}

func (h PriceLevelHeap) Swap(i, j int) {
    h.levels[i], h.levels[j] = h.levels[j], h.levels[i]
}

func (h *PriceLevelHeap) Push(x interface{}) {
    h.levels = append(h.levels, x.(*PriceLevel))
}

func (h *PriceLevelHeap) Pop() interface{} {
    old := h.levels
    n := len(old)
    x := old[n-1]
    h.levels = old[0 : n-1]
    return x
}

func (h *PriceLevelHeap) Peek() *PriceLevel {
    if len(h.levels) == 0 {
        return nil
    }
    return h.levels[0]
}

// NewOrderBook creates a new order book
func NewOrderBook(symbol string) *OrderBook {
    return &OrderBook{
        Symbol: symbol,
        Bids:   &PriceLevelHeap{levels: []*PriceLevel{}, isMax: true},
        Asks:   &PriceLevelHeap{levels: []*PriceLevel{}, isMax: false},
        Orders: make(map[string]*Order),
        Levels: make(map[string]*PriceLevel),
    }
}

// AddOrder adds an order to the book
func (ob *OrderBook) AddOrder(order *Order) {
    ob.mu.Lock()
    defer ob.mu.Unlock()

    priceKey := order.Price.String() + string(order.Side)
    level, exists := ob.Levels[priceKey]

    if !exists {
        level = &PriceLevel{
            Price:  order.Price,
            Orders: []*Order{},
            Total:  decimal.Zero,
        }
        ob.Levels[priceKey] = level

        if order.Side == Buy {
            heap.Push(ob.Bids, level)
        } else {
            heap.Push(ob.Asks, level)
        }
    }

    level.Orders = append(level.Orders, order)
    remaining := order.Quantity.Sub(order.Filled)
    level.Total = level.Total.Add(remaining)
    ob.Orders[order.ID] = order
}

// RemoveOrder removes an order from the book
func (ob *OrderBook) RemoveOrder(orderID string) *Order {
    ob.mu.Lock()
    defer ob.mu.Unlock()

    order, exists := ob.Orders[orderID]
    if !exists {
        return nil
    }

    priceKey := order.Price.String() + string(order.Side)
    level := ob.Levels[priceKey]

    // Remove from level
    for i, o := range level.Orders {
        if o.ID == orderID {
            level.Orders = append(level.Orders[:i], level.Orders[i+1:]...)
            break
        }
    }

    remaining := order.Quantity.Sub(order.Filled)
    level.Total = level.Total.Sub(remaining)

    delete(ob.Orders, orderID)
    return order
}

// GetBestBid returns the highest bid price level
func (ob *OrderBook) GetBestBid() *PriceLevel {
    ob.mu.RLock()
    defer ob.mu.RUnlock()
    return ob.Bids.Peek()
}

// GetBestAsk returns the lowest ask price level
func (ob *OrderBook) GetBestAsk() *PriceLevel {
    ob.mu.RLock()
    defer ob.mu.RUnlock()
    return ob.Asks.Peek()
}

// GetDepth returns order book depth up to n levels
func (ob *OrderBook) GetDepth(n int) (bids, asks []PriceLevel) {
    ob.mu.RLock()
    defer ob.mu.RUnlock()

    for i := 0; i < n && i < len(ob.Bids.levels); i++ {
        bids = append(bids, *ob.Bids.levels[i])
    }
    for i := 0; i < n && i < len(ob.Asks.levels); i++ {
        asks = append(asks, *ob.Asks.levels[i])
    }
    return
}
```

### Matching Engine

```go
// internal/matching/engine.go
package matching

import (
    "context"
    "time"

    "github.com/shopspring/decimal"
)

// Trade represents an executed trade
type Trade struct {
    ID           string
    MakerOrderID string
    TakerOrderID string
    MakerUserID  string
    TakerUserID  string
    Price        decimal.Decimal
    Quantity     decimal.Decimal
    IsBuyerMaker bool
    Timestamp    time.Time
}

// Engine handles order matching for a single market
type Engine struct {
    Market    *Market
    OrderBook *OrderBook
    Trades    chan *Trade
    db        Repository
    redis     CacheRepository
}

type Market struct {
    ID           int
    Symbol       string
    BaseAssetID  int
    QuoteAssetID int
    MinOrderSize decimal.Decimal
    TickSize     decimal.Decimal
    MakerFee     decimal.Decimal
    TakerFee     decimal.Decimal
}

type Repository interface {
    SaveOrder(ctx context.Context, order *Order) error
    UpdateOrder(ctx context.Context, order *Order) error
    SaveTrade(ctx context.Context, trade *Trade) error
    UpdateBalances(ctx context.Context, trade *Trade, market *Market) error
}

type CacheRepository interface {
    PublishTrade(ctx context.Context, marketSymbol string, trade *Trade) error
    PublishOrderBook(ctx context.Context, marketSymbol string, bids, asks []PriceLevel) error
}

func NewEngine(market *Market, db Repository, redis CacheRepository) *Engine {
    return &Engine{
        Market:    market,
        OrderBook: NewOrderBook(market.Symbol),
        Trades:    make(chan *Trade, 10000),
        db:        db,
        redis:     redis,
    }
}

// ProcessOrder handles incoming orders and matches them
func (e *Engine) ProcessOrder(ctx context.Context, order *Order) ([]*Trade, error) {
    var trades []*Trade

    // Validate order
    if err := e.validateOrder(order); err != nil {
        return nil, err
    }

    // Save order to database
    if err := e.db.SaveOrder(ctx, order); err != nil {
        return nil, err
    }

    // Match order
    if order.Type == Market {
        trades = e.matchMarketOrder(ctx, order)
    } else {
        trades = e.matchLimitOrder(ctx, order)
    }

    // Process trades
    for _, trade := range trades {
        // Save trade
        if err := e.db.SaveTrade(ctx, trade); err != nil {
            continue
        }

        // Update balances
        if err := e.db.UpdateBalances(ctx, trade, e.Market); err != nil {
            continue
        }

        // Publish to WebSocket
        e.redis.PublishTrade(ctx, e.Market.Symbol, trade)
        e.Trades <- trade
    }

    // Update order status
    if order.Filled.GreaterThanOrEqual(order.Quantity) {
        order.Status = "filled"
    } else if order.Filled.GreaterThan(decimal.Zero) {
        order.Status = "partial"
    }
    e.db.UpdateOrder(ctx, order)

    // If order not fully filled and is limit order, add to book
    if order.Type == Limit && order.Filled.LessThan(order.Quantity) {
        e.OrderBook.AddOrder(order)
    }

    // Publish order book update
    bids, asks := e.OrderBook.GetDepth(20)
    e.redis.PublishOrderBook(ctx, e.Market.Symbol, bids, asks)

    return trades, nil
}

func (e *Engine) validateOrder(order *Order) error {
    remaining := order.Quantity.Sub(order.Filled)
    if remaining.LessThan(e.Market.MinOrderSize) {
        return ErrOrderTooSmall
    }

    if order.Type == Limit {
        // Check tick size
        remainder := order.Price.Mod(e.Market.TickSize)
        if !remainder.IsZero() {
            return ErrInvalidTickSize
        }
    }

    return nil
}

func (e *Engine) matchMarketOrder(ctx context.Context, order *Order) []*Trade {
    var trades []*Trade
    remaining := order.Quantity.Sub(order.Filled)

    var book *PriceLevelHeap
    if order.Side == Buy {
        book = e.OrderBook.Asks
    } else {
        book = e.OrderBook.Bids
    }

    for remaining.GreaterThan(decimal.Zero) && book.Len() > 0 {
        bestLevel := book.Peek()
        if bestLevel == nil || len(bestLevel.Orders) == 0 {
            break
        }

        // Match against orders at this level (FIFO)
        for len(bestLevel.Orders) > 0 && remaining.GreaterThan(decimal.Zero) {
            makerOrder := bestLevel.Orders[0]
            makerRemaining := makerOrder.Quantity.Sub(makerOrder.Filled)

            matchQty := decimal.Min(remaining, makerRemaining)

            // Create trade
            trade := &Trade{
                ID:           generateID(),
                MakerOrderID: makerOrder.ID,
                TakerOrderID: order.ID,
                MakerUserID:  makerOrder.UserID,
                TakerUserID:  order.UserID,
                Price:        makerOrder.Price,
                Quantity:     matchQty,
                IsBuyerMaker: order.Side == Sell,
                Timestamp:    time.Now(),
            }
            trades = append(trades, trade)

            // Update filled quantities
            order.Filled = order.Filled.Add(matchQty)
            makerOrder.Filled = makerOrder.Filled.Add(matchQty)
            remaining = remaining.Sub(matchQty)
            bestLevel.Total = bestLevel.Total.Sub(matchQty)

            // Remove maker order if fully filled
            if makerOrder.Filled.GreaterThanOrEqual(makerOrder.Quantity) {
                makerOrder.Status = "filled"
                e.db.UpdateOrder(ctx, makerOrder)
                bestLevel.Orders = bestLevel.Orders[1:]
                delete(e.OrderBook.Orders, makerOrder.ID)
            }
        }

        // Remove empty level
        if len(bestLevel.Orders) == 0 {
            heap.Pop(book)
        }
    }

    return trades
}

func (e *Engine) matchLimitOrder(ctx context.Context, order *Order) []*Trade {
    var trades []*Trade
    remaining := order.Quantity.Sub(order.Filled)

    var book *PriceLevelHeap
    if order.Side == Buy {
        book = e.OrderBook.Asks
    } else {
        book = e.OrderBook.Bids
    }

    for remaining.GreaterThan(decimal.Zero) && book.Len() > 0 {
        bestLevel := book.Peek()
        if bestLevel == nil {
            break
        }

        // Check if price matches
        if order.Side == Buy && order.Price.LessThan(bestLevel.Price) {
            break
        }
        if order.Side == Sell && order.Price.GreaterThan(bestLevel.Price) {
            break
        }

        // Match against orders at this level (same as market order)
        for len(bestLevel.Orders) > 0 && remaining.GreaterThan(decimal.Zero) {
            makerOrder := bestLevel.Orders[0]
            makerRemaining := makerOrder.Quantity.Sub(makerOrder.Filled)

            matchQty := decimal.Min(remaining, makerRemaining)

            trade := &Trade{
                ID:           generateID(),
                MakerOrderID: makerOrder.ID,
                TakerOrderID: order.ID,
                MakerUserID:  makerOrder.UserID,
                TakerUserID:  order.UserID,
                Price:        makerOrder.Price,
                Quantity:     matchQty,
                IsBuyerMaker: order.Side == Sell,
                Timestamp:    time.Now(),
            }
            trades = append(trades, trade)

            order.Filled = order.Filled.Add(matchQty)
            makerOrder.Filled = makerOrder.Filled.Add(matchQty)
            remaining = remaining.Sub(matchQty)
            bestLevel.Total = bestLevel.Total.Sub(matchQty)

            if makerOrder.Filled.GreaterThanOrEqual(makerOrder.Quantity) {
                makerOrder.Status = "filled"
                e.db.UpdateOrder(ctx, makerOrder)
                bestLevel.Orders = bestLevel.Orders[1:]
                delete(e.OrderBook.Orders, makerOrder.ID)
            }
        }

        if len(bestLevel.Orders) == 0 {
            heap.Pop(book)
        }
    }

    return trades
}

// CancelOrder cancels an existing order
func (e *Engine) CancelOrder(ctx context.Context, orderID string) error {
    order := e.OrderBook.RemoveOrder(orderID)
    if order == nil {
        return ErrOrderNotFound
    }

    order.Status = "cancelled"
    return e.db.UpdateOrder(ctx, order)
}
```

---

## Wallet & Custody System

### Deposit Listener

```go
// internal/wallet/deposit_listener.go
package wallet

import (
    "context"
    "encoding/json"
    "log"

    "github.com/gagliardetto/solana-go"
    "github.com/gagliardetto/solana-go/rpc"
    "github.com/gagliardetto/solana-go/rpc/ws"
)

type DepositListener struct {
    rpcClient    *rpc.Client
    wsClient     *ws.Client
    db           Repository
    depositAddrs map[string]DepositInfo
}

type DepositInfo struct {
    UserID  string
    AssetID int
}

func NewDepositListener(rpcURL, wsURL string, db Repository) (*DepositListener, error) {
    rpcClient := rpc.New(rpcURL)
    wsClient, err := ws.Connect(context.Background(), wsURL)
    if err != nil {
        return nil, err
    }

    return &DepositListener{
        rpcClient:    rpcClient,
        wsClient:     wsClient,
        db:           db,
        depositAddrs: make(map[string]DepositInfo),
    }, nil
}

func (dl *DepositListener) Start(ctx context.Context) error {
    // Load all deposit addresses from database
    addrs, err := dl.db.GetAllDepositAddresses(ctx)
    if err != nil {
        return err
    }

    for _, addr := range addrs {
        dl.depositAddrs[addr.Address] = DepositInfo{
            UserID:  addr.UserID,
            AssetID: addr.AssetID,
        }
    }

    // Subscribe to account changes for each deposit address
    for address := range dl.depositAddrs {
        pubkey := solana.MustPublicKeyFromBase58(address)

        sub, err := dl.wsClient.AccountSubscribe(
            pubkey,
            rpc.CommitmentFinalized,
        )
        if err != nil {
            log.Printf("Failed to subscribe to %s: %v", address, err)
            continue
        }

        go dl.handleAccountUpdates(ctx, address, sub)
    }

    // Also subscribe to logs for token transfers
    programID := solana.TokenProgramID
    sub, err := dl.wsClient.LogsSubscribeMentions(
        programID,
        rpc.CommitmentFinalized,
    )
    if err != nil {
        return err
    }

    go dl.handleTokenTransfers(ctx, sub)

    return nil
}

func (dl *DepositListener) handleAccountUpdates(
    ctx context.Context,
    address string,
    sub *ws.AccountSubscription,
) {
    defer sub.Unsubscribe()

    for {
        select {
        case <-ctx.Done():
            return
        case result, ok := <-sub.Response():
            if !ok {
                return
            }

            info := dl.depositAddrs[address]

            // Get transaction details
            lamports := result.Value.Lamports

            // Check if this is a SOL deposit
            if info.AssetID == 1 { // SOL asset ID
                dl.processDeposit(ctx, info.UserID, info.AssetID, lamports, "")
            }
        }
    }
}

func (dl *DepositListener) handleTokenTransfers(
    ctx context.Context,
    sub *ws.LogsSubscription,
) {
    defer sub.Unsubscribe()

    for {
        select {
        case <-ctx.Done():
            return
        case result, ok := <-sub.Response():
            if !ok {
                return
            }

            // Parse logs for transfer instruction
            for _, logMsg := range result.Value.Logs {
                // Check if it's a transfer to one of our addresses
                // This is simplified - real implementation would decode instruction data
                if contains(logMsg, "Transfer") {
                    dl.parseAndProcessTransfer(ctx, result.Value.Signature.String())
                }
            }
        }
    }
}

func (dl *DepositListener) parseAndProcessTransfer(ctx context.Context, signature string) {
    // Get transaction details
    tx, err := dl.rpcClient.GetTransaction(
        ctx,
        solana.MustSignatureFromBase58(signature),
        &rpc.GetTransactionOpts{},
    )
    if err != nil {
        log.Printf("Failed to get transaction %s: %v", signature, err)
        return
    }

    // Parse pre/post token balances to determine transfer
    for _, postBalance := range tx.Meta.PostTokenBalances {
        owner := postBalance.Owner.String()
        if info, ok := dl.depositAddrs[owner]; ok {
            // Found a deposit to our address
            amount := postBalance.UiTokenAmount.Amount

            // Check if already processed
            exists, _ := dl.db.DepositExists(ctx, signature)
            if exists {
                continue
            }

            dl.processDeposit(ctx, info.UserID, info.AssetID, parseUint64(amount), signature)
        }
    }
}

func (dl *DepositListener) processDeposit(
    ctx context.Context,
    userID string,
    assetID int,
    amount uint64,
    txHash string,
) {
    // Create deposit record
    deposit := &Deposit{
        UserID:  userID,
        AssetID: assetID,
        Amount:  amount,
        TxHash:  txHash,
        Status:  "confirmed",
    }

    if err := dl.db.CreateDeposit(ctx, deposit); err != nil {
        log.Printf("Failed to create deposit: %v", err)
        return
    }

    // Credit user balance
    if err := dl.db.CreditBalance(ctx, userID, assetID, amount); err != nil {
        log.Printf("Failed to credit balance: %v", err)
        return
    }

    log.Printf("Processed deposit: user=%s asset=%d amount=%d tx=%s",
        userID, assetID, amount, txHash)
}
```

### Withdrawal Processor

```go
// internal/wallet/withdrawal.go
package wallet

import (
    "context"
    "errors"
    "log"
    "time"

    "github.com/gagliardetto/solana-go"
    "github.com/gagliardetto/solana-go/programs/system"
    "github.com/gagliardetto/solana-go/programs/token"
    "github.com/gagliardetto/solana-go/rpc"
)

type WithdrawalProcessor struct {
    rpcClient  *rpc.Client
    hotWallet  solana.PrivateKey
    db         Repository
    minBalance uint64 // Minimum hot wallet balance before refill
}

func NewWithdrawalProcessor(
    rpcURL string,
    hotWalletKey string,
    db Repository,
) (*WithdrawalProcessor, error) {
    rpcClient := rpc.New(rpcURL)

    hotWallet, err := solana.PrivateKeyFromBase58(hotWalletKey)
    if err != nil {
        return nil, err
    }

    return &WithdrawalProcessor{
        rpcClient:  rpcClient,
        hotWallet:  hotWallet,
        db:         db,
        minBalance: 10_000_000_000, // 10 SOL
    }, nil
}

func (wp *WithdrawalProcessor) Start(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            wp.processPendingWithdrawals(ctx)
        }
    }
}

func (wp *WithdrawalProcessor) processPendingWithdrawals(ctx context.Context) {
    // Get pending withdrawals
    withdrawals, err := wp.db.GetPendingWithdrawals(ctx, 10)
    if err != nil {
        log.Printf("Failed to get pending withdrawals: %v", err)
        return
    }

    for _, withdrawal := range withdrawals {
        // Mark as processing
        wp.db.UpdateWithdrawalStatus(ctx, withdrawal.ID, "processing")

        // Process withdrawal
        txHash, err := wp.processWithdrawal(ctx, withdrawal)
        if err != nil {
            log.Printf("Failed to process withdrawal %d: %v", withdrawal.ID, err)
            wp.db.UpdateWithdrawalStatus(ctx, withdrawal.ID, "failed")
            continue
        }

        // Update with tx hash
        wp.db.CompleteWithdrawal(ctx, withdrawal.ID, txHash)
        log.Printf("Processed withdrawal %d: tx=%s", withdrawal.ID, txHash)
    }
}

func (wp *WithdrawalProcessor) processWithdrawal(
    ctx context.Context,
    withdrawal *Withdrawal,
) (string, error) {
    destination := solana.MustPublicKeyFromBase58(withdrawal.DestinationAddress)

    // Check if SOL or SPL token
    if withdrawal.AssetID == 1 { // SOL
        return wp.sendSOL(ctx, destination, withdrawal.Amount)
    }

    // Get token mint from asset
    asset, err := wp.db.GetAsset(ctx, withdrawal.AssetID)
    if err != nil {
        return "", err
    }

    return wp.sendToken(ctx, destination, asset.ContractAddress, withdrawal.Amount)
}

func (wp *WithdrawalProcessor) sendSOL(
    ctx context.Context,
    destination solana.PublicKey,
    amount uint64,
) (string, error) {
    // Check hot wallet balance
    balance, err := wp.rpcClient.GetBalance(
        ctx,
        wp.hotWallet.PublicKey(),
        rpc.CommitmentFinalized,
    )
    if err != nil {
        return "", err
    }

    if balance.Value < amount+5000 { // 5000 lamports for fees
        return "", errors.New("insufficient hot wallet balance")
    }

    // Build transaction
    recent, err := wp.rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
    if err != nil {
        return "", err
    }

    tx, err := solana.NewTransaction(
        []solana.Instruction{
            system.NewTransferInstruction(
                amount,
                wp.hotWallet.PublicKey(),
                destination,
            ).Build(),
        },
        recent.Value.Blockhash,
        solana.TransactionPayer(wp.hotWallet.PublicKey()),
    )
    if err != nil {
        return "", err
    }

    // Sign and send
    _, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
        if key.Equals(wp.hotWallet.PublicKey()) {
            return &wp.hotWallet
        }
        return nil
    })
    if err != nil {
        return "", err
    }

    sig, err := wp.rpcClient.SendTransaction(ctx, tx)
    if err != nil {
        return "", err
    }

    return sig.String(), nil
}

func (wp *WithdrawalProcessor) sendToken(
    ctx context.Context,
    destination solana.PublicKey,
    mintAddress string,
    amount uint64,
) (string, error) {
    mint := solana.MustPublicKeyFromBase58(mintAddress)

    // Get associated token accounts
    sourceATA, _, _ := solana.FindAssociatedTokenAddress(
        wp.hotWallet.PublicKey(),
        mint,
    )

    destATA, _, _ := solana.FindAssociatedTokenAddress(
        destination,
        mint,
    )

    recent, err := wp.rpcClient.GetRecentBlockhash(ctx, rpc.CommitmentFinalized)
    if err != nil {
        return "", err
    }

    // Build transfer instruction
    tx, err := solana.NewTransaction(
        []solana.Instruction{
            token.NewTransferInstruction(
                amount,
                sourceATA,
                destATA,
                wp.hotWallet.PublicKey(),
                []solana.PublicKey{},
            ).Build(),
        },
        recent.Value.Blockhash,
        solana.TransactionPayer(wp.hotWallet.PublicKey()),
    )
    if err != nil {
        return "", err
    }

    _, err = tx.Sign(func(key solana.PublicKey) *solana.PrivateKey {
        if key.Equals(wp.hotWallet.PublicKey()) {
            return &wp.hotWallet
        }
        return nil
    })
    if err != nil {
        return "", err
    }

    sig, err := wp.rpcClient.SendTransaction(ctx, tx)
    if err != nil {
        return "", err
    }

    return sig.String(), nil
}
```

---

## API Design

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create new order |
| GET | `/api/v1/orders` | Get user's open orders |
| DELETE | `/api/v1/orders/:id` | Cancel order |
| GET | `/api/v1/trades` | Get user's trade history |
| GET | `/api/v1/balances` | Get user's balances |
| POST | `/api/v1/withdrawals` | Request withdrawal |
| GET | `/api/v1/markets` | Get all markets |
| GET | `/api/v1/markets/:symbol/orderbook` | Get order book |
| GET | `/api/v1/markets/:symbol/trades` | Get recent trades |

### API Handler

```go
// internal/api/handlers.go
package api

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/shopspring/decimal"
)

type CreateOrderRequest struct {
    MarketSymbol  string `json:"market_symbol" binding:"required"`
    Side          string `json:"side" binding:"required,oneof=buy sell"`
    Type          string `json:"type" binding:"required,oneof=limit market"`
    Price         string `json:"price"`
    Quantity      string `json:"quantity" binding:"required"`
    ClientOrderID string `json:"client_order_id"`
}

func (s *Server) createOrder(c *gin.Context) {
    var req CreateOrderRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    userID := c.GetString("user_id")

    // Get market
    market, ok := s.markets[req.MarketSymbol]
    if !ok {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid market"})
        return
    }

    // Parse amounts
    quantity, err := decimal.NewFromString(req.Quantity)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid quantity"})
        return
    }

    var price decimal.Decimal
    if req.Type == "limit" {
        price, err = decimal.NewFromString(req.Price)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid price"})
            return
        }
    }

    // Lock balance
    if req.Side == "buy" {
        // Lock quote asset
        lockAmount := quantity.Mul(price)
        if err := s.db.LockBalance(c, userID, market.QuoteAssetID, lockAmount); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient balance"})
            return
        }
    } else {
        // Lock base asset
        if err := s.db.LockBalance(c, userID, market.BaseAssetID, quantity); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient balance"})
            return
        }
    }

    // Create order
    order := &matching.Order{
        ID:        generateOrderID(),
        UserID:    userID,
        Side:      matching.Side(req.Side),
        Type:      matching.OrderType(req.Type),
        Price:     price,
        Quantity:  quantity,
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    }

    // Submit to matching engine
    engine := s.engines[req.MarketSymbol]
    trades, err := engine.ProcessOrder(c, order)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "order":  order,
        "trades": trades,
    })
}

func (s *Server) getOrderBook(c *gin.Context) {
    symbol := c.Param("symbol")

    engine, ok := s.engines[symbol]
    if !ok {
        c.JSON(http.StatusNotFound, gin.H{"error": "market not found"})
        return
    }

    bids, asks := engine.OrderBook.GetDepth(20)

    c.JSON(http.StatusOK, gin.H{
        "bids": bids,
        "asks": asks,
    })
}

func (s *Server) getBalances(c *gin.Context) {
    userID := c.GetString("user_id")

    balances, err := s.db.GetUserBalances(c, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"balances": balances})
}

func (s *Server) createWithdrawal(c *gin.Context) {
    var req struct {
        AssetID     int    `json:"asset_id" binding:"required"`
        Amount      string `json:"amount" binding:"required"`
        Destination string `json:"destination" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    userID := c.GetString("user_id")

    amount, err := decimal.NewFromString(req.Amount)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid amount"})
        return
    }

    // Get withdrawal fee
    asset, _ := s.db.GetAsset(c, req.AssetID)
    fee := asset.WithdrawalFee

    totalAmount := amount.Add(fee)

    // Lock balance
    if err := s.db.LockBalance(c, userID, req.AssetID, totalAmount); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient balance"})
        return
    }

    // Create withdrawal request
    withdrawal := &Withdrawal{
        UserID:             userID,
        AssetID:            req.AssetID,
        Amount:             amount,
        Fee:                fee,
        DestinationAddress: req.Destination,
        Status:             "pending",
    }

    if err := s.db.CreateWithdrawal(c, withdrawal); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"withdrawal": withdrawal})
}
```

### WebSocket Handler

```go
// internal/api/websocket.go
package api

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"

    "github.com/gorilla/websocket"
)

type WSHub struct {
    clients    map[*WSClient]bool
    broadcast  chan []byte
    register   chan *WSClient
    unregister chan *WSClient
    mu         sync.RWMutex
}

type WSClient struct {
    hub     *WSHub
    conn    *websocket.Conn
    send    chan []byte
    symbols map[string]bool // subscribed symbols
}

type WSMessage struct {
    Type    string      `json:"type"`
    Channel string      `json:"channel"`
    Symbol  string      `json:"symbol,omitempty"`
    Data    interface{} `json:"data,omitempty"`
}

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // Configure for production
    },
}

func NewWSHub() *WSHub {
    return &WSHub{
        clients:    make(map[*WSClient]bool),
        broadcast:  make(chan []byte),
        register:   make(chan *WSClient),
        unregister: make(chan *WSClient),
    }
}

func (h *WSHub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            h.mu.Unlock()

        case message := <-h.broadcast:
            h.mu.RLock()
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
            h.mu.RUnlock()
        }
    }
}

func (h *WSHub) BroadcastToSymbol(symbol string, msg WSMessage) {
    data, _ := json.Marshal(msg)

    h.mu.RLock()
    for client := range h.clients {
        if client.symbols[symbol] {
            select {
            case client.send <- data:
            default:
            }
        }
    }
    h.mu.RUnlock()
}

func (s *Server) handleWebSocket(c *gin.Context) {
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocket upgrade error: %v", err)
        return
    }

    client := &WSClient{
        hub:     s.wsHub,
        conn:    conn,
        send:    make(chan []byte, 256),
        symbols: make(map[string]bool),
    }

    s.wsHub.register <- client

    go client.writePump()
    go client.readPump()
}

func (c *WSClient) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            break
        }

        var msg WSMessage
        if err := json.Unmarshal(message, &msg); err != nil {
            continue
        }

        switch msg.Type {
        case "subscribe":
            c.symbols[msg.Symbol] = true
        case "unsubscribe":
            delete(c.symbols, msg.Symbol)
        }
    }
}

func (c *WSClient) writePump() {
    defer c.conn.Close()

    for {
        select {
        case message, ok := <-c.send:
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                return
            }
        }
    }
}
```

---

## Testing

### Unit Tests

```go
// internal/matching/engine_test.go
package matching

import (
    "context"
    "testing"
    "time"

    "github.com/shopspring/decimal"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

type MockRepository struct {
    mock.Mock
}

func (m *MockRepository) SaveOrder(ctx context.Context, order *Order) error {
    args := m.Called(ctx, order)
    return args.Error(0)
}

func (m *MockRepository) UpdateOrder(ctx context.Context, order *Order) error {
    args := m.Called(ctx, order)
    return args.Error(0)
}

func (m *MockRepository) SaveTrade(ctx context.Context, trade *Trade) error {
    args := m.Called(ctx, trade)
    return args.Error(0)
}

func (m *MockRepository) UpdateBalances(ctx context.Context, trade *Trade, market *Market) error {
    args := m.Called(ctx, trade, market)
    return args.Error(0)
}

type MockCache struct {
    mock.Mock
}

func (m *MockCache) PublishTrade(ctx context.Context, symbol string, trade *Trade) error {
    return nil
}

func (m *MockCache) PublishOrderBook(ctx context.Context, symbol string, bids, asks []PriceLevel) error {
    return nil
}

func TestOrderBookAddRemove(t *testing.T) {
    ob := NewOrderBook("SOL-USDC")

    order := &Order{
        ID:        "order-1",
        UserID:    "user-1",
        Side:      Buy,
        Type:      Limit,
        Price:     decimal.NewFromInt(100),
        Quantity:  decimal.NewFromInt(10),
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    }

    ob.AddOrder(order)

    assert.Equal(t, 1, len(ob.Orders))
    assert.NotNil(t, ob.GetBestBid())
    assert.Equal(t, decimal.NewFromInt(100), ob.GetBestBid().Price)

    ob.RemoveOrder("order-1")
    assert.Equal(t, 0, len(ob.Orders))
}

func TestMatchingEngineLimitOrder(t *testing.T) {
    ctx := context.Background()

    mockRepo := new(MockRepository)
    mockCache := new(MockCache)

    market := &Market{
        ID:           1,
        Symbol:       "SOL-USDC",
        MinOrderSize: decimal.NewFromFloat(0.01),
        TickSize:     decimal.NewFromFloat(0.01),
        MakerFee:     decimal.NewFromFloat(0.001),
        TakerFee:     decimal.NewFromFloat(0.002),
    }

    engine := NewEngine(market, mockRepo, mockCache)

    mockRepo.On("SaveOrder", ctx, mock.Anything).Return(nil)
    mockRepo.On("UpdateOrder", ctx, mock.Anything).Return(nil)
    mockRepo.On("SaveTrade", ctx, mock.Anything).Return(nil)
    mockRepo.On("UpdateBalances", ctx, mock.Anything, mock.Anything).Return(nil)

    // Add sell order (maker)
    sellOrder := &Order{
        ID:        "sell-1",
        UserID:    "user-1",
        Side:      Sell,
        Type:      Limit,
        Price:     decimal.NewFromInt(100),
        Quantity:  decimal.NewFromInt(10),
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    }
    engine.ProcessOrder(ctx, sellOrder)

    // Add buy order (taker) - should match
    buyOrder := &Order{
        ID:        "buy-1",
        UserID:    "user-2",
        Side:      Buy,
        Type:      Limit,
        Price:     decimal.NewFromInt(100),
        Quantity:  decimal.NewFromInt(5),
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    }
    trades, err := engine.ProcessOrder(ctx, buyOrder)

    assert.NoError(t, err)
    assert.Equal(t, 1, len(trades))
    assert.Equal(t, decimal.NewFromInt(5), trades[0].Quantity)
    assert.Equal(t, decimal.NewFromInt(100), trades[0].Price)
}

func TestMatchingEngineMarketOrder(t *testing.T) {
    ctx := context.Background()

    mockRepo := new(MockRepository)
    mockCache := new(MockCache)

    market := &Market{
        ID:           1,
        Symbol:       "SOL-USDC",
        MinOrderSize: decimal.NewFromFloat(0.01),
        TickSize:     decimal.NewFromFloat(0.01),
        MakerFee:     decimal.NewFromFloat(0.001),
        TakerFee:     decimal.NewFromFloat(0.002),
    }

    engine := NewEngine(market, mockRepo, mockCache)

    mockRepo.On("SaveOrder", ctx, mock.Anything).Return(nil)
    mockRepo.On("UpdateOrder", ctx, mock.Anything).Return(nil)
    mockRepo.On("SaveTrade", ctx, mock.Anything).Return(nil)
    mockRepo.On("UpdateBalances", ctx, mock.Anything, mock.Anything).Return(nil)

    // Add multiple sell orders at different prices
    engine.ProcessOrder(ctx, &Order{
        ID:        "sell-1",
        UserID:    "user-1",
        Side:      Sell,
        Type:      Limit,
        Price:     decimal.NewFromInt(100),
        Quantity:  decimal.NewFromInt(5),
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    })

    engine.ProcessOrder(ctx, &Order{
        ID:        "sell-2",
        UserID:    "user-1",
        Side:      Sell,
        Type:      Limit,
        Price:     decimal.NewFromInt(101),
        Quantity:  decimal.NewFromInt(5),
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    })

    // Market buy should consume both orders
    marketBuy := &Order{
        ID:        "buy-1",
        UserID:    "user-2",
        Side:      Buy,
        Type:      Market,
        Quantity:  decimal.NewFromInt(8),
        Filled:    decimal.Zero,
        Timestamp: time.Now(),
    }
    trades, err := engine.ProcessOrder(ctx, marketBuy)

    assert.NoError(t, err)
    assert.Equal(t, 2, len(trades))

    // First trade at 100
    assert.Equal(t, decimal.NewFromInt(100), trades[0].Price)
    assert.Equal(t, decimal.NewFromInt(5), trades[0].Quantity)

    // Second trade at 101
    assert.Equal(t, decimal.NewFromInt(101), trades[1].Price)
    assert.Equal(t, decimal.NewFromInt(3), trades[1].Quantity)
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Go project structure
- [ ] Implement database schema and migrations
- [ ] Build order book data structure
- [ ] Implement basic matching algorithm

### Phase 2: Matching Engine (Week 2-3)
- [ ] Implement limit order matching
- [ ] Implement market order matching
- [ ] Add partial fills support
- [ ] Add order cancellation
- [ ] Write unit tests

### Phase 3: API Layer (Week 3-4)
- [ ] Build REST API endpoints
- [ ] Implement WebSocket hub
- [ ] Add authentication/authorization
- [ ] Rate limiting

### Phase 4: Wallet System (Week 4-5)
- [ ] Deposit address generation
- [ ] Deposit listener service
- [ ] Withdrawal processor
- [ ] Hot wallet management

### Phase 5: Integration (Week 5-6)
- [ ] Integration tests
- [ ] Load testing
- [ ] Monitoring setup
- [ ] Documentation

---

## Concepts Covered

| Concept | Where Applied |
|---------|---------------|
| **Order Matching** | Price-time priority FIFO algorithm |
| **Order Book** | Heap-based price levels with order queues |
| **Event Sourcing** | Trade and order events for audit trail |
| **Custody** | Hot/cold wallet architecture |
| **Deposit Detection** | WebSocket subscription to blockchain |
| **Balance Locking** | Prevent double-spending during trades |
| **WebSocket** | Real-time order book and trade feeds |
| **Rate Limiting** | API protection via Redis |
| **Database Design** | Normalized schema for financial data |

---

## Folder Structure

```
cex/
├── cmd/
│   ├── api/
│   │   └── main.go              # API server entry
│   └── worker/
│       └── main.go              # Background workers
├── internal/
│   ├── api/
│   │   ├── server.go            # HTTP server setup
│   │   ├── handlers.go          # REST handlers
│   │   ├── websocket.go         # WebSocket hub
│   │   └── middleware.go        # Auth, rate limiting
│   ├── matching/
│   │   ├── engine.go            # Matching engine
│   │   ├── orderbook.go         # Order book structure
│   │   └── engine_test.go       # Unit tests
│   ├── wallet/
│   │   ├── deposit_listener.go  # Deposit detection
│   │   ├── withdrawal.go        # Withdrawal processing
│   │   └── address.go           # Address generation
│   ├── repository/
│   │   ├── postgres.go          # Database operations
│   │   └── redis.go             # Cache operations
│   └── config/
│       └── config.go            # Configuration
├── migrations/
│   └── 001_initial.sql          # Database schema
├── docker-compose.yml
├── Dockerfile
└── go.mod
```

---

## Development Commands

```bash
# Setup
go mod init exchange
go mod tidy

# Run migrations
migrate -path migrations -database "postgres://localhost/exchange" up

# Run server
go run cmd/api/main.go

# Run tests
go test ./...

# Build
go build -o bin/api cmd/api/main.go

# Docker
docker-compose up -d

# Load test
go-wrk -c 100 -d 30 http://localhost:8080/api/v1/markets/SOL-USDC/orderbook
```

---

## Summary

This CEX project teaches core exchange and financial system concepts:

1. **Matching Engine**: Order book data structures, price-time priority, partial fills
2. **Custody**: Hot/cold wallet architecture, deposit detection, withdrawal processing
3. **High Performance**: Go concurrency, Redis caching, WebSocket streaming
4. **Financial Systems**: Balance locking, event sourcing, audit trails
5. **Blockchain Integration**: Solana RPC, transaction parsing, account subscriptions

Building a CEX provides deep understanding of how traditional exchanges work, which is essential context for understanding DEXs and DeFi protocols.
