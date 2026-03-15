/**
 * TRANSACTION SCRIPT
 *
 * Organizes business logic as procedures where each procedure handles
 * a single request from the presentation layer.
 *
 * Characteristics:
 * - One procedure per business transaction
 * - Directly works with the database
 * - Simple and straightforward
 * - Can lead to duplication as complexity grows
 */

// Simulated database
const db = {
  accounts: new Map<string, { id: string; balance: number }>([
    ["acc1", { id: "acc1", balance: 1000 }],
    ["acc2", { id: "acc2", balance: 500 }],
  ]),
};

// Transaction Scripts - each function handles one complete business operation

function deposit(accountId: string, amount: number): void {
  // Get account from database
  const account = db.accounts.get(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Validate
  if (amount <= 0) {
    throw new Error("Deposit amount must be positive");
  }

  // Update balance
  account.balance += amount;

  // Save to database
  db.accounts.set(accountId, account);

  console.log(`Deposited ${amount} to ${accountId}. New balance: ${account.balance}`);
}

function withdraw(accountId: string, amount: number): void {
  const account = db.accounts.get(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  if (amount <= 0) {
    throw new Error("Withdrawal amount must be positive");
  }

  if (account.balance < amount) {
    throw new Error("Insufficient funds");
  }

  account.balance -= amount;
  db.accounts.set(accountId, account);

  console.log(`Withdrew ${amount} from ${accountId}. New balance: ${account.balance}`);
}

function transfer(fromAccountId: string, toAccountId: string, amount: number): void {
  const fromAccount = db.accounts.get(fromAccountId);
  const toAccount = db.accounts.get(toAccountId);

  if (!fromAccount || !toAccount) {
    throw new Error("One or both accounts not found");
  }

  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }

  if (fromAccount.balance < amount) {
    throw new Error("Insufficient funds");
  }

  // Perform transfer
  fromAccount.balance -= amount;
  toAccount.balance += amount;

  // Save both accounts
  db.accounts.set(fromAccountId, fromAccount);
  db.accounts.set(toAccountId, toAccount);

  console.log(`Transferred ${amount} from ${fromAccountId} to ${toAccountId}`);
}

// Usage
console.log("=== Transaction Script Pattern ===\n");
deposit("acc1", 200);
withdraw("acc1", 100);
transfer("acc1", "acc2", 300);

// Make this file a module to avoid global scope pollution
export {};
