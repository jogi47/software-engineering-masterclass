# Solana Wallet

Build a non-custodial Solana wallet with HD key derivation, transaction signing, and token support.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features & Requirements](#features--requirements)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Cryptography Fundamentals](#cryptography-fundamentals)
6. [Core Implementation](#core-implementation)
7. [Transaction Building](#transaction-building)
8. [React Frontend](#react-frontend)
9. [Security Considerations](#security-considerations)
10. [Testing](#testing)
11. [Implementation Phases](#implementation-phases)
12. [Concepts Covered](#concepts-covered)
13. [Folder Structure](#folder-structure)
14. [Development Commands](#development-commands)

---

## Project Overview

### What is a Crypto Wallet?

A cryptocurrency wallet is software that:
- **Generates and stores private keys** - The secret that proves ownership
- **Derives public addresses** - Where others send funds
- **Signs transactions** - Authorizes transfers and interactions
- **Broadcasts transactions** - Sends signed transactions to the network

### Custodial vs Non-Custodial

| Aspect | Custodial (Exchange) | Non-Custodial (This Project) |
|--------|---------------------|------------------------------|
| Key Storage | Exchange holds keys | User holds keys |
| Control | Exchange controls funds | User controls funds |
| Recovery | Email/password | Seed phrase only |
| Privacy | KYC required | Pseudonymous |
| Risk | Exchange hack/bankruptcy | User loses seed phrase |

### HD Wallets (BIP32/39/44)

**Hierarchical Deterministic (HD) wallets** derive unlimited key pairs from a single seed:

```
Seed Phrase (12/24 words)
         │
         ▼
    Master Key
         │
         ▼
    ┌────┴────┐
    │         │
Account 0  Account 1  ...
    │         │
    ▼         ▼
 Key Pair   Key Pair
```

**Derivation Path for Solana**: `m/44'/501'/0'/0'`
- `44'` - BIP44 purpose
- `501'` - Solana coin type
- `0'` - Account index
- `0'` - Change (unused in Solana)

### Learning Outcomes

After building this project, you will understand:
- BIP39 mnemonic generation and validation
- Ed25519 elliptic curve cryptography
- HD key derivation (BIP32/44)
- Solana transaction structure and signing
- Secure key storage and encryption
- Token account management (SPL tokens)
- React state management for wallets

---

## Features & Requirements

### MVP Features

| Feature | Description |
|---------|-------------|
| Create Wallet | Generate new seed phrase and derive keypair |
| Import Wallet | Restore from existing seed phrase |
| View Balance | Display SOL and token balances |
| Send SOL | Transfer SOL to another address |
| Send Tokens | Transfer SPL tokens |
| Transaction History | View past transactions |
| Multiple Accounts | Derive multiple accounts from seed |

### V2 Features (Future)

| Feature | Description |
|---------|-------------|
| Hardware Wallet | Ledger/Trezor integration |
| dApp Browser | Connect to Solana dApps |
| WalletConnect | QR code connection protocol |
| Transaction Simulation | Preview transaction effects |
| NFT Display | View and transfer NFTs |
| Address Book | Save frequent addresses |

---

## Tech Stack

### Core Libraries

| Component | Technology | Purpose |
|-----------|------------|---------|
| Mnemonic | bip39 | Seed phrase generation |
| Key Derivation | ed25519-hd-key | HD key derivation |
| Cryptography | tweetnacl | Ed25519 signing |
| Solana SDK | @solana/web3.js | Blockchain interaction |
| Token SDK | @solana/spl-token | SPL token operations |

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React + TypeScript | UI components |
| State | Zustand | Wallet state management |
| Styling | TailwindCSS | UI styling |
| Encryption | crypto-js | Keystore encryption |
| Storage | IndexedDB | Secure local storage |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Wallet UI   │  │ Send/Receive│  │ Transaction History     │  │
│  │             │  │             │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          └────────────────┼──────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    Wallet Core SDK                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   WalletManager                              ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐││
│  │  │ KeyManager │  │ TxBuilder  │  │ BalanceService         │││
│  │  │            │  │            │  │                        │││
│  │  │ • generate │  │ • transfer │  │ • getSOLBalance        │││
│  │  │ • derive   │  │ • tokenTx  │  │ • getTokenBalances     │││
│  │  │ • sign     │  │ • simulate │  │ • subscribeBalance     │││
│  │  └────────────┘  └────────────┘  └────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                   Secure Storage Layer                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  EncryptedKeystore                           ││
│  │                                                              ││
│  │  { encryptedSeed: AES-256-GCM(seed, password) }             ││
│  │  { accounts: [{ name, derivationPath, pubkey }] }           ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                          IndexedDB                               │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ RPC Endpoint (Helius, QuickNode, etc.)                   │   │
│  │                                                          │   │
│  │ • getBalance        • sendTransaction                    │   │
│  │ • getTokenAccounts  • getTransaction                     │   │
│  │ • getRecentBlockhash                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Derivation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    BIP39 Mnemonic Generation                      │
│                                                                   │
│  1. Generate 128-256 bits of entropy                             │
│  2. Calculate checksum (SHA256)                                  │
│  3. Map to word list (2048 words)                                │
│                                                                   │
│  "abandon ability able about above absent absorb abstract..."    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BIP39 Seed Generation                          │
│                                                                   │
│  PBKDF2(mnemonic + "mnemonic" + passphrase, 2048 rounds)        │
│                                                                   │
│  64-byte seed                                                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    HD Key Derivation (BIP32/44)                   │
│                                                                   │
│  Derivation Path: m/44'/501'/0'/0'                               │
│                                                                   │
│  m (master) ──► 44' (purpose) ──► 501' (Solana) ──►             │
│  0' (account) ──► 0' (change)                                    │
│                                                                   │
│  Result: 32-byte Ed25519 private key                             │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Ed25519 Key Pair                               │
│                                                                   │
│  Private Key (32 bytes) ──► Public Key (32 bytes)                │
│                                                                   │
│  Solana Address = Base58(PublicKey)                              │
│  Example: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Cryptography Fundamentals

### BIP39 Word List

The BIP39 standard uses a list of 2048 words. Each word represents 11 bits:
- 12 words = 128 bits entropy + 4 bit checksum
- 24 words = 256 bits entropy + 8 bit checksum

```typescript
// Example: How mnemonic maps to entropy
// "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

// Binary representation:
// abandon (index 0)    = 00000000000
// abandon (index 0)    = 00000000000
// ...
// about (index 3)      = 00000000011

// Checksum: First 4 bits of SHA256(entropy)
```

### Ed25519 Curve

Solana uses **Ed25519** (Edwards-curve Digital Signature Algorithm):
- 32-byte private keys
- 32-byte public keys
- 64-byte signatures
- Fast signing and verification
- Resistant to side-channel attacks

```
Private Key (32 bytes)
       │
       ▼
  Ed25519 Scalar Multiplication
       │
       ▼
Public Key (32 bytes) ───► Base58 Encode ───► Solana Address
```

---

## Core Implementation

### Key Manager

```typescript
// src/core/keyManager.ts
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

export interface DerivedAccount {
  publicKey: string;
  derivationPath: string;
  name: string;
}

export interface KeyManagerOptions {
  mnemonic?: string;
  passphrase?: string;
}

export class KeyManager {
  private seed: Buffer;
  private mnemonic: string;

  private constructor(mnemonic: string, seed: Buffer) {
    this.mnemonic = mnemonic;
    this.seed = seed;
  }

  /**
   * Generate a new wallet with random mnemonic
   */
  static generate(strength: 128 | 256 = 128, passphrase: string = ''): KeyManager {
    // Generate random mnemonic (128 bits = 12 words, 256 bits = 24 words)
    const mnemonic = bip39.generateMnemonic(strength);
    return KeyManager.fromMnemonic(mnemonic, passphrase);
  }

  /**
   * Restore wallet from existing mnemonic
   */
  static fromMnemonic(mnemonic: string, passphrase: string = ''): KeyManager {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Convert mnemonic to seed (64 bytes)
    // PBKDF2 with 2048 iterations, salt = "mnemonic" + passphrase
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);

    return new KeyManager(mnemonic, seed);
  }

  /**
   * Get the mnemonic phrase (SENSITIVE - handle with care)
   */
  getMnemonic(): string {
    return this.mnemonic;
  }

  /**
   * Derive a keypair at a specific account index
   * Default Solana derivation path: m/44'/501'/accountIndex'/0'
   */
  deriveKeypair(accountIndex: number = 0): Keypair {
    const path = `m/44'/501'/${accountIndex}'/0'`;
    return this.deriveFromPath(path);
  }

  /**
   * Derive keypair from custom derivation path
   */
  deriveFromPath(path: string): Keypair {
    // Use ed25519-hd-key to derive from BIP32 path
    const derivedSeed = derivePath(path, this.seed.toString('hex')).key;

    // Create Solana keypair from the 32-byte seed
    return Keypair.fromSeed(derivedSeed);
  }

  /**
   * Derive multiple accounts
   */
  deriveAccounts(count: number): DerivedAccount[] {
    const accounts: DerivedAccount[] = [];

    for (let i = 0; i < count; i++) {
      const keypair = this.deriveKeypair(i);
      accounts.push({
        publicKey: keypair.publicKey.toBase58(),
        derivationPath: `m/44'/501'/${i}'/0'`,
        name: `Account ${i + 1}`,
      });
    }

    return accounts;
  }

  /**
   * Sign a message with the keypair at the given index
   */
  sign(message: Uint8Array, accountIndex: number = 0): Uint8Array {
    const keypair = this.deriveKeypair(accountIndex);
    return nacl.sign.detached(message, keypair.secretKey);
  }

  /**
   * Verify a signature
   */
  static verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean {
    return nacl.sign.detached.verify(message, signature, publicKey);
  }

  /**
   * Clear sensitive data from memory
   */
  destroy(): void {
    // Overwrite sensitive data
    this.seed.fill(0);
    this.mnemonic = '';
  }
}
```

### Encrypted Keystore

```typescript
// src/core/keystore.ts
import CryptoJS from 'crypto-js';

export interface EncryptedKeystore {
  version: number;
  encryptedMnemonic: string;
  salt: string;
  iv: string;
  accounts: {
    name: string;
    derivationPath: string;
    publicKey: string;
  }[];
  createdAt: number;
}

export interface KeystoreOptions {
  iterations?: number;
}

const DEFAULT_OPTIONS: KeystoreOptions = {
  iterations: 100000, // PBKDF2 iterations
};

export class Keystore {
  /**
   * Encrypt mnemonic with password and create keystore
   */
  static async create(
    mnemonic: string,
    password: string,
    accounts: { name: string; derivationPath: string; publicKey: string }[],
    options: KeystoreOptions = DEFAULT_OPTIONS
  ): Promise<EncryptedKeystore> {
    // Generate random salt and IV
    const salt = CryptoJS.lib.WordArray.random(32).toString();
    const iv = CryptoJS.lib.WordArray.random(16).toString();

    // Derive encryption key from password using PBKDF2
    const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
      keySize: 256 / 32, // 256 bits
      iterations: options.iterations!,
      hasher: CryptoJS.algo.SHA256,
    });

    // Encrypt mnemonic with AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(mnemonic, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      version: 1,
      encryptedMnemonic: encrypted.ciphertext.toString(),
      salt,
      iv,
      accounts,
      createdAt: Date.now(),
    };
  }

  /**
   * Decrypt keystore and retrieve mnemonic
   */
  static async decrypt(
    keystore: EncryptedKeystore,
    password: string,
    options: KeystoreOptions = DEFAULT_OPTIONS
  ): Promise<string> {
    // Derive key from password
    const key = CryptoJS.PBKDF2(
      password,
      CryptoJS.enc.Hex.parse(keystore.salt),
      {
        keySize: 256 / 32,
        iterations: options.iterations!,
        hasher: CryptoJS.algo.SHA256,
      }
    );

    // Decrypt mnemonic
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(keystore.encryptedMnemonic),
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: CryptoJS.enc.Hex.parse(keystore.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const mnemonic = decrypted.toString(CryptoJS.enc.Utf8);

    if (!mnemonic) {
      throw new Error('Invalid password');
    }

    return mnemonic;
  }

  /**
   * Change keystore password
   */
  static async changePassword(
    keystore: EncryptedKeystore,
    oldPassword: string,
    newPassword: string
  ): Promise<EncryptedKeystore> {
    const mnemonic = await Keystore.decrypt(keystore, oldPassword);
    return Keystore.create(mnemonic, newPassword, keystore.accounts);
  }
}
```

### Local Storage Service

```typescript
// src/core/storage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { EncryptedKeystore } from './keystore';

interface WalletDB extends DBSchema {
  keystores: {
    key: string;
    value: EncryptedKeystore;
  };
  settings: {
    key: string;
    value: any;
  };
}

export class WalletStorage {
  private db: IDBPDatabase<WalletDB> | null = null;
  private dbName = 'solana-wallet';

  async init(): Promise<void> {
    this.db = await openDB<WalletDB>(this.dbName, 1, {
      upgrade(db) {
        db.createObjectStore('keystores');
        db.createObjectStore('settings');
      },
    });
  }

  async saveKeystore(id: string, keystore: EncryptedKeystore): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('keystores', keystore, id);
  }

  async getKeystore(id: string): Promise<EncryptedKeystore | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get('keystores', id);
  }

  async getAllKeystores(): Promise<EncryptedKeystore[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('keystores');
  }

  async deleteKeystore(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('keystores', id);
  }

  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('settings', value, key);
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get('settings', key);
  }
}
```

---

## Transaction Building

### Transaction Service

```typescript
// src/core/transactionService.ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export interface TransferParams {
  from: Keypair;
  to: string;
  amount: number; // In SOL or token units
  mint?: string; // Token mint address (undefined for SOL)
}

export interface TransactionResult {
  signature: string;
  slot: number;
  confirmations: number;
}

export class TransactionService {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get SOL balance in lamports
   */
  async getBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address);
    return this.connection.getBalance(pubkey);
  }

  /**
   * Get SOL balance in SOL units
   */
  async getBalanceInSOL(address: string): Promise<number> {
    const lamports = await this.getBalance(address);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Get all token accounts for an address
   */
  async getTokenAccounts(address: string): Promise<TokenBalance[]> {
    const pubkey = new PublicKey(address);

    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: TOKEN_PROGRAM_ID }
    );

    return tokenAccounts.value.map((account) => {
      const info = account.account.data.parsed.info;
      return {
        mint: info.mint,
        balance: info.tokenAmount.uiAmount,
        decimals: info.tokenAmount.decimals,
        tokenAccount: account.pubkey.toBase58(),
      };
    });
  }

  /**
   * Transfer SOL
   */
  async transferSOL(params: TransferParams): Promise<TransactionResult> {
    const { from, to, amount } = params;
    const toPubkey = new PublicKey(to);

    // Create transfer instruction
    const instruction = SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL),
    });

    // Build and send transaction
    return this.buildAndSendTransaction([instruction], [from]);
  }

  /**
   * Transfer SPL token
   */
  async transferToken(params: TransferParams): Promise<TransactionResult> {
    const { from, to, amount, mint } = params;

    if (!mint) {
      throw new Error('Mint address required for token transfer');
    }

    const mintPubkey = new PublicKey(mint);
    const toPubkey = new PublicKey(to);

    // Get or create associated token accounts
    const fromATA = await getAssociatedTokenAddress(mintPubkey, from.publicKey);
    const toATA = await getAssociatedTokenAddress(mintPubkey, toPubkey);

    const instructions: TransactionInstruction[] = [];

    // Check if destination ATA exists
    const toATAInfo = await this.connection.getAccountInfo(toATA);
    if (!toATAInfo) {
      // Create ATA for recipient
      instructions.push(
        createAssociatedTokenAccountInstruction(
          from.publicKey, // payer
          toATA, // associated token account
          toPubkey, // owner
          mintPubkey // mint
        )
      );
    }

    // Get token decimals
    const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);
    const decimals = (mintInfo.value?.data as any).parsed.info.decimals;

    // Create transfer instruction
    const transferAmount = Math.floor(amount * Math.pow(10, decimals));
    instructions.push(
      createTransferInstruction(
        fromATA,
        toATA,
        from.publicKey,
        transferAmount
      )
    );

    return this.buildAndSendTransaction(instructions, [from]);
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(instructions: TransactionInstruction[]): Promise<number> {
    const { blockhash } = await this.connection.getLatestBlockhash();

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: PublicKey.default,
    });

    instructions.forEach((ix) => tx.add(ix));

    const fee = await this.connection.getFeeForMessage(tx.compileMessage());
    return fee.value || 5000; // Default 5000 lamports
  }

  /**
   * Simulate transaction before sending
   */
  async simulateTransaction(
    instructions: TransactionInstruction[],
    feePayer: PublicKey
  ): Promise<SimulationResult> {
    const { blockhash } = await this.connection.getLatestBlockhash();

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer,
    });

    instructions.forEach((ix) => tx.add(ix));

    const simulation = await this.connection.simulateTransaction(tx);

    return {
      success: simulation.value.err === null,
      error: simulation.value.err,
      logs: simulation.value.logs || [],
      unitsConsumed: simulation.value.unitsConsumed || 0,
    };
  }

  /**
   * Build and send transaction
   */
  private async buildAndSendTransaction(
    instructions: TransactionInstruction[],
    signers: Keypair[]
  ): Promise<TransactionResult> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    // Add priority fee for faster confirmation
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000, // Adjust based on network conditions
    });

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: signers[0].publicKey,
    });

    transaction.add(priorityFeeIx);
    instructions.forEach((ix) => transaction.add(ix));

    // Sign and send
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      signers,
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    // Get transaction details
    const txInfo = await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    return {
      signature,
      slot: txInfo?.slot || 0,
      confirmations: 1,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    address: string,
    limit: number = 20
  ): Promise<TransactionHistory[]> {
    const pubkey = new PublicKey(address);

    const signatures = await this.connection.getSignaturesForAddress(pubkey, {
      limit,
    });

    const transactions: TransactionHistory[] = [];

    for (const sig of signatures) {
      const tx = await this.connection.getParsedTransaction(sig.signature, {
        commitment: 'confirmed',
      });

      if (tx) {
        transactions.push({
          signature: sig.signature,
          slot: tx.slot,
          timestamp: tx.blockTime,
          fee: tx.meta?.fee || 0,
          status: tx.meta?.err ? 'failed' : 'success',
          instructions: tx.transaction.message.instructions.map((ix: any) => ({
            program: ix.programId?.toBase58() || ix.program,
            type: ix.parsed?.type || 'unknown',
          })),
        });
      }
    }

    return transactions;
  }
}

// Types
interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
  tokenAccount: string;
}

interface SimulationResult {
  success: boolean;
  error: any;
  logs: string[];
  unitsConsumed: number;
}

interface TransactionHistory {
  signature: string;
  slot: number;
  timestamp: number | null;
  fee: number;
  status: 'success' | 'failed';
  instructions: { program: string; type: string }[];
}
```

---

## React Frontend

### Wallet Store (Zustand)

```typescript
// src/store/walletStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KeyManager } from '../core/keyManager';
import { Keystore, EncryptedKeystore } from '../core/keystore';
import { TransactionService } from '../core/transactionService';
import { Keypair } from '@solana/web3.js';

interface Account {
  name: string;
  publicKey: string;
  derivationPath: string;
}

interface WalletState {
  // State
  isUnlocked: boolean;
  keystore: EncryptedKeystore | null;
  accounts: Account[];
  activeAccountIndex: number;
  balances: Record<string, number>;
  network: 'mainnet' | 'devnet' | 'testnet';

  // Private (not persisted)
  keyManager: KeyManager | null;
  transactionService: TransactionService | null;

  // Actions
  createWallet: (password: string, wordCount: 12 | 24) => Promise<string>;
  importWallet: (mnemonic: string, password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => void;
  addAccount: (name: string) => Promise<void>;
  setActiveAccount: (index: number) => void;
  refreshBalances: () => Promise<void>;
  sendSOL: (to: string, amount: number) => Promise<string>;
  sendToken: (to: string, amount: number, mint: string) => Promise<string>;
  setNetwork: (network: 'mainnet' | 'devnet' | 'testnet') => void;
  getActiveKeypair: () => Keypair | null;
}

const RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      isUnlocked: false,
      keystore: null,
      accounts: [],
      activeAccountIndex: 0,
      balances: {},
      network: 'devnet',
      keyManager: null,
      transactionService: null,

      createWallet: async (password: string, wordCount: 12 | 24) => {
        const strength = wordCount === 24 ? 256 : 128;
        const keyManager = KeyManager.generate(strength);
        const mnemonic = keyManager.getMnemonic();

        // Derive first account
        const derivedAccounts = keyManager.deriveAccounts(1);
        const accounts = derivedAccounts.map((acc, i) => ({
          name: `Account ${i + 1}`,
          publicKey: acc.publicKey,
          derivationPath: acc.derivationPath,
        }));

        // Create encrypted keystore
        const keystore = await Keystore.create(mnemonic, password, accounts);

        // Initialize transaction service
        const transactionService = new TransactionService(
          RPC_URLS[get().network]
        );

        set({
          keystore,
          accounts,
          keyManager,
          transactionService,
          isUnlocked: true,
        });

        return mnemonic;
      },

      importWallet: async (mnemonic: string, password: string) => {
        const keyManager = KeyManager.fromMnemonic(mnemonic);

        // Derive first account
        const derivedAccounts = keyManager.deriveAccounts(1);
        const accounts = derivedAccounts.map((acc, i) => ({
          name: `Account ${i + 1}`,
          publicKey: acc.publicKey,
          derivationPath: acc.derivationPath,
        }));

        const keystore = await Keystore.create(mnemonic, password, accounts);
        const transactionService = new TransactionService(
          RPC_URLS[get().network]
        );

        set({
          keystore,
          accounts,
          keyManager,
          transactionService,
          isUnlocked: true,
        });
      },

      unlockWallet: async (password: string) => {
        const { keystore, network } = get();
        if (!keystore) throw new Error('No wallet found');

        const mnemonic = await Keystore.decrypt(keystore, password);
        const keyManager = KeyManager.fromMnemonic(mnemonic);
        const transactionService = new TransactionService(RPC_URLS[network]);

        set({
          keyManager,
          transactionService,
          isUnlocked: true,
        });

        // Refresh balances after unlock
        get().refreshBalances();
      },

      lockWallet: () => {
        const { keyManager } = get();
        if (keyManager) {
          keyManager.destroy();
        }

        set({
          keyManager: null,
          isUnlocked: false,
        });
      },

      addAccount: async (name: string) => {
        const { keyManager, accounts, keystore } = get();
        if (!keyManager || !keystore) throw new Error('Wallet not unlocked');

        const newIndex = accounts.length;
        const keypair = keyManager.deriveKeypair(newIndex);

        const newAccount = {
          name,
          publicKey: keypair.publicKey.toBase58(),
          derivationPath: `m/44'/501'/${newIndex}'/0'`,
        };

        const updatedAccounts = [...accounts, newAccount];

        // Update keystore with new account
        const mnemonic = keyManager.getMnemonic();
        const updatedKeystore = await Keystore.create(
          mnemonic,
          '', // Password required to re-encrypt
          updatedAccounts.map((a) => ({
            name: a.name,
            derivationPath: a.derivationPath,
            publicKey: a.publicKey,
          }))
        );

        set({
          accounts: updatedAccounts,
          keystore: updatedKeystore,
        });
      },

      setActiveAccount: (index: number) => {
        set({ activeAccountIndex: index });
        get().refreshBalances();
      },

      refreshBalances: async () => {
        const { transactionService, accounts, activeAccountIndex } = get();
        if (!transactionService || accounts.length === 0) return;

        const activeAccount = accounts[activeAccountIndex];
        const balance = await transactionService.getBalanceInSOL(
          activeAccount.publicKey
        );

        set({
          balances: {
            ...get().balances,
            [activeAccount.publicKey]: balance,
          },
        });
      },

      sendSOL: async (to: string, amount: number) => {
        const { keyManager, transactionService, activeAccountIndex } = get();
        if (!keyManager || !transactionService) {
          throw new Error('Wallet not unlocked');
        }

        const keypair = keyManager.deriveKeypair(activeAccountIndex);
        const result = await transactionService.transferSOL({
          from: keypair,
          to,
          amount,
        });

        // Refresh balance after send
        get().refreshBalances();

        return result.signature;
      },

      sendToken: async (to: string, amount: number, mint: string) => {
        const { keyManager, transactionService, activeAccountIndex } = get();
        if (!keyManager || !transactionService) {
          throw new Error('Wallet not unlocked');
        }

        const keypair = keyManager.deriveKeypair(activeAccountIndex);
        const result = await transactionService.transferToken({
          from: keypair,
          to,
          amount,
          mint,
        });

        return result.signature;
      },

      setNetwork: (network: 'mainnet' | 'devnet' | 'testnet') => {
        const transactionService = new TransactionService(RPC_URLS[network]);
        set({ network, transactionService });
        get().refreshBalances();
      },

      getActiveKeypair: () => {
        const { keyManager, activeAccountIndex } = get();
        if (!keyManager) return null;
        return keyManager.deriveKeypair(activeAccountIndex);
      },
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        keystore: state.keystore,
        accounts: state.accounts,
        activeAccountIndex: state.activeAccountIndex,
        network: state.network,
      }),
    }
  )
);
```

### Wallet Component

```tsx
// src/components/Wallet.tsx
import React, { useEffect, useState } from 'react';
import { useWalletStore } from '../store/walletStore';

export function Wallet() {
  const {
    isUnlocked,
    accounts,
    activeAccountIndex,
    balances,
    network,
    unlockWallet,
    lockWallet,
    sendSOL,
    refreshBalances,
    setNetwork,
  } = useWalletStore();

  const [password, setPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const activeAccount = accounts[activeAccountIndex];
  const balance = activeAccount ? balances[activeAccount.publicKey] || 0 : 0;

  useEffect(() => {
    if (isUnlocked) {
      refreshBalances();
      const interval = setInterval(refreshBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked, refreshBalances]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await unlockWallet(password);
      setPassword('');
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const signature = await sendSOL(recipient, parseFloat(amount));
      alert(`Transaction sent: ${signature}`);
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Unlock Wallet</h2>
        <form onSubmit={handleUnlock}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full p-3 border rounded mb-4"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
          >
            Unlock
          </button>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Wallet</h2>
        <div className="flex gap-2">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as any)}
            className="p-2 border rounded text-sm"
          >
            <option value="mainnet">Mainnet</option>
            <option value="devnet">Devnet</option>
            <option value="testnet">Testnet</option>
          </select>
          <button
            onClick={lockWallet}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            Lock
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <p className="text-sm text-gray-500">{activeAccount?.name}</p>
        <p className="font-mono text-sm truncate">{activeAccount?.publicKey}</p>
        <p className="text-3xl font-bold mt-2">{balance.toFixed(4)} SOL</p>
      </div>

      {/* Send Form */}
      <form onSubmit={handleSend}>
        <h3 className="font-semibold mb-2">Send SOL</h3>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address"
          className="w-full p-3 border rounded mb-2"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (SOL)"
          step="0.0001"
          className="w-full p-3 border rounded mb-4"
        />
        <button
          type="submit"
          disabled={sending || !recipient || !amount}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {/* Copy Address Button */}
      <button
        onClick={() => navigator.clipboard.writeText(activeAccount?.publicKey || '')}
        className="w-full mt-4 p-3 border rounded hover:bg-gray-50"
      >
        Copy Address
      </button>
    </div>
  );
}
```

### Create Wallet Component

```tsx
// src/components/CreateWallet.tsx
import React, { useState } from 'react';
import { useWalletStore } from '../store/walletStore';

export function CreateWallet() {
  const { createWallet } = useWalletStore();
  const [step, setStep] = useState<'create' | 'backup' | 'verify'>('create');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [mnemonic, setMnemonic] = useState('');
  const [verifyWords, setVerifyWords] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const newMnemonic = await createWallet(password, wordCount);
      setMnemonic(newMnemonic);
      setStep('backup');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerify = () => {
    const words = mnemonic.split(' ');
    const indicesToVerify = [0, 3, 7]; // Verify words 1, 4, 8

    for (const index of indicesToVerify) {
      if (verifyWords[index] !== words[index]) {
        setError('Verification failed. Please check your backup.');
        return;
      }
    }

    // Success - wallet is already created
    window.location.reload();
  };

  if (step === 'backup') {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Backup Recovery Phrase</h2>
        <p className="text-red-500 mb-4">
          Write down these words in order and store them safely.
          Never share them with anyone!
        </p>

        <div className="grid grid-cols-3 gap-2 mb-6 p-4 bg-gray-50 rounded">
          {mnemonic.split(' ').map((word, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-400 w-6">{i + 1}.</span>
              <span className="font-mono">{word}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep('verify')}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          I've Written It Down
        </button>
      </div>
    );
  }

  if (step === 'verify') {
    const indicesToVerify = [0, 3, 7];

    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Verify Recovery Phrase</h2>
        <p className="mb-4">Enter the following words to verify your backup:</p>

        {indicesToVerify.map((index) => (
          <div key={index} className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              Word #{index + 1}
            </label>
            <input
              type="text"
              value={verifyWords[index] || ''}
              onChange={(e) =>
                setVerifyWords({ ...verifyWords, [index]: e.target.value })
              }
              className="w-full p-3 border rounded"
            />
          </div>
        ))}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleVerify}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          Verify & Complete
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Create New Wallet</h2>

      <form onSubmit={handleCreate}>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Recovery Phrase Length
          </label>
          <select
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value) as 12 | 24)}
            className="w-full p-3 border rounded"
          >
            <option value={12}>12 Words (Standard)</option>
            <option value={24}>24 Words (More Secure)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full p-3 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full p-3 border rounded"
          />
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          Create Wallet
        </button>
      </form>
    </div>
  );
}
```

---

## Security Considerations

### Key Security Best Practices

```typescript
// src/utils/security.ts

/**
 * Secure memory clearing
 * Note: This is best-effort in JavaScript - consider WebAssembly for critical apps
 */
export function clearSensitiveString(str: string): void {
  // Strings are immutable in JS, but we can try to minimize exposure
  // For production, consider using typed arrays
}

/**
 * Password strength validator
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters');

  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  return {
    valid: score >= 4,
    score,
    feedback,
  };
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Sanitize user input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
```

### Security Checklist

| Risk | Mitigation |
|------|------------|
| Key exposure in memory | Clear sensitive data after use, use secure enclaves when available |
| Keyloggers | Use on-screen keyboard for seed phrase entry |
| Clipboard sniffing | Clear clipboard after copying addresses |
| Phishing | Verify transaction details before signing |
| XSS attacks | Sanitize all inputs, use CSP headers |
| Local storage theft | Encrypt keystore with strong password |

---

## Testing

### Unit Tests

```typescript
// src/__tests__/keyManager.test.ts
import { KeyManager } from '../core/keyManager';
import * as bip39 from 'bip39';

describe('KeyManager', () => {
  const testMnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  describe('generate', () => {
    it('should generate valid 12-word mnemonic', () => {
      const keyManager = KeyManager.generate(128);
      const mnemonic = keyManager.getMnemonic();

      expect(mnemonic.split(' ')).toHaveLength(12);
      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
    });

    it('should generate valid 24-word mnemonic', () => {
      const keyManager = KeyManager.generate(256);
      const mnemonic = keyManager.getMnemonic();

      expect(mnemonic.split(' ')).toHaveLength(24);
      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
    });
  });

  describe('fromMnemonic', () => {
    it('should restore wallet from valid mnemonic', () => {
      const keyManager = KeyManager.fromMnemonic(testMnemonic);
      expect(keyManager.getMnemonic()).toBe(testMnemonic);
    });

    it('should throw on invalid mnemonic', () => {
      expect(() => {
        KeyManager.fromMnemonic('invalid mnemonic phrase');
      }).toThrow('Invalid mnemonic phrase');
    });
  });

  describe('deriveKeypair', () => {
    it('should derive consistent keypairs', () => {
      const keyManager = KeyManager.fromMnemonic(testMnemonic);

      const keypair1 = keyManager.deriveKeypair(0);
      const keypair2 = keyManager.deriveKeypair(0);

      expect(keypair1.publicKey.toBase58()).toBe(keypair2.publicKey.toBase58());
    });

    it('should derive different keypairs for different accounts', () => {
      const keyManager = KeyManager.fromMnemonic(testMnemonic);

      const keypair0 = keyManager.deriveKeypair(0);
      const keypair1 = keyManager.deriveKeypair(1);

      expect(keypair0.publicKey.toBase58()).not.toBe(
        keypair1.publicKey.toBase58()
      );
    });

    it('should derive known address from test mnemonic', () => {
      const keyManager = KeyManager.fromMnemonic(testMnemonic);
      const keypair = keyManager.deriveKeypair(0);

      // Known derived address for this mnemonic
      expect(keypair.publicKey.toBase58()).toBe(
        '2gSP4jgbxT8tKjYg1YELQKWEGhqmYGjUPu7csPHLLLBp'
      );
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify messages', () => {
      const keyManager = KeyManager.fromMnemonic(testMnemonic);
      const message = new TextEncoder().encode('Hello, Solana!');

      const signature = keyManager.sign(message, 0);
      const keypair = keyManager.deriveKeypair(0);

      const isValid = KeyManager.verify(
        message,
        signature,
        keypair.publicKey.toBytes()
      );

      expect(isValid).toBe(true);
    });
  });
});
```

### Keystore Tests

```typescript
// src/__tests__/keystore.test.ts
import { Keystore } from '../core/keystore';

describe('Keystore', () => {
  const testMnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const testPassword = 'testPassword123';
  const testAccounts = [
    {
      name: 'Account 1',
      derivationPath: "m/44'/501'/0'/0'",
      publicKey: '2gSP4jgbxT8tKjYg1YELQKWEGhqmYGjUPu7csPHLLLBp',
    },
  ];

  describe('create and decrypt', () => {
    it('should encrypt and decrypt mnemonic', async () => {
      const keystore = await Keystore.create(
        testMnemonic,
        testPassword,
        testAccounts
      );

      expect(keystore.encryptedMnemonic).toBeDefined();
      expect(keystore.encryptedMnemonic).not.toBe(testMnemonic);

      const decrypted = await Keystore.decrypt(keystore, testPassword);
      expect(decrypted).toBe(testMnemonic);
    });

    it('should fail with wrong password', async () => {
      const keystore = await Keystore.create(
        testMnemonic,
        testPassword,
        testAccounts
      );

      await expect(Keystore.decrypt(keystore, 'wrongPassword')).rejects.toThrow(
        'Invalid password'
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const keystore = await Keystore.create(
        testMnemonic,
        testPassword,
        testAccounts
      );

      const newPassword = 'newPassword456';
      const newKeystore = await Keystore.changePassword(
        keystore,
        testPassword,
        newPassword
      );

      // Old password should fail
      await expect(Keystore.decrypt(newKeystore, testPassword)).rejects.toThrow();

      // New password should work
      const decrypted = await Keystore.decrypt(newKeystore, newPassword);
      expect(decrypted).toBe(testMnemonic);
    });
  });
});
```

---

## Implementation Phases

### Phase 1: Core Cryptography (Week 1)
- [ ] Implement BIP39 mnemonic generation
- [ ] Implement HD key derivation
- [ ] Implement Ed25519 signing
- [ ] Write unit tests for key operations

### Phase 2: Keystore & Storage (Week 1-2)
- [ ] Implement encrypted keystore
- [ ] Set up IndexedDB storage
- [ ] Implement password-based encryption
- [ ] Add key export/import

### Phase 3: Transaction Support (Week 2-3)
- [ ] Implement SOL transfers
- [ ] Implement SPL token transfers
- [ ] Add transaction simulation
- [ ] Implement transaction history

### Phase 4: React Frontend (Week 3-4)
- [ ] Set up Zustand store
- [ ] Build wallet creation flow
- [ ] Build unlock/lock UI
- [ ] Build send/receive UI

### Phase 5: Polish (Week 4)
- [ ] Add error handling
- [ ] Add loading states
- [ ] Security hardening
- [ ] Testing and documentation

---

## Concepts Covered

| Concept | Where Applied |
|---------|---------------|
| **BIP39** | Mnemonic generation and validation |
| **BIP32/44** | HD key derivation paths |
| **Ed25519** | Elliptic curve cryptography for signing |
| **PBKDF2** | Password-based key derivation for encryption |
| **AES-256** | Symmetric encryption for keystore |
| **Base58** | Solana address encoding |
| **Transaction Signing** | Authorizing on-chain transactions |
| **SPL Tokens** | Token account management |
| **React State** | Zustand for wallet state |

---

## Folder Structure

```
wallet/
├── src/
│   ├── core/
│   │   ├── keyManager.ts        # Key generation and derivation
│   │   ├── keystore.ts          # Encrypted storage
│   │   ├── storage.ts           # IndexedDB wrapper
│   │   └── transactionService.ts # Blockchain interactions
│   ├── store/
│   │   └── walletStore.ts       # Zustand state
│   ├── components/
│   │   ├── Wallet.tsx           # Main wallet UI
│   │   ├── CreateWallet.tsx     # Wallet creation flow
│   │   ├── ImportWallet.tsx     # Import from seed
│   │   ├── SendForm.tsx         # Send transaction form
│   │   └── TransactionHistory.tsx
│   ├── utils/
│   │   └── security.ts          # Security utilities
│   ├── __tests__/
│   │   ├── keyManager.test.ts
│   │   └── keystore.test.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Development Commands

```bash
# Setup
npm create vite@latest wallet -- --template react-ts
cd wallet
npm install @solana/web3.js @solana/spl-token bip39 ed25519-hd-key tweetnacl crypto-js zustand idb

# Install dev dependencies
npm install -D @types/crypto-js tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

---

## Summary

This wallet project teaches core cryptographic and blockchain concepts:

1. **Cryptography**: BIP39 mnemonics, Ed25519 curves, HD derivation, AES encryption
2. **Key Management**: Secure generation, storage, and derivation of keys
3. **Blockchain Interaction**: Transaction building, signing, and broadcasting
4. **Security**: Password-based encryption, secure storage, input validation
5. **React Patterns**: Zustand state management, form handling, async operations

Building a non-custodial wallet provides deep understanding of how cryptocurrency security works at the fundamental level.
