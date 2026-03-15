# DEX - Constant Product AMM (Uniswap-style)

Build a decentralized exchange on Solana using the constant product automated market maker model.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features & Requirements](#features--requirements)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [On-chain Program Design](#on-chain-program-design)
6. [Core Implementation](#core-implementation)
7. [TypeScript Client SDK](#typescript-client-sdk)
8. [Testing](#testing)
9. [Implementation Phases](#implementation-phases)
10. [Web3 Concepts Covered](#web3-concepts-covered)
11. [Folder Structure](#folder-structure)
12. [Development Commands](#development-commands)

---

## Project Overview

### What is a DEX?

A **Decentralized Exchange (DEX)** allows users to trade tokens directly on-chain without intermediaries. Unlike centralized exchanges, DEXs:
- Are non-custodial (users control their funds)
- Have no KYC requirements
- Are permissionless (anyone can trade or provide liquidity)
- Are transparent (all trades are on-chain)

### AMM vs Order Book

| Aspect | Order Book (CEX/Serum) | AMM (Uniswap/Raydium) |
|--------|------------------------|----------------------|
| Price Discovery | Bid/ask matching | Mathematical formula |
| Liquidity | Market makers | Liquidity providers (LPs) |
| Complexity | High | Low |
| Capital Efficiency | High | Lower (unless concentrated) |
| MEV Risk | Front-running | Sandwich attacks |

### Constant Product Formula

The **constant product** formula is: `x * y = k`

Where:
- `x` = reserve of token A in pool
- `y` = reserve of token B in pool
- `k` = constant (invariant)

When swapping `dx` of token A for `dy` of token B:
```
(x + dx) * (y - dy) = k
dy = y - k/(x + dx)
dy = y * dx / (x + dx)
```

### Learning Outcomes

After building this project, you will understand:
- AMM mathematics and swap calculations
- Liquidity pool mechanics and LP tokens
- Slippage and price impact
- Impermanent loss concept
- PDAs (Program Derived Addresses) on Solana
- SPL Token program and CPI (Cross-Program Invocation)
- Anchor framework for Solana development

---

## Features & Requirements

### MVP Features

| Feature | Description |
|---------|-------------|
| Create Pool | Initialize a new liquidity pool for a token pair |
| Add Liquidity | Deposit tokens and receive LP tokens |
| Remove Liquidity | Burn LP tokens and withdraw proportional tokens |
| Swap | Exchange one token for another |
| Price Query | Get current exchange rate |

### V2 Features (Future)

| Feature | Description |
|---------|-------------|
| Multi-hop Swaps | Route through multiple pools for best price |
| Fee Tiers | Different fee levels (0.05%, 0.3%, 1%) |
| Protocol Fees | Fee collection for protocol treasury |
| Price Oracles | TWAP (Time-Weighted Average Price) |
| Concentrated Liquidity | Capital efficient liquidity ranges |

---

## Tech Stack

### On-chain (Solana Program)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Rust | Smart contract logic |
| Framework | Anchor | Solana development framework |
| Token Standard | SPL Token | Fungible token operations |
| Math | u128/u64 | Fixed-point arithmetic |

### Off-chain (Client)

| Component | Technology | Purpose |
|-----------|------------|---------|
| SDK | @solana/web3.js | Blockchain interaction |
| Client | TypeScript | Type-safe client SDK |
| Frontend | React + Vite | User interface |
| Wallet | @solana/wallet-adapter | Wallet connection |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Swap UI     │  │ Liquidity   │  │ Pool Analytics          │  │
│  │             │  │ Management  │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          └────────────────┼──────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                   TypeScript SDK                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ swap()      │  │ addLiq()    │  │ getPoolInfo()           │  │
│  │ quote()     │  │ removeLiq() │  │ calculatePrice()        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    AMM Program                               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │ initialize   │  │ swap         │  │ add_liquidity    │  ││
│  │  │ _pool        │  │              │  │                  │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  │  ┌──────────────┐                                          ││
│  │  │ remove_      │                                          ││
│  │  │ liquidity    │                                          ││
│  │  └──────────────┘                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Pool Accounts (PDAs)                      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │ Pool State   │  │ Token Vault  │  │ Token Vault      │  ││
│  │  │              │  │ A (PDA)      │  │ B (PDA)          │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  │  ┌──────────────┐                                          ││
│  │  │ LP Token     │                                          ││
│  │  │ Mint (PDA)   │                                          ││
│  │  └──────────────┘                                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Swap Flow

```
User                    AMM Program              Token Program
  │                          │                        │
  │  swap(amount_in, min_out)│                        │
  │─────────────────────────>│                        │
  │                          │                        │
  │                          │  1. Validate inputs    │
  │                          │  2. Calculate output   │
  │                          │     using x*y=k        │
  │                          │  3. Check slippage     │
  │                          │                        │
  │                          │  transfer(user→vault)  │
  │                          │───────────────────────>│
  │                          │                        │
  │                          │  transfer(vault→user)  │
  │                          │───────────────────────>│
  │                          │                        │
  │  emit SwapEvent          │                        │
  │<─────────────────────────│                        │
  │                          │                        │
```

### PDA Derivation

```
Pool PDA:
  seeds = ["pool", token_a_mint, token_b_mint]

Vault A PDA:
  seeds = ["vault", pool_pubkey, token_a_mint]

Vault B PDA:
  seeds = ["vault", pool_pubkey, token_b_mint]

LP Mint PDA:
  seeds = ["lp_mint", pool_pubkey]
```

---

## On-chain Program Design

### Account Structures

```rust
// Pool state account - stores all pool configuration
#[account]
#[derive(Default)]
pub struct Pool {
    /// Token A mint address
    pub token_a_mint: Pubkey,
    /// Token B mint address
    pub token_b_mint: Pubkey,
    /// Token A vault (PDA holding token A reserves)
    pub token_a_vault: Pubkey,
    /// Token B vault (PDA holding token B reserves)
    pub token_b_vault: Pubkey,
    /// LP token mint (PDA)
    pub lp_mint: Pubkey,
    /// Fee numerator (e.g., 3 for 0.3%)
    pub fee_numerator: u64,
    /// Fee denominator (e.g., 1000)
    pub fee_denominator: u64,
    /// Pool authority bump seed
    pub bump: u8,
    /// Total LP tokens minted
    pub total_lp_supply: u64,
}

impl Pool {
    pub const LEN: usize = 8 + // discriminator
        32 + // token_a_mint
        32 + // token_b_mint
        32 + // token_a_vault
        32 + // token_b_vault
        32 + // lp_mint
        8 +  // fee_numerator
        8 +  // fee_denominator
        1 +  // bump
        8;   // total_lp_supply
}
```

### Instructions

| Instruction | Description | Accounts |
|-------------|-------------|----------|
| `initialize_pool` | Create new pool | pool, token_a_mint, token_b_mint, vaults, lp_mint, authority |
| `add_liquidity` | Deposit tokens, receive LP | pool, vaults, user_tokens, user_lp, user |
| `remove_liquidity` | Burn LP, withdraw tokens | pool, vaults, user_tokens, user_lp, user |
| `swap` | Exchange tokens | pool, vaults, user_token_in, user_token_out, user |

### Errors

```rust
#[error_code]
pub enum AmmError {
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Invalid token mint")]
    InvalidMint,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid fee configuration")]
    InvalidFee,
}
```

---

## Core Implementation

### Program Entry Point

```rust
// programs/amm/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};

declare_id!("AMM111111111111111111111111111111111111111");

#[program]
pub mod amm {
    use super::*;

    /// Initialize a new liquidity pool
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        fee_numerator: u64,
        fee_denominator: u64,
    ) -> Result<()> {
        require!(fee_denominator > 0, AmmError::InvalidFee);
        require!(fee_numerator < fee_denominator, AmmError::InvalidFee);

        let pool = &mut ctx.accounts.pool;
        pool.token_a_mint = ctx.accounts.token_a_mint.key();
        pool.token_b_mint = ctx.accounts.token_b_mint.key();
        pool.token_a_vault = ctx.accounts.token_a_vault.key();
        pool.token_b_vault = ctx.accounts.token_b_vault.key();
        pool.lp_mint = ctx.accounts.lp_mint.key();
        pool.fee_numerator = fee_numerator;
        pool.fee_denominator = fee_denominator;
        pool.bump = ctx.bumps.pool;
        pool.total_lp_supply = 0;

        msg!("Pool initialized: {:?}", pool.key());
        Ok(())
    }

    /// Add liquidity to the pool
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
        min_lp_tokens: u64,
    ) -> Result<()> {
        require!(amount_a > 0 && amount_b > 0, AmmError::ZeroAmount);

        let pool = &mut ctx.accounts.pool;
        let vault_a_balance = ctx.accounts.token_a_vault.amount;
        let vault_b_balance = ctx.accounts.token_b_vault.amount;

        // Calculate LP tokens to mint
        let lp_tokens_to_mint = if pool.total_lp_supply == 0 {
            // First deposit: LP tokens = sqrt(amount_a * amount_b)
            // Using integer sqrt approximation
            integer_sqrt(amount_a.checked_mul(amount_b).ok_or(AmmError::MathOverflow)?)
        } else {
            // Subsequent deposits: proportional to existing liquidity
            // LP = min(amount_a * total_lp / vault_a, amount_b * total_lp / vault_b)
            let lp_for_a = amount_a
                .checked_mul(pool.total_lp_supply)
                .ok_or(AmmError::MathOverflow)?
                .checked_div(vault_a_balance)
                .ok_or(AmmError::MathOverflow)?;

            let lp_for_b = amount_b
                .checked_mul(pool.total_lp_supply)
                .ok_or(AmmError::MathOverflow)?
                .checked_div(vault_b_balance)
                .ok_or(AmmError::MathOverflow)?;

            std::cmp::min(lp_for_a, lp_for_b)
        };

        require!(lp_tokens_to_mint >= min_lp_tokens, AmmError::SlippageExceeded);

        // Transfer token A from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_a.to_account_info(),
                    to: ctx.accounts.token_a_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_a,
        )?;

        // Transfer token B from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_b.to_account_info(),
                    to: ctx.accounts.token_b_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_b,
        )?;

        // Mint LP tokens to user
        let seeds = &[
            b"pool",
            pool.token_a_mint.as_ref(),
            pool.token_b_mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.user_lp_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            lp_tokens_to_mint,
        )?;

        pool.total_lp_supply = pool
            .total_lp_supply
            .checked_add(lp_tokens_to_mint)
            .ok_or(AmmError::MathOverflow)?;

        emit!(LiquidityAdded {
            pool: pool.key(),
            user: ctx.accounts.user.key(),
            amount_a,
            amount_b,
            lp_tokens: lp_tokens_to_mint,
        });

        Ok(())
    }

    /// Remove liquidity from the pool
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_tokens: u64,
        min_amount_a: u64,
        min_amount_b: u64,
    ) -> Result<()> {
        require!(lp_tokens > 0, AmmError::ZeroAmount);

        let pool = &mut ctx.accounts.pool;
        let vault_a_balance = ctx.accounts.token_a_vault.amount;
        let vault_b_balance = ctx.accounts.token_b_vault.amount;

        // Calculate tokens to return: amount = lp_tokens * vault_balance / total_lp
        let amount_a = lp_tokens
            .checked_mul(vault_a_balance)
            .ok_or(AmmError::MathOverflow)?
            .checked_div(pool.total_lp_supply)
            .ok_or(AmmError::MathOverflow)?;

        let amount_b = lp_tokens
            .checked_mul(vault_b_balance)
            .ok_or(AmmError::MathOverflow)?
            .checked_div(pool.total_lp_supply)
            .ok_or(AmmError::MathOverflow)?;

        require!(amount_a >= min_amount_a, AmmError::SlippageExceeded);
        require!(amount_b >= min_amount_b, AmmError::SlippageExceeded);

        // Burn LP tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    from: ctx.accounts.user_lp_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            lp_tokens,
        )?;

        // Transfer tokens from vaults to user
        let seeds = &[
            b"pool",
            pool.token_a_mint.as_ref(),
            pool.token_b_mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_a_vault.to_account_info(),
                    to: ctx.accounts.user_token_a.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount_a,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_b_vault.to_account_info(),
                    to: ctx.accounts.user_token_b.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount_b,
        )?;

        pool.total_lp_supply = pool
            .total_lp_supply
            .checked_sub(lp_tokens)
            .ok_or(AmmError::MathOverflow)?;

        emit!(LiquidityRemoved {
            pool: pool.key(),
            user: ctx.accounts.user.key(),
            amount_a,
            amount_b,
            lp_tokens,
        });

        Ok(())
    }

    /// Swap tokens using constant product formula
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        is_a_to_b: bool,
    ) -> Result<()> {
        require!(amount_in > 0, AmmError::ZeroAmount);

        let pool = &ctx.accounts.pool;

        let (vault_in, vault_out, user_in, user_out) = if is_a_to_b {
            (
                &ctx.accounts.token_a_vault,
                &ctx.accounts.token_b_vault,
                &ctx.accounts.user_token_a,
                &ctx.accounts.user_token_b,
            )
        } else {
            (
                &ctx.accounts.token_b_vault,
                &ctx.accounts.token_a_vault,
                &ctx.accounts.user_token_b,
                &ctx.accounts.user_token_a,
            )
        };

        let reserve_in = vault_in.amount;
        let reserve_out = vault_out.amount;

        // Calculate output amount with fee
        // amount_out = (amount_in * fee_adjusted * reserve_out) / (reserve_in + amount_in * fee_adjusted)
        // fee_adjusted = (fee_denominator - fee_numerator) / fee_denominator

        let amount_in_with_fee = amount_in
            .checked_mul(pool.fee_denominator - pool.fee_numerator)
            .ok_or(AmmError::MathOverflow)?;

        let numerator = amount_in_with_fee
            .checked_mul(reserve_out)
            .ok_or(AmmError::MathOverflow)?;

        let denominator = reserve_in
            .checked_mul(pool.fee_denominator)
            .ok_or(AmmError::MathOverflow)?
            .checked_add(amount_in_with_fee)
            .ok_or(AmmError::MathOverflow)?;

        let amount_out = numerator
            .checked_div(denominator)
            .ok_or(AmmError::MathOverflow)?;

        require!(amount_out >= min_amount_out, AmmError::SlippageExceeded);
        require!(amount_out < reserve_out, AmmError::InsufficientLiquidity);

        // Transfer input token from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: user_in.to_account_info(),
                    to: vault_in.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // Transfer output token from vault to user
        let seeds = &[
            b"pool",
            pool.token_a_mint.as_ref(),
            pool.token_b_mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: vault_out.to_account_info(),
                    to: user_out.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount_out,
        )?;

        emit!(Swapped {
            pool: pool.key(),
            user: ctx.accounts.user.key(),
            amount_in,
            amount_out,
            is_a_to_b,
        });

        Ok(())
    }
}

/// Integer square root using Newton's method
fn integer_sqrt(n: u64) -> u64 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}
```

### Account Contexts

```rust
// programs/amm/src/contexts.rs

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        space = Pool::LEN,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        token::mint = token_a_mint,
        token::authority = pool,
        seeds = [b"vault", pool.key().as_ref(), token_a_mint.key().as_ref()],
        bump
    )]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        token::mint = token_b_mint,
        token::authority = pool,
        seeds = [b"vault", pool.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub token_b_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 9,
        mint::authority = pool,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        constraint = token_a_vault.key() == pool.token_a_vault
    )]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = token_b_vault.key() == pool.token_b_vault
    )]
    pub token_b_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = lp_mint.key() == pool.lp_mint
    )]
    pub lp_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_token_a.mint == pool.token_a_mint,
        constraint = user_token_a.owner == user.key()
    )]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_b.mint == pool.token_b_mint,
        constraint = user_token_b.owner == user.key()
    )]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_lp_token.mint == pool.lp_mint,
        constraint = user_lp_token.owner == user.key()
    )]
    pub user_lp_token: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut, constraint = token_a_vault.key() == pool.token_a_vault)]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = token_b_vault.key() == pool.token_b_vault)]
    pub token_b_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = lp_mint.key() == pool.lp_mint)]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_token_a.mint == pool.token_a_mint)]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_token_b.mint == pool.token_b_mint)]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_lp_token.mint == pool.lp_mint)]
    pub user_lp_token: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        seeds = [b"pool", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut, constraint = token_a_vault.key() == pool.token_a_vault)]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = token_b_vault.key() == pool.token_b_vault)]
    pub token_b_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_token_a.mint == pool.token_a_mint)]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_token_b.mint == pool.token_b_mint)]
    pub user_token_b: Account<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

### Events

```rust
// programs/amm/src/events.rs

#[event]
pub struct LiquidityAdded {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_tokens: u64,
}

#[event]
pub struct LiquidityRemoved {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_tokens: u64,
}

#[event]
pub struct Swapped {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub is_a_to_b: bool,
}
```

---

## TypeScript Client SDK

### SDK Implementation

```typescript
// sdk/src/amm.ts
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
import { IDL, Amm } from './idl/amm';

export const AMM_PROGRAM_ID = new PublicKey('AMM111111111111111111111111111111111111111');

export interface PoolInfo {
  address: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  lpMint: PublicKey;
  feeNumerator: number;
  feeDenominator: number;
  totalLpSupply: BN;
  reserveA: BN;
  reserveB: BN;
}

export interface SwapQuote {
  amountIn: BN;
  amountOut: BN;
  priceImpact: number;
  fee: BN;
}

export class AmmClient {
  private program: Program<Amm>;
  private connection: Connection;

  constructor(provider: AnchorProvider) {
    this.program = new Program(IDL, AMM_PROGRAM_ID, provider);
    this.connection = provider.connection;
  }

  /**
   * Derive pool PDA address
   */
  static getPoolAddress(tokenAMint: PublicKey, tokenBMint: PublicKey): PublicKey {
    // Sort mints to ensure consistent pool address
    const [mint0, mint1] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0
      ? [tokenAMint, tokenBMint]
      : [tokenBMint, tokenAMint];

    const [poolAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), mint0.toBuffer(), mint1.toBuffer()],
      AMM_PROGRAM_ID
    );
    return poolAddress;
  }

  /**
   * Derive vault PDA addresses
   */
  static getVaultAddresses(
    poolAddress: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ): { vaultA: PublicKey; vaultB: PublicKey } {
    const [vaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), tokenAMint.toBuffer()],
      AMM_PROGRAM_ID
    );
    const [vaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), tokenBMint.toBuffer()],
      AMM_PROGRAM_ID
    );
    return { vaultA, vaultB };
  }

  /**
   * Derive LP mint PDA address
   */
  static getLpMintAddress(poolAddress: PublicKey): PublicKey {
    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), poolAddress.toBuffer()],
      AMM_PROGRAM_ID
    );
    return lpMint;
  }

  /**
   * Get pool information
   */
  async getPoolInfo(poolAddress: PublicKey): Promise<PoolInfo> {
    const pool = await this.program.account.pool.fetch(poolAddress);

    const [vaultAInfo, vaultBInfo] = await Promise.all([
      this.connection.getTokenAccountBalance(pool.tokenAVault),
      this.connection.getTokenAccountBalance(pool.tokenBVault),
    ]);

    return {
      address: poolAddress,
      tokenAMint: pool.tokenAMint,
      tokenBMint: pool.tokenBMint,
      tokenAVault: pool.tokenAVault,
      tokenBVault: pool.tokenBVault,
      lpMint: pool.lpMint,
      feeNumerator: pool.feeNumerator.toNumber(),
      feeDenominator: pool.feeDenominator.toNumber(),
      totalLpSupply: pool.totalLpSupply,
      reserveA: new BN(vaultAInfo.value.amount),
      reserveB: new BN(vaultBInfo.value.amount),
    };
  }

  /**
   * Calculate swap output using constant product formula
   */
  getSwapQuote(
    poolInfo: PoolInfo,
    amountIn: BN,
    isAToB: boolean
  ): SwapQuote {
    const reserveIn = isAToB ? poolInfo.reserveA : poolInfo.reserveB;
    const reserveOut = isAToB ? poolInfo.reserveB : poolInfo.reserveA;

    // Calculate fee
    const feeAmount = amountIn
      .mul(new BN(poolInfo.feeNumerator))
      .div(new BN(poolInfo.feeDenominator));

    const amountInAfterFee = amountIn.sub(feeAmount);

    // Constant product: (reserveIn + amountIn) * (reserveOut - amountOut) = k
    // amountOut = reserveOut * amountIn / (reserveIn + amountIn)
    const numerator = amountInAfterFee.mul(reserveOut);
    const denominator = reserveIn.add(amountInAfterFee);
    const amountOut = numerator.div(denominator);

    // Calculate price impact
    const spotPrice = reserveOut.toNumber() / reserveIn.toNumber();
    const executionPrice = amountOut.toNumber() / amountIn.toNumber();
    const priceImpact = Math.abs((spotPrice - executionPrice) / spotPrice) * 100;

    return {
      amountIn,
      amountOut,
      priceImpact,
      fee: feeAmount,
    };
  }

  /**
   * Calculate current price (token B per token A)
   */
  getPrice(poolInfo: PoolInfo): number {
    return poolInfo.reserveB.toNumber() / poolInfo.reserveA.toNumber();
  }

  /**
   * Initialize a new pool
   */
  async initializePool(
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    feeNumerator: number,
    feeDenominator: number,
    payer: PublicKey
  ): Promise<Transaction> {
    const poolAddress = AmmClient.getPoolAddress(tokenAMint, tokenBMint);
    const { vaultA, vaultB } = AmmClient.getVaultAddresses(poolAddress, tokenAMint, tokenBMint);
    const lpMint = AmmClient.getLpMintAddress(poolAddress);

    const tx = await this.program.methods
      .initializePool(new BN(feeNumerator), new BN(feeDenominator))
      .accounts({
        pool: poolAddress,
        tokenAMint,
        tokenBMint,
        tokenAVault: vaultA,
        tokenBVault: vaultB,
        lpMint,
        payer,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return tx;
  }

  /**
   * Add liquidity to pool
   */
  async addLiquidity(
    poolAddress: PublicKey,
    amountA: BN,
    amountB: BN,
    minLpTokens: BN,
    user: PublicKey
  ): Promise<Transaction> {
    const poolInfo = await this.getPoolInfo(poolAddress);

    const userTokenA = await getAssociatedTokenAddress(poolInfo.tokenAMint, user);
    const userTokenB = await getAssociatedTokenAddress(poolInfo.tokenBMint, user);
    const userLpToken = await getAssociatedTokenAddress(poolInfo.lpMint, user);

    const tx = new Transaction();

    // Create LP token account if it doesn't exist
    const lpAccountInfo = await this.connection.getAccountInfo(userLpToken);
    if (!lpAccountInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          user,
          userLpToken,
          user,
          poolInfo.lpMint
        )
      );
    }

    const addLiqIx = await this.program.methods
      .addLiquidity(amountA, amountB, minLpTokens)
      .accounts({
        pool: poolAddress,
        tokenAVault: poolInfo.tokenAVault,
        tokenBVault: poolInfo.tokenBVault,
        lpMint: poolInfo.lpMint,
        userTokenA,
        userTokenB,
        userLpToken,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    tx.add(addLiqIx);
    return tx;
  }

  /**
   * Remove liquidity from pool
   */
  async removeLiquidity(
    poolAddress: PublicKey,
    lpTokens: BN,
    minAmountA: BN,
    minAmountB: BN,
    user: PublicKey
  ): Promise<Transaction> {
    const poolInfo = await this.getPoolInfo(poolAddress);

    const userTokenA = await getAssociatedTokenAddress(poolInfo.tokenAMint, user);
    const userTokenB = await getAssociatedTokenAddress(poolInfo.tokenBMint, user);
    const userLpToken = await getAssociatedTokenAddress(poolInfo.lpMint, user);

    const tx = await this.program.methods
      .removeLiquidity(lpTokens, minAmountA, minAmountB)
      .accounts({
        pool: poolAddress,
        tokenAVault: poolInfo.tokenAVault,
        tokenBVault: poolInfo.tokenBVault,
        lpMint: poolInfo.lpMint,
        userTokenA,
        userTokenB,
        userLpToken,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return tx;
  }

  /**
   * Swap tokens
   */
  async swap(
    poolAddress: PublicKey,
    amountIn: BN,
    minAmountOut: BN,
    isAToB: boolean,
    user: PublicKey
  ): Promise<Transaction> {
    const poolInfo = await this.getPoolInfo(poolAddress);

    const userTokenA = await getAssociatedTokenAddress(poolInfo.tokenAMint, user);
    const userTokenB = await getAssociatedTokenAddress(poolInfo.tokenBMint, user);

    const tx = await this.program.methods
      .swap(amountIn, minAmountOut, isAToB)
      .accounts({
        pool: poolAddress,
        tokenAVault: poolInfo.tokenAVault,
        tokenBVault: poolInfo.tokenBVault,
        userTokenA,
        userTokenB,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return tx;
  }
}
```

### React Hooks

```typescript
// sdk/src/hooks/usePool.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { AmmClient, PoolInfo, SwapQuote } from '../amm';

export function usePool(poolAddress: PublicKey | undefined) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );
  const client = new AmmClient(provider);

  return useQuery<PoolInfo>({
    queryKey: ['pool', poolAddress?.toString()],
    queryFn: () => client.getPoolInfo(poolAddress!),
    enabled: !!poolAddress,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useSwapQuote(
  poolInfo: PoolInfo | undefined,
  amountIn: BN,
  isAToB: boolean
) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );
  const client = new AmmClient(provider);

  return useQuery<SwapQuote>({
    queryKey: ['swapQuote', poolInfo?.address.toString(), amountIn.toString(), isAToB],
    queryFn: () => client.getSwapQuote(poolInfo!, amountIn, isAToB),
    enabled: !!poolInfo && amountIn.gt(new BN(0)),
  });
}

export function useSwap(poolAddress: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );
  const client = new AmmClient(provider);

  return useMutation({
    mutationFn: async ({
      amountIn,
      minAmountOut,
      isAToB,
    }: {
      amountIn: BN;
      minAmountOut: BN;
      isAToB: boolean;
    }) => {
      const tx = await client.swap(
        poolAddress,
        amountIn,
        minAmountOut,
        isAToB,
        wallet.publicKey!
      );
      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);
      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool', poolAddress.toString()] });
    },
  });
}
```

---

## Testing

### Anchor Tests

```typescript
// tests/amm.ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Amm } from '../target/types/amm';
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { expect } from 'chai';

describe('AMM', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Amm as Program<Amm>;

  let tokenAMint: anchor.web3.PublicKey;
  let tokenBMint: anchor.web3.PublicKey;
  let poolAddress: anchor.web3.PublicKey;
  let tokenAVault: anchor.web3.PublicKey;
  let tokenBVault: anchor.web3.PublicKey;
  let lpMint: anchor.web3.PublicKey;
  let userTokenA: anchor.web3.PublicKey;
  let userTokenB: anchor.web3.PublicKey;
  let userLpToken: anchor.web3.PublicKey;

  const user = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to user
    const airdropSig = await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Create token mints
    tokenAMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      9
    );

    tokenBMint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      9
    );

    // Create user token accounts
    userTokenA = await createAccount(
      provider.connection,
      user,
      tokenAMint,
      user.publicKey
    );

    userTokenB = await createAccount(
      provider.connection,
      user,
      tokenBMint,
      user.publicKey
    );

    // Mint tokens to user
    await mintTo(
      provider.connection,
      user,
      tokenAMint,
      userTokenA,
      user,
      1_000_000_000_000 // 1000 tokens
    );

    await mintTo(
      provider.connection,
      user,
      tokenBMint,
      userTokenB,
      user,
      1_000_000_000_000 // 1000 tokens
    );

    // Derive PDAs
    [poolAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      program.programId
    );

    [tokenAVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), tokenAMint.toBuffer()],
      program.programId
    );

    [tokenBVault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), tokenBMint.toBuffer()],
      program.programId
    );

    [lpMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), poolAddress.toBuffer()],
      program.programId
    );
  });

  it('Initializes pool', async () => {
    await program.methods
      .initializePool(new anchor.BN(3), new anchor.BN(1000)) // 0.3% fee
      .accounts({
        pool: poolAddress,
        tokenAMint,
        tokenBMint,
        tokenAVault,
        tokenBVault,
        lpMint,
        payer: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    const pool = await program.account.pool.fetch(poolAddress);
    expect(pool.tokenAMint.toString()).to.equal(tokenAMint.toString());
    expect(pool.tokenBMint.toString()).to.equal(tokenBMint.toString());
    expect(pool.feeNumerator.toNumber()).to.equal(3);
    expect(pool.feeDenominator.toNumber()).to.equal(1000);
  });

  it('Adds liquidity', async () => {
    // Create LP token account for user
    userLpToken = await createAccount(
      provider.connection,
      user,
      lpMint,
      user.publicKey
    );

    const amountA = new anchor.BN(100_000_000_000); // 100 tokens
    const amountB = new anchor.BN(100_000_000_000); // 100 tokens

    await program.methods
      .addLiquidity(amountA, amountB, new anchor.BN(0))
      .accounts({
        pool: poolAddress,
        tokenAVault,
        tokenBVault,
        lpMint,
        userTokenA,
        userTokenB,
        userLpToken,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const vaultA = await getAccount(provider.connection, tokenAVault);
    const vaultB = await getAccount(provider.connection, tokenBVault);
    const userLp = await getAccount(provider.connection, userLpToken);

    expect(Number(vaultA.amount)).to.equal(100_000_000_000);
    expect(Number(vaultB.amount)).to.equal(100_000_000_000);
    expect(Number(userLp.amount)).to.be.greaterThan(0);
  });

  it('Swaps token A for token B', async () => {
    const amountIn = new anchor.BN(10_000_000_000); // 10 tokens

    const vaultBBefore = await getAccount(provider.connection, tokenBVault);
    const userBBefore = await getAccount(provider.connection, userTokenB);

    await program.methods
      .swap(amountIn, new anchor.BN(1), true) // A to B
      .accounts({
        pool: poolAddress,
        tokenAVault,
        tokenBVault,
        userTokenA,
        userTokenB,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const vaultBAfter = await getAccount(provider.connection, tokenBVault);
    const userBAfter = await getAccount(provider.connection, userTokenB);

    // User should have received tokens
    expect(Number(userBAfter.amount)).to.be.greaterThan(Number(userBBefore.amount));
    // Vault should have less tokens
    expect(Number(vaultBAfter.amount)).to.be.lessThan(Number(vaultBBefore.amount));
  });

  it('Removes liquidity', async () => {
    const userLp = await getAccount(provider.connection, userLpToken);
    const lpTokensToRemove = new anchor.BN(Number(userLp.amount) / 2);

    await program.methods
      .removeLiquidity(lpTokensToRemove, new anchor.BN(1), new anchor.BN(1))
      .accounts({
        pool: poolAddress,
        tokenAVault,
        tokenBVault,
        lpMint,
        userTokenA,
        userTokenB,
        userLpToken,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const userLpAfter = await getAccount(provider.connection, userLpToken);
    expect(Number(userLpAfter.amount)).to.be.lessThan(Number(userLp.amount));
  });
});
```

---

## Implementation Phases

### Phase 1: Core AMM (Week 1-2)
- [ ] Set up Anchor project structure
- [ ] Implement Pool account struct
- [ ] Implement `initialize_pool` instruction
- [ ] Implement `add_liquidity` with LP minting
- [ ] Implement `remove_liquidity` with LP burning
- [ ] Write unit tests for liquidity operations

### Phase 2: Swap Implementation (Week 2-3)
- [ ] Implement constant product swap math
- [ ] Implement `swap` instruction with fee deduction
- [ ] Add slippage protection
- [ ] Write swap tests with various scenarios
- [ ] Test edge cases (large swaps, zero amounts)

### Phase 3: TypeScript SDK (Week 3-4)
- [ ] Generate IDL and types
- [ ] Implement `AmmClient` class
- [ ] Add quote calculation functions
- [ ] Create React hooks for pool data
- [ ] Write SDK integration tests

### Phase 4: Frontend (Week 4-5)
- [ ] Set up React + Vite project
- [ ] Implement wallet connection
- [ ] Build swap interface with price display
- [ ] Build liquidity management UI
- [ ] Add transaction status and history

### Phase 5: Optimization (Week 5-6)
- [ ] Optimize for compute units
- [ ] Add multi-hop routing (V2)
- [ ] Implement price oracle (V2)
- [ ] Security audit prep
- [ ] Deploy to devnet/mainnet

---

## Web3 Concepts Covered

| Concept | Where Applied |
|---------|---------------|
| **PDAs (Program Derived Addresses)** | Pool, vault, and LP mint addresses |
| **CPI (Cross-Program Invocation)** | Token transfers via SPL Token program |
| **SPL Token Standard** | LP token minting/burning, vault management |
| **Anchor Framework** | Account validation, serialization, events |
| **Constant Product AMM** | x*y=k formula for swap calculations |
| **Liquidity Pools** | Dual-asset pools with proportional deposits |
| **LP Tokens** | Proof of liquidity share |
| **Slippage Protection** | Minimum output amounts |
| **Price Impact** | How trade size affects execution price |
| **Impermanent Loss** | Risk of providing liquidity vs holding |
| **Fee Mechanics** | Protocol revenue from swaps |

---

## Folder Structure

```
amm/
├── programs/
│   └── amm/
│       ├── src/
│       │   ├── lib.rs           # Program entry point
│       │   ├── contexts.rs      # Account contexts
│       │   ├── state.rs         # Account structures
│       │   ├── errors.rs        # Custom errors
│       │   └── events.rs        # Event definitions
│       └── Cargo.toml
├── sdk/
│   └── src/
│       ├── amm.ts               # Main SDK client
│       ├── hooks/
│       │   ├── usePool.ts       # Pool data hook
│       │   └── useSwap.ts       # Swap mutation hook
│       └── idl/
│           └── amm.ts           # Generated IDL types
├── app/
│   └── src/
│       ├── components/
│       │   ├── SwapCard.tsx     # Swap interface
│       │   ├── LiquidityPanel.tsx
│       │   └── PoolStats.tsx
│       ├── pages/
│       │   ├── Swap.tsx
│       │   └── Pools.tsx
│       └── App.tsx
├── tests/
│   └── amm.ts                   # Anchor tests
├── Anchor.toml
├── Cargo.toml
└── package.json
```

---

## Development Commands

```bash
# Setup
anchor init amm
cd amm

# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Generate IDL types
anchor idl parse -f programs/amm/src/lib.rs -o sdk/src/idl/amm.json

# Start local validator
solana-test-validator

# Run frontend
cd app && npm run dev
```

---

## Summary

This DEX AMM project teaches core DeFi and Solana concepts:

1. **AMM Mathematics**: Constant product formula, swap calculations, LP token math
2. **Solana Patterns**: PDAs, CPIs, SPL Token integration, Anchor framework
3. **DeFi Mechanics**: Liquidity pools, slippage, fees, price impact
4. **Full-Stack Web3**: On-chain programs, TypeScript SDK, React frontend

The constant product model (Uniswap V2 style) is the foundation for understanding more complex AMMs like concentrated liquidity (Uniswap V3/Orca).
