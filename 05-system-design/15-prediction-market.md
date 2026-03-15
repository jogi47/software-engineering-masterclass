# Prediction Market

Build an on-chain prediction market on Solana with outcome tokens, automated market making, and oracle-based resolution.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features & Requirements](#features--requirements)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Market Mechanics](#market-mechanics)
6. [On-chain Program Design](#on-chain-program-design)
7. [Core Implementation](#core-implementation)
8. [Oracle Integration](#oracle-integration)
9. [TypeScript Client](#typescript-client)
10. [Testing](#testing)
11. [Implementation Phases](#implementation-phases)
12. [Concepts Covered](#concepts-covered)
13. [Folder Structure](#folder-structure)
14. [Development Commands](#development-commands)

---

## Project Overview

### What is a Prediction Market?

A **prediction market** is a platform where users trade on the outcomes of future events:
- **Binary markets**: Yes/No outcomes (e.g., "Will BTC reach $100k by 2025?")
- **Categorical markets**: Multiple outcomes (e.g., "Who will win the election?")
- **Scalar markets**: Numeric ranges (e.g., "What will ETH price be?")

### How It Works

```
1. Market Creation
   "Will SOL reach $200 by Dec 31, 2025?"

2. Trading Phase
   - Users buy YES or NO tokens
   - Prices reflect probability (e.g., YES at $0.60 = 60% probability)
   - Automated Market Maker provides liquidity

3. Resolution
   - Oracle reports outcome (YES or NO)
   - Winning tokens redeem for $1
   - Losing tokens worth $0
```

### Why Prediction Markets?

| Use Case | Example |
|----------|---------|
| Price Discovery | Aggregate crowd wisdom on probabilities |
| Hedging | Insure against adverse outcomes |
| Information Markets | Incentivize accurate forecasting |
| Entertainment | Gamified speculation |

### Learning Outcomes

After building this project, you will understand:
- Outcome token mechanics (YES/NO tokens)
- CPMM (Constant Product Market Maker) for outcome pricing
- Oracle integration (Switchboard/Pyth)
- Market lifecycle (creation → trading → resolution → settlement)
- Collateralization and settlement math
- PDAs for market state management

---

## Features & Requirements

### MVP Features

| Feature | Description |
|---------|-------------|
| Create Market | Initialize binary prediction market with end date |
| Buy Outcome Tokens | Purchase YES or NO tokens using USDC |
| Sell Outcome Tokens | Sell tokens back to the AMM |
| Resolve Market | Oracle-triggered resolution |
| Claim Winnings | Redeem winning tokens for USDC |
| View Markets | List active and resolved markets |

### V2 Features (Future)

| Feature | Description |
|---------|-------------|
| Multi-outcome Markets | Support 3+ possible outcomes |
| Liquidity Provision | LP tokens for market makers |
| LMSR Market Maker | Logarithmic Market Scoring Rule |
| Governance | DAO-controlled market parameters |
| Fee Distribution | Protocol and creator fees |

---

## Tech Stack

### On-chain (Solana Program)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Rust | Smart contract logic |
| Framework | Anchor | Solana development framework |
| Token Standard | SPL Token | Outcome tokens |
| Oracle | Switchboard | External data resolution |
| Collateral | USDC (SPL) | Market collateral |

### Off-chain

| Component | Technology | Purpose |
|-----------|------------|---------|
| SDK | @solana/web3.js | Blockchain interaction |
| Client | TypeScript | Type-safe SDK |
| Frontend | React + Vite | User interface |
| Styling | TailwindCSS | UI components |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────┐ │
│  │ Market List │  │ Trade UI    │  │ Market Details               │ │
│  │             │  │             │  │ (Chart, Order Book, History) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬───────────────┘ │
└─────────┼────────────────┼─────────────────────────┼─────────────────┘
          │                │                         │
          └────────────────┼─────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                   TypeScript SDK                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ createMkt() │  │ buyTokens() │  │ getMarketInfo()             │  │
│  │ resolve()   │  │ sellTokens()│  │ getPrice()                  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                               │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 Prediction Market Program                      │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │ create_      │  │ buy_outcome  │  │ resolve_market       │ │  │
│  │  │ market       │  │              │  │                      │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │ sell_outcome │  │ claim_       │  │ cancel_market        │ │  │
│  │  │              │  │ winnings     │  │                      │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Market Accounts (PDAs)                      │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │ Market State │  │ YES Token    │  │ NO Token             │ │  │
│  │  │              │  │ Mint (PDA)   │  │ Mint (PDA)           │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐                          │  │
│  │  │ USDC Vault   │  │ AMM Reserves │                          │  │
│  │  │ (Collateral) │  │              │                          │  │
│  │  └──────────────┘  └──────────────┘                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Switchboard Oracle                          │  │
│  │                    (Resolution Data)                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Market Lifecycle

```
┌─────────────────┐
│   CREATED       │  Market initialized, trading not yet open
│                 │
└────────┬────────┘
         │ initialize_market()
         ▼
┌─────────────────┐
│   TRADING       │  Users can buy/sell outcome tokens
│                 │  AMM provides liquidity
│                 │
└────────┬────────┘
         │ resolve_market() [after end_time, oracle call]
         ▼
┌─────────────────┐
│   RESOLVED      │  Winning outcome determined
│                 │  Trading disabled
│                 │
└────────┬────────┘
         │ claim_winnings()
         ▼
┌─────────────────┐
│   SETTLED       │  All winnings claimed
│                 │  Market closed
│                 │
└─────────────────┘
```

---

## Market Mechanics

### Outcome Tokens

In a binary market:
- **YES tokens**: Pay $1 if outcome is YES, $0 otherwise
- **NO tokens**: Pay $1 if outcome is NO, $0 otherwise

Since YES + NO always equals $1:
- If YES costs $0.60, NO costs $0.40
- Prices represent implied probabilities

### CPMM for Prediction Markets

We use a modified constant product formula where:
- `yes_reserve * no_reserve = k` (constant)
- Total YES + NO tokens always backed by collateral

**Buy YES tokens:**
```
Input: amount_usdc to spend
1. Mint equal YES and NO from collateral
2. Sell NO to AMM, keeping YES

Output YES = no_reserve - k / (yes_reserve + input)
```

**Sell YES tokens:**
```
Input: yes_tokens to sell
1. Sell YES to AMM for NO
2. Redeem equal YES + NO for collateral

Output USDC = NO received (since YES + NO = $1)
```

### Price Calculation

```
YES price = no_reserve / (yes_reserve + no_reserve)
NO price = yes_reserve / (yes_reserve + no_reserve)

Example:
  yes_reserve = 1000
  no_reserve = 1500

  YES price = 1500 / 2500 = $0.60 (60% probability)
  NO price = 1000 / 2500 = $0.40 (40% probability)
```

---

## On-chain Program Design

### Account Structures

```rust
// programs/prediction-market/src/state.rs
use anchor_lang::prelude::*;

#[account]
pub struct Market {
    /// Market creator
    pub authority: Pubkey,
    /// Question/description hash (IPFS CID)
    pub question_hash: [u8; 32],
    /// YES token mint
    pub yes_mint: Pubkey,
    /// NO token mint
    pub no_mint: Pubkey,
    /// USDC vault (collateral)
    pub collateral_vault: Pubkey,
    /// USDC mint
    pub collateral_mint: Pubkey,
    /// Oracle account for resolution
    pub oracle: Pubkey,
    /// Market end time (Unix timestamp)
    pub end_time: i64,
    /// Resolution time (after end_time)
    pub resolution_time: i64,
    /// Market status
    pub status: MarketStatus,
    /// Winning outcome (set after resolution)
    pub winning_outcome: Option<Outcome>,
    /// AMM YES reserve
    pub yes_reserve: u64,
    /// AMM NO reserve
    pub no_reserve: u64,
    /// Total collateral deposited
    pub total_collateral: u64,
    /// Fee percentage (basis points, e.g., 100 = 1%)
    pub fee_bps: u16,
    /// Bump seed for PDA
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // question_hash
        32 + // yes_mint
        32 + // no_mint
        32 + // collateral_vault
        32 + // collateral_mint
        32 + // oracle
        8 +  // end_time
        8 +  // resolution_time
        1 +  // status
        2 +  // winning_outcome (Option<u8>)
        8 +  // yes_reserve
        8 +  // no_reserve
        8 +  // total_collateral
        2 +  // fee_bps
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Created,
    Trading,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Yes,
    No,
}

/// User position in a market
#[account]
pub struct UserPosition {
    pub market: Pubkey,
    pub user: Pubkey,
    pub yes_tokens: u64,
    pub no_tokens: u64,
    pub claimed: bool,
}

impl UserPosition {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}
```

### Instructions

| Instruction | Description | Accounts |
|-------------|-------------|----------|
| `create_market` | Initialize new prediction market | market, mints, vault, oracle, authority |
| `buy_outcome` | Buy YES or NO tokens | market, user, vault, mints, user_tokens |
| `sell_outcome` | Sell outcome tokens back | market, user, vault, mints, user_tokens |
| `resolve_market` | Oracle resolves outcome | market, oracle |
| `claim_winnings` | Redeem winning tokens | market, user, vault, user_tokens |
| `cancel_market` | Cancel unresolved market | market, authority |

### Errors

```rust
#[error_code]
pub enum PredictionError {
    #[msg("Market is not in trading status")]
    MarketNotTrading,
    #[msg("Market has not ended yet")]
    MarketNotEnded,
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    #[msg("Invalid oracle account")]
    InvalidOracle,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Market cancelled")]
    MarketCancelled,
}
```

---

## Core Implementation

### Program Entry Point

```rust
// programs/prediction-market/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};

declare_id!("PRED1111111111111111111111111111111111111");

pub mod state;
pub mod errors;

use state::*;
use errors::*;

#[program]
pub mod prediction_market {
    use super::*;

    /// Create a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        question_hash: [u8; 32],
        end_time: i64,
        resolution_time: i64,
        initial_liquidity: u64,
        fee_bps: u16,
    ) -> Result<()> {
        require!(end_time > Clock::get()?.unix_timestamp, PredictionError::MarketNotEnded);
        require!(resolution_time > end_time, PredictionError::InvalidOutcome);
        require!(initial_liquidity > 0, PredictionError::InsufficientCollateral);

        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.question_hash = question_hash;
        market.yes_mint = ctx.accounts.yes_mint.key();
        market.no_mint = ctx.accounts.no_mint.key();
        market.collateral_vault = ctx.accounts.collateral_vault.key();
        market.collateral_mint = ctx.accounts.collateral_mint.key();
        market.oracle = ctx.accounts.oracle.key();
        market.end_time = end_time;
        market.resolution_time = resolution_time;
        market.status = MarketStatus::Trading;
        market.winning_outcome = None;
        market.fee_bps = fee_bps;
        market.bump = ctx.bumps.market;

        // Initialize AMM with 50/50 odds
        // Deposit initial liquidity and mint equal YES/NO
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.authority_collateral.to_account_info(),
                    to: ctx.accounts.collateral_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            initial_liquidity,
        )?;

        market.total_collateral = initial_liquidity;
        market.yes_reserve = initial_liquidity;
        market.no_reserve = initial_liquidity;

        msg!("Market created: {:?}", market.key());
        Ok(())
    }

    /// Buy outcome tokens (YES or NO)
    pub fn buy_outcome(
        ctx: Context<BuyOutcome>,
        outcome: Outcome,
        collateral_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Trading, PredictionError::MarketNotTrading);
        require!(Clock::get()?.unix_timestamp < market.end_time, PredictionError::MarketNotEnded);

        // Calculate tokens to receive using CPMM
        let tokens_out = calculate_buy_amount(
            outcome,
            collateral_amount,
            market.yes_reserve,
            market.no_reserve,
            market.fee_bps,
        )?;

        require!(tokens_out >= min_tokens_out, PredictionError::SlippageExceeded);

        // Transfer collateral from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_collateral.to_account_info(),
                    to: ctx.accounts.collateral_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            collateral_amount,
        )?;

        // Update reserves
        market.total_collateral = market
            .total_collateral
            .checked_add(collateral_amount)
            .ok_or(PredictionError::MathOverflow)?;

        // Mint outcome tokens to user
        let seeds = &[
            b"market",
            market.question_hash.as_ref(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        match outcome {
            Outcome::Yes => {
                // Update AMM reserves: user buys YES, sells NO to pool
                market.yes_reserve = market
                    .yes_reserve
                    .checked_sub(tokens_out)
                    .ok_or(PredictionError::MathOverflow)?;
                market.no_reserve = market
                    .no_reserve
                    .checked_add(collateral_amount)
                    .ok_or(PredictionError::MathOverflow)?;

                token::mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.yes_mint.to_account_info(),
                            to: ctx.accounts.user_yes_tokens.to_account_info(),
                            authority: ctx.accounts.market.to_account_info(),
                        },
                        signer,
                    ),
                    tokens_out,
                )?;
            }
            Outcome::No => {
                // Update AMM reserves: user buys NO, sells YES to pool
                market.no_reserve = market
                    .no_reserve
                    .checked_sub(tokens_out)
                    .ok_or(PredictionError::MathOverflow)?;
                market.yes_reserve = market
                    .yes_reserve
                    .checked_add(collateral_amount)
                    .ok_or(PredictionError::MathOverflow)?;

                token::mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.no_mint.to_account_info(),
                            to: ctx.accounts.user_no_tokens.to_account_info(),
                            authority: ctx.accounts.market.to_account_info(),
                        },
                        signer,
                    ),
                    tokens_out,
                )?;
            }
        }

        emit!(OutcomePurchased {
            market: market.key(),
            user: ctx.accounts.user.key(),
            outcome,
            collateral_spent: collateral_amount,
            tokens_received: tokens_out,
        });

        Ok(())
    }

    /// Sell outcome tokens back to AMM
    pub fn sell_outcome(
        ctx: Context<SellOutcome>,
        outcome: Outcome,
        token_amount: u64,
        min_collateral_out: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Trading, PredictionError::MarketNotTrading);

        // Calculate collateral to receive
        let collateral_out = calculate_sell_amount(
            outcome,
            token_amount,
            market.yes_reserve,
            market.no_reserve,
            market.fee_bps,
        )?;

        require!(collateral_out >= min_collateral_out, PredictionError::SlippageExceeded);

        let seeds = &[
            b"market",
            market.question_hash.as_ref(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        // Burn tokens from user
        match outcome {
            Outcome::Yes => {
                token::burn(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        Burn {
                            mint: ctx.accounts.yes_mint.to_account_info(),
                            from: ctx.accounts.user_yes_tokens.to_account_info(),
                            authority: ctx.accounts.user.to_account_info(),
                        },
                    ),
                    token_amount,
                )?;

                // Update reserves
                market.yes_reserve = market
                    .yes_reserve
                    .checked_add(token_amount)
                    .ok_or(PredictionError::MathOverflow)?;
                market.no_reserve = market
                    .no_reserve
                    .checked_sub(collateral_out)
                    .ok_or(PredictionError::MathOverflow)?;
            }
            Outcome::No => {
                token::burn(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        Burn {
                            mint: ctx.accounts.no_mint.to_account_info(),
                            from: ctx.accounts.user_no_tokens.to_account_info(),
                            authority: ctx.accounts.user.to_account_info(),
                        },
                    ),
                    token_amount,
                )?;

                // Update reserves
                market.no_reserve = market
                    .no_reserve
                    .checked_add(token_amount)
                    .ok_or(PredictionError::MathOverflow)?;
                market.yes_reserve = market
                    .yes_reserve
                    .checked_sub(collateral_out)
                    .ok_or(PredictionError::MathOverflow)?;
            }
        }

        // Transfer collateral to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.collateral_vault.to_account_info(),
                    to: ctx.accounts.user_collateral.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            collateral_out,
        )?;

        market.total_collateral = market
            .total_collateral
            .checked_sub(collateral_out)
            .ok_or(PredictionError::MathOverflow)?;

        emit!(OutcomeSold {
            market: market.key(),
            user: ctx.accounts.user.key(),
            outcome,
            tokens_sold: token_amount,
            collateral_received: collateral_out,
        });

        Ok(())
    }

    /// Resolve market using oracle data
    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: Outcome) -> Result<()> {
        let market = &mut ctx.accounts.market;

        require!(market.status == MarketStatus::Trading, PredictionError::MarketNotTrading);
        require!(
            Clock::get()?.unix_timestamp >= market.end_time,
            PredictionError::MarketNotEnded
        );

        // In production, verify oracle data
        // For MVP, trust the oracle account signer
        require!(
            ctx.accounts.oracle.key() == market.oracle,
            PredictionError::InvalidOracle
        );

        market.status = MarketStatus::Resolved;
        market.winning_outcome = Some(outcome);

        emit!(MarketResolved {
            market: market.key(),
            winning_outcome: outcome,
            resolver: ctx.accounts.oracle.key(),
        });

        Ok(())
    }

    /// Claim winnings after resolution
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;

        require!(market.status == MarketStatus::Resolved, PredictionError::MarketNotTrading);

        let winning_outcome = market.winning_outcome.ok_or(PredictionError::InvalidOutcome)?;

        // Calculate winnings based on winning token balance
        let winnings = match winning_outcome {
            Outcome::Yes => ctx.accounts.user_yes_tokens.amount,
            Outcome::No => ctx.accounts.user_no_tokens.amount,
        };

        require!(winnings > 0, PredictionError::NothingToClaim);

        let seeds = &[
            b"market",
            market.question_hash.as_ref(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        // Burn winning tokens
        match winning_outcome {
            Outcome::Yes => {
                token::burn(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        Burn {
                            mint: ctx.accounts.yes_mint.to_account_info(),
                            from: ctx.accounts.user_yes_tokens.to_account_info(),
                            authority: ctx.accounts.user.to_account_info(),
                        },
                    ),
                    winnings,
                )?;
            }
            Outcome::No => {
                token::burn(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        Burn {
                            mint: ctx.accounts.no_mint.to_account_info(),
                            from: ctx.accounts.user_no_tokens.to_account_info(),
                            authority: ctx.accounts.user.to_account_info(),
                        },
                    ),
                    winnings,
                )?;
            }
        }

        // Transfer collateral (1:1 with winning tokens)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.collateral_vault.to_account_info(),
                    to: ctx.accounts.user_collateral.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            winnings,
        )?;

        emit!(WinningsClaimed {
            market: market.key(),
            user: ctx.accounts.user.key(),
            amount: winnings,
        });

        Ok(())
    }
}

/// Calculate tokens received when buying outcome
fn calculate_buy_amount(
    outcome: Outcome,
    collateral_in: u64,
    yes_reserve: u64,
    no_reserve: u64,
    fee_bps: u16,
) -> Result<u64> {
    // Apply fee
    let fee = collateral_in
        .checked_mul(fee_bps as u64)
        .ok_or(PredictionError::MathOverflow)?
        .checked_div(10000)
        .ok_or(PredictionError::MathOverflow)?;

    let amount_after_fee = collateral_in
        .checked_sub(fee)
        .ok_or(PredictionError::MathOverflow)?;

    // CPMM: tokens_out = reserve_out - (k / (reserve_in + amount_in))
    let k = (yes_reserve as u128)
        .checked_mul(no_reserve as u128)
        .ok_or(PredictionError::MathOverflow)?;

    let (reserve_in, reserve_out) = match outcome {
        Outcome::Yes => (no_reserve, yes_reserve),
        Outcome::No => (yes_reserve, no_reserve),
    };

    let new_reserve_in = (reserve_in as u128)
        .checked_add(amount_after_fee as u128)
        .ok_or(PredictionError::MathOverflow)?;

    let new_reserve_out = k
        .checked_div(new_reserve_in)
        .ok_or(PredictionError::MathOverflow)?;

    let tokens_out = (reserve_out as u128)
        .checked_sub(new_reserve_out)
        .ok_or(PredictionError::MathOverflow)?;

    Ok(tokens_out as u64)
}

/// Calculate collateral received when selling outcome
fn calculate_sell_amount(
    outcome: Outcome,
    tokens_in: u64,
    yes_reserve: u64,
    no_reserve: u64,
    fee_bps: u16,
) -> Result<u64> {
    // CPMM: collateral_out = reserve_opposite - (k / (reserve_same + tokens_in))
    let k = (yes_reserve as u128)
        .checked_mul(no_reserve as u128)
        .ok_or(PredictionError::MathOverflow)?;

    let (reserve_same, reserve_opposite) = match outcome {
        Outcome::Yes => (yes_reserve, no_reserve),
        Outcome::No => (no_reserve, yes_reserve),
    };

    let new_reserve_same = (reserve_same as u128)
        .checked_add(tokens_in as u128)
        .ok_or(PredictionError::MathOverflow)?;

    let new_reserve_opposite = k
        .checked_div(new_reserve_same)
        .ok_or(PredictionError::MathOverflow)?;

    let collateral_out = (reserve_opposite as u128)
        .checked_sub(new_reserve_opposite)
        .ok_or(PredictionError::MathOverflow)?;

    // Apply fee
    let fee = collateral_out
        .checked_mul(fee_bps as u128)
        .ok_or(PredictionError::MathOverflow)?
        .checked_div(10000)
        .ok_or(PredictionError::MathOverflow)?;

    let amount_after_fee = collateral_out
        .checked_sub(fee)
        .ok_or(PredictionError::MathOverflow)?;

    Ok(amount_after_fee as u64)
}
```

### Account Contexts

```rust
// programs/prediction-market/src/contexts.rs

#[derive(Accounts)]
#[instruction(question_hash: [u8; 32])]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [b"market", question_hash.as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"yes_mint", market.key().as_ref()],
        bump
    )]
    pub yes_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"no_mint", market.key().as_ref()],
        bump
    )]
    pub no_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = collateral_mint,
        token::authority = market,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    pub collateral_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority_collateral: Account<'info, TokenAccount>,

    /// CHECK: Oracle account for resolution
    pub oracle: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyOutcome<'info> {
    #[account(
        mut,
        seeds = [b"market", market.question_hash.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut, constraint = yes_mint.key() == market.yes_mint)]
    pub yes_mint: Account<'info, Mint>,

    #[account(mut, constraint = no_mint.key() == market.no_mint)]
    pub no_mint: Account<'info, Mint>,

    #[account(mut, constraint = collateral_vault.key() == market.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_collateral.mint == market.collateral_mint)]
    pub user_collateral: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_yes_tokens.mint == market.yes_mint)]
    pub user_yes_tokens: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_no_tokens.mint == market.no_mint)]
    pub user_no_tokens: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SellOutcome<'info> {
    #[account(
        mut,
        seeds = [b"market", market.question_hash.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut, constraint = yes_mint.key() == market.yes_mint)]
    pub yes_mint: Account<'info, Mint>,

    #[account(mut, constraint = no_mint.key() == market.no_mint)]
    pub no_mint: Account<'info, Mint>,

    #[account(mut, constraint = collateral_vault.key() == market.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_collateral.mint == market.collateral_mint)]
    pub user_collateral: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_yes_tokens.mint == market.yes_mint)]
    pub user_yes_tokens: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_no_tokens.mint == market.no_mint)]
    pub user_no_tokens: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market.question_hash.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    /// Oracle signer (in production, verify Switchboard feed)
    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        seeds = [b"market", market.question_hash.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut, constraint = yes_mint.key() == market.yes_mint)]
    pub yes_mint: Account<'info, Mint>,

    #[account(mut, constraint = no_mint.key() == market.no_mint)]
    pub no_mint: Account<'info, Mint>,

    #[account(mut, constraint = collateral_vault.key() == market.collateral_vault)]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_yes_tokens.mint == market.yes_mint)]
    pub user_yes_tokens: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_no_tokens.mint == market.no_mint)]
    pub user_no_tokens: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

### Events

```rust
// programs/prediction-market/src/events.rs

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub authority: Pubkey,
    pub end_time: i64,
}

#[event]
pub struct OutcomePurchased {
    pub market: Pubkey,
    pub user: Pubkey,
    pub outcome: Outcome,
    pub collateral_spent: u64,
    pub tokens_received: u64,
}

#[event]
pub struct OutcomeSold {
    pub market: Pubkey,
    pub user: Pubkey,
    pub outcome: Outcome,
    pub tokens_sold: u64,
    pub collateral_received: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winning_outcome: Outcome,
    pub resolver: Pubkey,
}

#[event]
pub struct WinningsClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}
```

---

## Oracle Integration

### Switchboard Integration

```rust
// programs/prediction-market/src/oracle.rs
use switchboard_v2::AggregatorAccountData;

/// Verify Switchboard oracle data for resolution
pub fn verify_oracle_resolution(
    oracle_account: &AccountInfo,
    expected_result: bool,
) -> Result<()> {
    let aggregator = AggregatorAccountData::new(oracle_account)?;

    // Get latest result
    let result = aggregator.get_result()?;

    // For binary markets, check if result > 0.5 means YES
    let oracle_says_yes = result.mantissa > 0;

    require!(
        (oracle_says_yes && expected_result) || (!oracle_says_yes && !expected_result),
        PredictionError::InvalidOracle
    );

    Ok(())
}

/// Example: Price feed oracle for "Will SOL > $200?"
pub fn verify_price_threshold(
    oracle_account: &AccountInfo,
    threshold: i128,
) -> Result<bool> {
    let aggregator = AggregatorAccountData::new(oracle_account)?;
    let result = aggregator.get_result()?;

    // result.mantissa is the price, result.scale is decimals
    let price = result.mantissa;

    Ok(price > threshold)
}
```

### Pyth Integration (Alternative)

```rust
use pyth_sdk_solana::load_price_feed_from_account_info;

pub fn get_pyth_price(price_account: &AccountInfo) -> Result<i64> {
    let price_feed = load_price_feed_from_account_info(price_account)
        .map_err(|_| PredictionError::InvalidOracle)?;

    let current_price = price_feed
        .get_current_price()
        .ok_or(PredictionError::InvalidOracle)?;

    Ok(current_price.price)
}
```

---

## TypeScript Client

### SDK Implementation

```typescript
// sdk/src/predictionMarket.ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { IDL, PredictionMarket } from './idl/prediction_market';
import { sha256 } from 'js-sha256';

export const PROGRAM_ID = new PublicKey('PRED1111111111111111111111111111111111111');

export enum Outcome {
  Yes = 0,
  No = 1,
}

export enum MarketStatus {
  Created = 0,
  Trading = 1,
  Resolved = 2,
  Cancelled = 3,
}

export interface MarketInfo {
  address: PublicKey;
  authority: PublicKey;
  questionHash: number[];
  yesMint: PublicKey;
  noMint: PublicKey;
  collateralVault: PublicKey;
  endTime: number;
  status: MarketStatus;
  winningOutcome: Outcome | null;
  yesReserve: BN;
  noReserve: BN;
  totalCollateral: BN;
  yesPrice: number;
  noPrice: number;
}

export interface TradeQuote {
  tokensOut: BN;
  pricePerToken: number;
  priceImpact: number;
  fee: BN;
}

export class PredictionMarketClient {
  private program: Program<PredictionMarket>;
  private connection: Connection;

  constructor(provider: AnchorProvider) {
    this.program = new Program(IDL, PROGRAM_ID, provider);
    this.connection = provider.connection;
  }

  /**
   * Get market PDA from question
   */
  static getMarketAddress(question: string): PublicKey {
    const questionHash = sha256.array(question);
    const [marketAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(questionHash)],
      PROGRAM_ID
    );
    return marketAddress;
  }

  /**
   * Get market info
   */
  async getMarketInfo(marketAddress: PublicKey): Promise<MarketInfo> {
    const market = await this.program.account.market.fetch(marketAddress);

    const yesReserve = market.yesReserve;
    const noReserve = market.noReserve;
    const total = yesReserve.add(noReserve);

    return {
      address: marketAddress,
      authority: market.authority,
      questionHash: Array.from(market.questionHash),
      yesMint: market.yesMint,
      noMint: market.noMint,
      collateralVault: market.collateralVault,
      endTime: market.endTime.toNumber(),
      status: market.status as MarketStatus,
      winningOutcome: market.winningOutcome ? market.winningOutcome.yes ? Outcome.Yes : Outcome.No : null,
      yesReserve,
      noReserve,
      totalCollateral: market.totalCollateral,
      yesPrice: noReserve.toNumber() / total.toNumber(),
      noPrice: yesReserve.toNumber() / total.toNumber(),
    };
  }

  /**
   * Calculate buy quote
   */
  getBuyQuote(
    marketInfo: MarketInfo,
    outcome: Outcome,
    collateralAmount: BN,
    feeBps: number = 100
  ): TradeQuote {
    const fee = collateralAmount.mul(new BN(feeBps)).div(new BN(10000));
    const amountAfterFee = collateralAmount.sub(fee);

    const k = marketInfo.yesReserve.mul(marketInfo.noReserve);

    const [reserveIn, reserveOut] =
      outcome === Outcome.Yes
        ? [marketInfo.noReserve, marketInfo.yesReserve]
        : [marketInfo.yesReserve, marketInfo.noReserve];

    const newReserveIn = reserveIn.add(amountAfterFee);
    const newReserveOut = k.div(newReserveIn);
    const tokensOut = reserveOut.sub(newReserveOut);

    const pricePerToken = collateralAmount.toNumber() / tokensOut.toNumber();

    // Price impact
    const currentPrice = outcome === Outcome.Yes
      ? marketInfo.yesPrice
      : marketInfo.noPrice;
    const priceImpact = Math.abs((pricePerToken - currentPrice) / currentPrice) * 100;

    return {
      tokensOut,
      pricePerToken,
      priceImpact,
      fee,
    };
  }

  /**
   * Create a new market
   */
  async createMarket(
    question: string,
    endTime: number,
    resolutionTime: number,
    initialLiquidity: BN,
    feeBps: number,
    oracle: PublicKey,
    collateralMint: PublicKey,
    authority: PublicKey
  ): Promise<Transaction> {
    const questionHash = Array.from(sha256.array(question));
    const marketAddress = PredictionMarketClient.getMarketAddress(question);

    const [yesMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('yes_mint'), marketAddress.toBuffer()],
      PROGRAM_ID
    );

    const [noMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('no_mint'), marketAddress.toBuffer()],
      PROGRAM_ID
    );

    const [collateralVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketAddress.toBuffer()],
      PROGRAM_ID
    );

    const authorityCollateral = await getAssociatedTokenAddress(
      collateralMint,
      authority
    );

    const tx = await this.program.methods
      .createMarket(
        questionHash,
        new BN(endTime),
        new BN(resolutionTime),
        initialLiquidity,
        feeBps
      )
      .accounts({
        market: marketAddress,
        yesMint,
        noMint,
        collateralVault,
        collateralMint,
        authorityCollateral,
        oracle,
        authority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return tx;
  }

  /**
   * Buy outcome tokens
   */
  async buyOutcome(
    marketAddress: PublicKey,
    outcome: Outcome,
    collateralAmount: BN,
    minTokensOut: BN,
    user: PublicKey
  ): Promise<Transaction> {
    const marketInfo = await this.getMarketInfo(marketAddress);

    const userCollateral = await getAssociatedTokenAddress(
      marketInfo.collateralMint,
      user
    );
    const userYesTokens = await getAssociatedTokenAddress(
      marketInfo.yesMint,
      user
    );
    const userNoTokens = await getAssociatedTokenAddress(
      marketInfo.noMint,
      user
    );

    const tx = new Transaction();

    // Create token accounts if needed
    const yesAccountInfo = await this.connection.getAccountInfo(userYesTokens);
    if (!yesAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          user,
          userYesTokens,
          user,
          marketInfo.yesMint
        )
      );
    }

    const noAccountInfo = await this.connection.getAccountInfo(userNoTokens);
    if (!noAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          user,
          userNoTokens,
          user,
          marketInfo.noMint
        )
      );
    }

    const buyIx = await this.program.methods
      .buyOutcome({ [outcome === Outcome.Yes ? 'yes' : 'no']: {} }, collateralAmount, minTokensOut)
      .accounts({
        market: marketAddress,
        yesMint: marketInfo.yesMint,
        noMint: marketInfo.noMint,
        collateralVault: marketInfo.collateralVault,
        userCollateral,
        userYesTokens,
        userNoTokens,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    tx.add(buyIx);
    return tx;
  }

  /**
   * Claim winnings after resolution
   */
  async claimWinnings(
    marketAddress: PublicKey,
    user: PublicKey
  ): Promise<Transaction> {
    const marketInfo = await this.getMarketInfo(marketAddress);

    const userCollateral = await getAssociatedTokenAddress(
      marketInfo.collateralMint,
      user
    );
    const userYesTokens = await getAssociatedTokenAddress(
      marketInfo.yesMint,
      user
    );
    const userNoTokens = await getAssociatedTokenAddress(
      marketInfo.noMint,
      user
    );

    const tx = await this.program.methods
      .claimWinnings()
      .accounts({
        market: marketAddress,
        yesMint: marketInfo.yesMint,
        noMint: marketInfo.noMint,
        collateralVault: marketInfo.collateralVault,
        userCollateral,
        userYesTokens,
        userNoTokens,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return tx;
  }

  /**
   * Get all active markets
   */
  async getActiveMarkets(): Promise<MarketInfo[]> {
    const markets = await this.program.account.market.all([
      {
        memcmp: {
          offset: 8 + 32 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 8, // offset to status
          bytes: '1', // Trading status
        },
      },
    ]);

    return Promise.all(
      markets.map((m) => this.getMarketInfo(m.publicKey))
    );
  }
}
```

---

## Testing

### Anchor Tests

```typescript
// tests/prediction-market.ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PredictionMarket } from '../target/types/prediction_market';
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { expect } from 'chai';
import { sha256 } from 'js-sha256';

describe('Prediction Market', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PredictionMarket as Program<PredictionMarket>;

  let collateralMint: anchor.web3.PublicKey;
  let marketAddress: anchor.web3.PublicKey;
  let yesMint: anchor.web3.PublicKey;
  let noMint: anchor.web3.PublicKey;
  let collateralVault: anchor.web3.PublicKey;

  const user = anchor.web3.Keypair.generate();
  const oracle = anchor.web3.Keypair.generate();
  const question = 'Will SOL reach $200 by end of 2025?';
  const questionHash = Array.from(sha256.array(question));

  before(async () => {
    // Airdrop SOL
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Create USDC mock
    collateralMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    // Derive PDAs
    [marketAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(questionHash)],
      program.programId
    );

    [yesMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('yes_mint'), marketAddress.toBuffer()],
      program.programId
    );

    [noMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('no_mint'), marketAddress.toBuffer()],
      program.programId
    );

    [collateralVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketAddress.toBuffer()],
      program.programId
    );
  });

  it('Creates a market', async () => {
    const userCollateral = await createAccount(
      provider.connection,
      user,
      collateralMint,
      user.publicKey
    );

    // Mint initial collateral
    await mintTo(
      provider.connection,
      user,
      collateralMint,
      userCollateral,
      user,
      1_000_000_000 // 1000 USDC
    );

    const endTime = Math.floor(Date.now() / 1000) + 86400; // 1 day
    const resolutionTime = endTime + 3600; // 1 hour after

    await program.methods
      .createMarket(
        questionHash,
        new anchor.BN(endTime),
        new anchor.BN(resolutionTime),
        new anchor.BN(100_000_000), // 100 USDC initial liquidity
        100 // 1% fee
      )
      .accounts({
        market: marketAddress,
        yesMint,
        noMint,
        collateralVault,
        collateralMint,
        authorityCollateral: userCollateral,
        oracle: oracle.publicKey,
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    const market = await program.account.market.fetch(marketAddress);
    expect(market.status).to.deep.equal({ trading: {} });
    expect(market.yesReserve.toNumber()).to.equal(100_000_000);
    expect(market.noReserve.toNumber()).to.equal(100_000_000);
  });

  it('Buys YES tokens', async () => {
    const userCollateral = await createAccount(
      provider.connection,
      user,
      collateralMint,
      user.publicKey
    );

    const userYesTokens = await createAccount(
      provider.connection,
      user,
      yesMint,
      user.publicKey
    );

    const userNoTokens = await createAccount(
      provider.connection,
      user,
      noMint,
      user.publicKey
    );

    // Mint USDC for user
    await mintTo(
      provider.connection,
      user,
      collateralMint,
      userCollateral,
      user,
      50_000_000 // 50 USDC
    );

    await program.methods
      .buyOutcome({ yes: {} }, new anchor.BN(10_000_000), new anchor.BN(1)) // 10 USDC
      .accounts({
        market: marketAddress,
        yesMint,
        noMint,
        collateralVault,
        userCollateral,
        userYesTokens,
        userNoTokens,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const yesBalance = await getAccount(provider.connection, userYesTokens);
    expect(Number(yesBalance.amount)).to.be.greaterThan(0);

    // Check price moved
    const market = await program.account.market.fetch(marketAddress);
    const yesPrice =
      market.noReserve.toNumber() /
      (market.yesReserve.toNumber() + market.noReserve.toNumber());
    expect(yesPrice).to.be.greaterThan(0.5); // YES is now more expensive
  });

  it('Resolves market to YES', async () => {
    // Fast forward time (in test, we skip the end_time check)
    // In production, use a test validator with time manipulation

    await program.methods
      .resolveMarket({ yes: {} })
      .accounts({
        market: marketAddress,
        oracle: oracle.publicKey,
      })
      .signers([oracle])
      .rpc();

    const market = await program.account.market.fetch(marketAddress);
    expect(market.status).to.deep.equal({ resolved: {} });
    expect(market.winningOutcome).to.deep.equal({ yes: {} });
  });

  it('Claims winnings', async () => {
    const userCollateral = await createAccount(
      provider.connection,
      user,
      collateralMint,
      user.publicKey
    );

    const userYesTokens = await createAccount(
      provider.connection,
      user,
      yesMint,
      user.publicKey
    );

    const userNoTokens = await createAccount(
      provider.connection,
      user,
      noMint,
      user.publicKey
    );

    const yesBefore = await getAccount(provider.connection, userYesTokens);
    const yesAmount = yesBefore.amount;

    if (yesAmount > 0) {
      await program.methods
        .claimWinnings()
        .accounts({
          market: marketAddress,
          yesMint,
          noMint,
          collateralVault,
          userCollateral,
          userYesTokens,
          userNoTokens,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const collateralAfter = await getAccount(provider.connection, userCollateral);
      expect(Number(collateralAfter.amount)).to.equal(Number(yesAmount));
    }
  });
});
```

---

## Implementation Phases

### Phase 1: Core Program (Week 1-2)
- [ ] Set up Anchor project
- [ ] Implement market creation
- [ ] Implement CPMM buy/sell math
- [ ] Write buy_outcome instruction
- [ ] Write sell_outcome instruction

### Phase 2: Resolution & Settlement (Week 2-3)
- [ ] Implement resolve_market
- [ ] Implement claim_winnings
- [ ] Add market cancellation
- [ ] Write unit tests

### Phase 3: Oracle Integration (Week 3-4)
- [ ] Integrate Switchboard SDK
- [ ] Create oracle verification logic
- [ ] Test with mock oracle
- [ ] Test with live Switchboard feed

### Phase 4: TypeScript SDK (Week 4)
- [ ] Generate IDL types
- [ ] Implement client class
- [ ] Add quote calculations
- [ ] Write SDK tests

### Phase 5: Frontend (Week 5-6)
- [ ] Build market list view
- [ ] Build trade interface
- [ ] Add portfolio view
- [ ] Real-time price updates

---

## Concepts Covered

| Concept | Where Applied |
|---------|---------------|
| **Outcome Tokens** | YES/NO tokens representing market positions |
| **CPMM** | Constant product market maker for pricing |
| **Oracles** | Switchboard/Pyth for external data |
| **Market Lifecycle** | Creation → Trading → Resolution → Settlement |
| **Collateralization** | USDC backing for all positions |
| **PDAs** | Market state, token mints, vaults |
| **SPL Tokens** | Outcome token minting/burning |
| **Event Emission** | Trade and resolution events |

---

## Folder Structure

```
prediction-market/
├── programs/
│   └── prediction-market/
│       ├── src/
│       │   ├── lib.rs           # Program entry
│       │   ├── state.rs         # Account structures
│       │   ├── contexts.rs      # Account contexts
│       │   ├── errors.rs        # Custom errors
│       │   ├── events.rs        # Event definitions
│       │   └── oracle.rs        # Oracle integration
│       └── Cargo.toml
├── sdk/
│   └── src/
│       ├── predictionMarket.ts  # Client SDK
│       └── idl/
│           └── prediction_market.ts
├── app/
│   └── src/
│       ├── components/
│       │   ├── MarketList.tsx
│       │   ├── TradePanel.tsx
│       │   └── MarketChart.tsx
│       └── pages/
│           ├── Markets.tsx
│           └── Market.tsx
├── tests/
│   └── prediction-market.ts
├── Anchor.toml
└── package.json
```

---

## Development Commands

```bash
# Setup
anchor init prediction-market
cd prediction-market

# Build
anchor build

# Test
anchor test

# Deploy
anchor deploy --provider.cluster devnet

# Generate IDL
anchor idl parse -f programs/prediction-market/src/lib.rs -o sdk/src/idl/prediction_market.json

# Run frontend
cd app && npm run dev
```

---

## Summary

This prediction market project teaches core DeFi and market design concepts:

1. **Market Mechanics**: Outcome tokens, binary markets, settlement
2. **AMM Design**: CPMM for prediction market pricing
3. **Oracle Integration**: External data for trustless resolution
4. **Solana Patterns**: PDAs, CPIs, SPL Token management
5. **Financial Math**: Price calculations, collateralization

Prediction markets demonstrate how blockchain enables trustless information aggregation and incentive-aligned forecasting.
