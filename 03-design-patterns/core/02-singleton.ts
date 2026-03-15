/**
 * Singleton Pattern
 * Category: Creational
 *
 * Definition:
 * The Singleton pattern ensures a class has only one instance and provides
 * a global point of access to it. It's one of the simplest design patterns
 * but must be used carefully to avoid issues.
 *
 * When to use:
 * - When exactly one instance of a class is needed (database connection, logger)
 * - When that instance should be accessible from a well-known access point
 * - When the sole instance should be extensible by subclassing
 *
 * Key Benefits:
 * - Controlled access to sole instance
 * - Reduced namespace pollution (vs global variables)
 * - Permits refinement of operations and representation
 * - Can allow a variable number of instances if needed
 *
 * Cautions:
 * - Can make unit testing difficult (hidden dependencies)
 * - Violates Single Responsibility Principle (controls instantiation + business logic)
 * - Can cause issues in multithreaded environments
 */

// ============================================================================
// BASIC SINGLETON IMPLEMENTATION
// ============================================================================

/**
 * Logger - A classic Singleton use case.
 *
 * Implementation details:
 * 1. Private static instance holds the single instance
 * 2. Private constructor prevents external instantiation
 * 3. Static getInstance() method provides global access point
 */
class Logger {
  // The single instance, stored as a static property
  private static instance: Logger | null = null;

  // Array to store log entries (simulating a log file)
  private logs: string[] = [];

  // Log level configuration
  private logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR" = "INFO";

  /**
   * Private constructor - KEY to the Singleton pattern!
   * This prevents anyone from using 'new Logger()' outside this class.
   */
  private constructor() {
    console.log("Logger instance created (this only happens once!)");
  }

  /**
   * Static method to get the singleton instance.
   * This is the global access point for the Logger.
   *
   * Uses "lazy initialization" - instance is created only when first needed.
   */
  public static getInstance(): Logger {
    // Check if instance already exists
    if (Logger.instance === null) {
      // First call - create the instance
      Logger.instance = new Logger();
    }
    // Return the existing (or newly created) instance
    return Logger.instance;
  }

  /**
   * Set the minimum log level to display
   */
  public setLogLevel(level: "DEBUG" | "INFO" | "WARN" | "ERROR"): void {
    this.logLevel = level;
    console.log(`Log level set to: ${level}`);
  }

  /**
   * Log a debug message
   */
  public debug(message: string): void {
    if (this.shouldLog("DEBUG")) {
      this.writeLog("DEBUG", message);
    }
  }

  /**
   * Log an info message
   */
  public info(message: string): void {
    if (this.shouldLog("INFO")) {
      this.writeLog("INFO", message);
    }
  }

  /**
   * Log a warning message
   */
  public warn(message: string): void {
    if (this.shouldLog("WARN")) {
      this.writeLog("WARN", message);
    }
  }

  /**
   * Log an error message
   */
  public error(message: string): void {
    if (this.shouldLog("ERROR")) {
      this.writeLog("ERROR", message);
    }
  }

  /**
   * Helper to check if a log level should be displayed
   */
  private shouldLog(level: "DEBUG" | "INFO" | "WARN" | "ERROR"): boolean {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  /**
   * Internal method to write log entries
   */
  private writeLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${message}`;
    this.logs.push(entry);
    console.log(entry);
  }

  /**
   * Get all log entries
   */
  public getLogs(): string[] {
    return [...this.logs]; // Return a copy to prevent external modification
  }

  /**
   * Get total number of log entries
   */
  public getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    console.log("All logs cleared");
  }
}

// ============================================================================
// DATABASE CONNECTION SINGLETON
// ============================================================================

/**
 * DatabaseConnection - Another common Singleton use case.
 * Ensures only one database connection exists throughout the application.
 */
class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;

  private host: string;
  private port: number;
  private connected: boolean = false;
  private queryCount: number = 0;

  private constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
    console.log(`Database connection configured for ${host}:${port}`);
  }

  /**
   * Get or create the database instance.
   * First call sets the configuration, subsequent calls ignore parameters.
   */
  public static getInstance(
    host: string = "localhost",
    port: number = 5432
  ): DatabaseConnection {
    if (DatabaseConnection.instance === null) {
      DatabaseConnection.instance = new DatabaseConnection(host, port);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connect to the database
   */
  public connect(): void {
    if (this.connected) {
      console.log("Already connected to database");
      return;
    }
    // Simulate connection
    console.log(`Connecting to database at ${this.host}:${this.port}...`);
    this.connected = true;
    console.log("Connected successfully!");
  }

  /**
   * Disconnect from the database
   */
  public disconnect(): void {
    if (!this.connected) {
      console.log("Not connected to database");
      return;
    }
    console.log("Disconnecting from database...");
    this.connected = false;
    console.log("Disconnected");
  }

  /**
   * Execute a query (simulated)
   */
  public query(sql: string): string {
    if (!this.connected) {
      throw new Error("Not connected to database!");
    }
    this.queryCount++;
    console.log(`Executing query #${this.queryCount}: ${sql}`);
    return `Result of: ${sql}`;
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get total queries executed
   */
  public getQueryCount(): number {
    return this.queryCount;
  }

  /**
   * Reset the singleton (useful for testing)
   */
  public static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.disconnect();
    }
    DatabaseConnection.instance = null;
    console.log("Database singleton reset");
  }
}

// ============================================================================
// CONFIGURATION MANAGER SINGLETON
// ============================================================================

/**
 * ConfigManager - Application configuration singleton.
 * Provides centralized access to configuration settings.
 */
class ConfigManager {
  private static instance: ConfigManager | null = null;

  // Configuration stored as key-value pairs
  private config: Map<string, string | number | boolean> = new Map();

  private constructor() {
    // Load default configuration
    this.loadDefaults();
    console.log("ConfigManager initialized with default settings");
  }

  public static getInstance(): ConfigManager {
    if (ConfigManager.instance === null) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load default configuration values
   */
  private loadDefaults(): void {
    this.config.set("app.name", "MyApp");
    this.config.set("app.version", "1.0.0");
    this.config.set("app.debug", false);
    this.config.set("server.port", 3000);
    this.config.set("server.timeout", 30000);
  }

  /**
   * Get a configuration value
   */
  public get<T>(key: string, defaultValue?: T): T {
    if (this.config.has(key)) {
      return this.config.get(key) as T;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Configuration key not found: ${key}`);
  }

  /**
   * Set a configuration value
   */
  public set(key: string, value: string | number | boolean): void {
    this.config.set(key, value);
    console.log(`Config updated: ${key} = ${value}`);
  }

  /**
   * Check if a configuration key exists
   */
  public has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Get all configuration keys
   */
  public getAllKeys(): string[] {
    return Array.from(this.config.keys());
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("SINGLETON PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Logger Singleton Demo ---
console.log("\n--- Logger Singleton Demo ---\n");

// Get logger instance from different parts of the "application"
const logger1 = Logger.getInstance();
const logger2 = Logger.getInstance();

// Verify both references point to the same instance
console.log(`Are logger1 and logger2 the same instance? ${logger1 === logger2}`);

// Use the logger
logger1.setLogLevel("DEBUG");
logger1.debug("This is a debug message");
logger1.info("Application started");
logger2.warn("This warning uses logger2, but it's the same instance!");
logger1.error("An error occurred");

console.log(`\nTotal logs: ${logger1.getLogCount()}`);

// --- Database Singleton Demo ---
console.log("\n--- Database Singleton Demo ---\n");

// Get database connection from different "modules"
const db1 = DatabaseConnection.getInstance("prod-server.com", 5432);
const db2 = DatabaseConnection.getInstance("other-server.com", 3306); // Parameters ignored!

console.log(`Are db1 and db2 the same instance? ${db1 === db2}`);

db1.connect();
db1.query("SELECT * FROM users");
db2.query("INSERT INTO logs VALUES (...)"); // Uses same connection!

console.log(`Total queries: ${db1.getQueryCount()}`);

db1.disconnect();

// --- ConfigManager Singleton Demo ---
console.log("\n--- ConfigManager Singleton Demo ---\n");

const config = ConfigManager.getInstance();

console.log(`App Name: ${config.get<string>("app.name")}`);
console.log(`Server Port: ${config.get<number>("server.port")}`);
console.log(`Debug Mode: ${config.get<boolean>("app.debug")}`);

// Update configuration
config.set("app.debug", true);
config.set("server.port", 8080);

// Get from "another module" - same instance, same config
const configFromAnotherModule = ConfigManager.getInstance();
console.log(`\nDebug Mode (from another module): ${configFromAnotherModule.get<boolean>("app.debug")}`);

console.log("\n" + "=".repeat(60));
console.log("Singleton Pattern Demo Complete!");
console.log("=".repeat(60));
