/**
 * Observer Pattern
 * Category: Behavioral
 *
 * Definition:
 * The Observer pattern defines a one-to-many dependency between objects so
 * that when one object changes state, all its dependents are notified and
 * updated automatically.
 *
 * When to use:
 * - When a change to one object requires changing others, and you don't know
 *   how many objects need to be changed
 * - When an object should notify other objects without knowing who they are
 * - When you need to maintain consistency between related objects without
 *   tight coupling
 *
 * Key Benefits:
 * - Loose coupling between Subject and Observer
 * - Support for broadcast communication
 * - Observers can be added/removed at any time
 * - Subject doesn't need to know concrete observer classes
 *
 * Structure:
 * - Subject: Knows its observers; provides interface for attaching/detaching
 * - Observer: Interface for objects that should be notified of changes
 * - ConcreteSubject: Stores state; sends notifications to observers
 * - ConcreteObserver: Maintains reference to subject; implements update
 */

// ============================================================================
// OBSERVER INTERFACE
// ============================================================================

/**
 * Observer - Interface for objects that want to be notified of changes.
 */
interface Observer {
  // Called when the observed subject changes
  update(subject: Subject): void;
}

// ============================================================================
// SUBJECT INTERFACE
// ============================================================================

/**
 * Subject - Interface for the object being observed.
 * Provides methods for managing observers.
 */
interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(): void;
}

// ============================================================================
// CONCRETE SUBJECT - News Publisher
// ============================================================================

/**
 * NewsPublisher - A concrete subject that publishes news.
 * Observers (subscribers) are notified when new articles are published.
 */
class NewsPublisher implements Subject {
  // List of subscribers
  private observers: Observer[] = [];

  // State
  private latestNews: string = "";
  private category: string = "";
  private timestamp: Date = new Date();

  /**
   * Attach an observer to the subject.
   */
  attach(observer: Observer): void {
    const exists = this.observers.includes(observer);
    if (exists) {
      console.log("NewsPublisher: Observer already subscribed.");
      return;
    }

    console.log("NewsPublisher: New subscriber added.");
    this.observers.push(observer);
  }

  /**
   * Detach an observer from the subject.
   */
  detach(observer: Observer): void {
    const index = this.observers.indexOf(observer);
    if (index === -1) {
      console.log("NewsPublisher: Observer not found.");
      return;
    }

    this.observers.splice(index, 1);
    console.log("NewsPublisher: Subscriber removed.");
  }

  /**
   * Notify all observers about a state change.
   */
  notify(): void {
    console.log(`NewsPublisher: Notifying ${this.observers.length} subscribers...`);
    for (const observer of this.observers) {
      observer.update(this);
    }
  }

  /**
   * Publish a new article - triggers notification.
   */
  publishNews(news: string, category: string): void {
    this.latestNews = news;
    this.category = category;
    this.timestamp = new Date();

    console.log(`\n[BREAKING NEWS] Category: ${category}`);
    console.log(`"${news}"`);
    console.log("");

    // Notify all subscribers
    this.notify();
  }

  // Getters for state
  getLatestNews(): string {
    return this.latestNews;
  }

  getCategory(): string {
    return this.category;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  getSubscriberCount(): number {
    return this.observers.length;
  }
}

// ============================================================================
// CONCRETE OBSERVERS - Different types of subscribers
// ============================================================================

/**
 * EmailSubscriber - Receives news via email notification.
 */
class EmailSubscriber implements Observer {
  private email: string;
  private interestedCategories: string[];

  constructor(email: string, categories: string[] = []) {
    this.email = email;
    this.interestedCategories = categories;
  }

  update(subject: Subject): void {
    if (subject instanceof NewsPublisher) {
      const category = subject.getCategory();

      // Filter by interested categories if specified
      if (
        this.interestedCategories.length > 0 &&
        !this.interestedCategories.includes(category)
      ) {
        console.log(`  [Email] ${this.email}: Skipping (not interested in ${category})`);
        return;
      }

      console.log(`  [Email] Sending to ${this.email}:`);
      console.log(`    Subject: Breaking ${category} News!`);
      console.log(`    Body: ${subject.getLatestNews()}`);
    }
  }

  getEmail(): string {
    return this.email;
  }
}

/**
 * SMSSubscriber - Receives news via SMS.
 */
class SMSSubscriber implements Observer {
  private phoneNumber: string;

  constructor(phoneNumber: string) {
    this.phoneNumber = phoneNumber;
  }

  update(subject: Subject): void {
    if (subject instanceof NewsPublisher) {
      // SMS has character limit, so truncate
      const news = subject.getLatestNews();
      const truncated = news.length > 100 ? news.substring(0, 97) + "..." : news;

      console.log(`  [SMS] Sending to ${this.phoneNumber}:`);
      console.log(`    "${truncated}"`);
    }
  }
}

/**
 * AppNotificationSubscriber - Receives push notifications.
 */
class AppNotificationSubscriber implements Observer {
  private userId: string;
  private deviceToken: string;

  constructor(userId: string, deviceToken: string) {
    this.userId = userId;
    this.deviceToken = deviceToken;
  }

  update(subject: Subject): void {
    if (subject instanceof NewsPublisher) {
      console.log(`  [Push] Notification to user ${this.userId}:`);
      console.log(`    Device: ${this.deviceToken.substring(0, 8)}...`);
      console.log(`    Title: ${subject.getCategory()} Alert`);
      console.log(`    Message: ${subject.getLatestNews()}`);
    }
  }
}

/**
 * NewsLogger - Logs all news for analytics.
 */
class NewsLogger implements Observer {
  private logs: Array<{ news: string; category: string; time: Date }> = [];

  update(subject: Subject): void {
    if (subject instanceof NewsPublisher) {
      const entry = {
        news: subject.getLatestNews(),
        category: subject.getCategory(),
        time: subject.getTimestamp(),
      };
      this.logs.push(entry);
      console.log(`  [Logger] Recorded article #${this.logs.length}`);
    }
  }

  getLogs(): Array<{ news: string; category: string; time: Date }> {
    return this.logs;
  }

  printStats(): void {
    console.log("\n--- News Logger Stats ---");
    console.log(`Total articles logged: ${this.logs.length}`);

    const categories = this.logs.reduce(
      (acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log("By category:");
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Stock Price Observer
// ============================================================================

/**
 * StockObserver - Interface for stock price observers.
 */
interface StockObserver {
  onPriceChange(symbol: string, oldPrice: number, newPrice: number): void;
}

/**
 * Stock - Observable stock with price changes.
 */
class Stock {
  private symbol: string;
  private price: number;
  private observers: StockObserver[] = [];

  constructor(symbol: string, initialPrice: number) {
    this.symbol = symbol;
    this.price = initialPrice;
  }

  subscribe(observer: StockObserver): void {
    this.observers.push(observer);
  }

  unsubscribe(observer: StockObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  setPrice(newPrice: number): void {
    const oldPrice = this.price;
    this.price = newPrice;

    console.log(`\n[${this.symbol}] Price changed: $${oldPrice.toFixed(2)} -> $${newPrice.toFixed(2)}`);

    // Notify all observers
    this.observers.forEach((observer) => {
      observer.onPriceChange(this.symbol, oldPrice, newPrice);
    });
  }

  getPrice(): number {
    return this.price;
  }

  getSymbol(): string {
    return this.symbol;
  }
}

/**
 * StockAlert - Alerts when stock crosses thresholds.
 */
class StockAlert implements StockObserver {
  private highThreshold: number;
  private lowThreshold: number;

  constructor(lowThreshold: number, highThreshold: number) {
    this.lowThreshold = lowThreshold;
    this.highThreshold = highThreshold;
  }

  onPriceChange(symbol: string, _oldPrice: number, newPrice: number): void {
    if (newPrice >= this.highThreshold) {
      console.log(`  [ALERT] ${symbol} hit high threshold! Price: $${newPrice.toFixed(2)} >= $${this.highThreshold}`);
    } else if (newPrice <= this.lowThreshold) {
      console.log(`  [ALERT] ${symbol} hit low threshold! Price: $${newPrice.toFixed(2)} <= $${this.lowThreshold}`);
    }
  }
}

/**
 * StockPortfolio - Tracks portfolio value changes.
 */
class StockPortfolio implements StockObserver {
  private holdings: Map<string, number> = new Map(); // symbol -> shares
  private prices: Map<string, number> = new Map();

  addHolding(symbol: string, shares: number): void {
    this.holdings.set(symbol, shares);
  }

  onPriceChange(symbol: string, _oldPrice: number, newPrice: number): void {
    this.prices.set(symbol, newPrice);

    const shares = this.holdings.get(symbol) || 0;
    if (shares > 0) {
      const value = shares * newPrice;
      console.log(`  [Portfolio] ${symbol}: ${shares} shares @ $${newPrice.toFixed(2)} = $${value.toFixed(2)}`);
      console.log(`  [Portfolio] Total value: $${this.getTotalValue().toFixed(2)}`);
    }
  }

  getTotalValue(): number {
    let total = 0;
    this.holdings.forEach((shares, symbol) => {
      const price = this.prices.get(symbol) || 0;
      total += shares * price;
    });
    return total;
  }
}

/**
 * TradingBot - Automated trading based on price changes.
 */
class TradingBot implements StockObserver {
  private buyThreshold: number; // % drop to trigger buy
  private sellThreshold: number; // % gain to trigger sell

  constructor(buyThreshold: number = 5, sellThreshold: number = 10) {
    this.buyThreshold = buyThreshold;
    this.sellThreshold = sellThreshold;
  }

  onPriceChange(symbol: string, oldPrice: number, newPrice: number): void {
    const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

    if (changePercent <= -this.buyThreshold) {
      console.log(`  [TradingBot] BUY signal for ${symbol}! Price dropped ${Math.abs(changePercent).toFixed(2)}%`);
    } else if (changePercent >= this.sellThreshold) {
      console.log(`  [TradingBot] SELL signal for ${symbol}! Price rose ${changePercent.toFixed(2)}%`);
    }
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("OBSERVER PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- News Publisher Demo ---
console.log("\n--- News Publisher Demo ---\n");

// Create the publisher (subject)
const newsPublisher = new NewsPublisher();

// Create subscribers (observers)
const emailSub1 = new EmailSubscriber("john@example.com", ["Technology", "Sports"]);
const emailSub2 = new EmailSubscriber("jane@example.com"); // All categories
const smsSub = new SMSSubscriber("+1-555-123-4567");
const appSub = new AppNotificationSubscriber("user_123", "device_token_abc123xyz");
const logger = new NewsLogger();

// Subscribe to the publisher
console.log("Adding subscribers...\n");
newsPublisher.attach(emailSub1);
newsPublisher.attach(emailSub2);
newsPublisher.attach(smsSub);
newsPublisher.attach(appSub);
newsPublisher.attach(logger);

console.log(`\nTotal subscribers: ${newsPublisher.getSubscriberCount()}\n`);

// Publish news - all subscribers notified
newsPublisher.publishNews(
  "New AI breakthrough: ChatGPT-5 released with human-level reasoning!",
  "Technology"
);

newsPublisher.publishNews(
  "World Cup Final: Argentina defeats France in penalty shootout!",
  "Sports"
);

newsPublisher.publishNews("Stock market hits all-time high amid tech rally", "Finance");

// Remove a subscriber
console.log("\nRemoving SMS subscriber...");
newsPublisher.detach(smsSub);

// Publish more news
newsPublisher.publishNews("SpaceX successfully lands on Mars!", "Technology");

// Show logger stats
logger.printStats();

// --- Stock Observer Demo ---
console.log("\n--- Stock Price Observer Demo ---\n");

// Create stocks
const appleStock = new Stock("AAPL", 175.0);
const teslaStock = new Stock("TSLA", 250.0);

// Create observers
const stockAlert = new StockAlert(160, 200); // Alert when AAPL < 160 or > 200
const portfolio = new StockPortfolio();
const tradingBot = new TradingBot(3, 5); // Buy on 3% drop, sell on 5% gain

// Set up portfolio
portfolio.addHolding("AAPL", 100);
portfolio.addHolding("TSLA", 50);

// Subscribe to stocks
appleStock.subscribe(stockAlert);
appleStock.subscribe(portfolio);
appleStock.subscribe(tradingBot);

teslaStock.subscribe(portfolio);
teslaStock.subscribe(tradingBot);

// Simulate price changes
console.log("Simulating market activity...\n");

appleStock.setPrice(178.5); // Small increase
appleStock.setPrice(185.0); // Bigger increase
appleStock.setPrice(205.0); // Hits high threshold
appleStock.setPrice(195.0); // Back down

teslaStock.setPrice(240.0); // Decrease
teslaStock.setPrice(220.0); // Bigger decrease (triggers buy signal)

console.log(`\nFinal portfolio value: $${portfolio.getTotalValue().toFixed(2)}`);

console.log("\n" + "=".repeat(60));
console.log("Observer Pattern Demo Complete!");
console.log("=".repeat(60));
