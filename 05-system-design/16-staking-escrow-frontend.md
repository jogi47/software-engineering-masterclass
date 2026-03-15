# Staking & Escrow Contracts with Frontend

Build common DeFi patterns (staking and escrow) on Solana with a complete React frontend using wallet adapter.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features & Requirements](#features--requirements)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Staking Program](#staking-program)
6. [Escrow Program](#escrow-program)
7. [Frontend Implementation](#frontend-implementation)
8. [Testing](#testing)
9. [Implementation Phases](#implementation-phases)
10. [Concepts Covered](#concepts-covered)
11. [Folder Structure](#folder-structure)
12. [Development Commands](#development-commands)

---

## Project Overview

### What is Staking?

**Staking** allows users to lock tokens in exchange for rewards:
- **Lock tokens** in a smart contract
- **Earn rewards** proportional to stake and duration
- **Unstake** with optional cooldown period

Common use cases:
- Protocol governance participation
- Network security (Proof of Stake)
- Yield farming in DeFi

### What is Escrow?

**Escrow** is a conditional fund holding mechanism:
- **Party A** deposits funds
- **Funds held** until conditions are met
- **Party B** receives funds when conditions satisfied
- **Refund** if conditions fail

Common use cases:
- Freelance payments
- NFT trades
- Token vesting

### Learning Outcomes

After building this project, you will understand:
- Staking reward mathematics
- Time-based reward distribution
- Escrow state machines
- Solana wallet adapter integration
- React hooks for Solana
- Real-time state polling
- Transaction building in frontend

---

## Features & Requirements

### Staking MVP Features

| Feature | Description |
|---------|-------------|
| Stake Tokens | Lock tokens to earn rewards |
| Claim Rewards | Withdraw accumulated rewards |
| Unstake | Withdraw staked tokens (with cooldown) |
| View Stats | APY, total staked, rewards earned |

### Escrow MVP Features

| Feature | Description |
|---------|-------------|
| Create Escrow | Initialize escrow with recipient and amount |
| Fund Escrow | Deposit tokens into escrow |
| Release | Send funds to recipient |
| Refund | Return funds to creator |
| Cancel | Cancel unfunded escrow |

### V2 Features (Future)

| Feature | Description |
|---------|-------------|
| Multiple Reward Tokens | Earn different tokens |
| Compound Rewards | Auto-restake rewards |
| Escrow Milestones | Multi-stage releases |
| Dispute Resolution | Third-party arbitration |

---

## Tech Stack

### On-chain (Solana Programs)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Rust | Smart contract logic |
| Framework | Anchor | Solana development |
| Token Standard | SPL Token | Token operations |

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI components |
| Build Tool | Vite | Fast development |
| Styling | TailwindCSS | Utility-first CSS |
| State | React Query | Server state |
| Wallet | @solana/wallet-adapter | Wallet connection |
| Solana | @solana/web3.js | Blockchain interaction |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           React Frontend                                 │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Wallet Adapter Provider                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │ Phantom    │  │ Solflare   │  │ Backpack   │  │ Ledger     │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────┐        ┌──────────────────────────────────┐   │
│  │    Staking UI        │        │        Escrow UI                 │   │
│  │                      │        │                                  │   │
│  │  ┌────────────────┐  │        │  ┌────────────────────────────┐  │   │
│  │  │ Stake Form     │  │        │  │ Create Escrow Form         │  │   │
│  │  │ Claim Button   │  │        │  │ Escrow List                │  │   │
│  │  │ Unstake Form   │  │        │  │ Release/Refund Buttons     │  │   │
│  │  │ Stats Display  │  │        │  │                            │  │   │
│  │  └────────────────┘  │        │  └────────────────────────────┘  │   │
│  └──────────────────────┘        └──────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    React Query + Custom Hooks                     │   │
│  │  useStakingPool()  useUserStake()  useEscrows()  useEscrow()     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Solana Blockchain                                │
│                                                                          │
│  ┌───────────────────────────┐    ┌───────────────────────────────────┐ │
│  │     Staking Program       │    │        Escrow Program             │ │
│  │                           │    │                                   │ │
│  │  ┌─────────────────────┐  │    │  ┌─────────────────────────────┐  │ │
│  │  │ StakingPool         │  │    │  │ Escrow                      │  │ │
│  │  │ • reward_rate       │  │    │  │ • creator                   │  │ │
│  │  │ • total_staked      │  │    │  │ • recipient                 │  │ │
│  │  │ • reward_per_token  │  │    │  │ • amount                    │  │ │
│  │  └─────────────────────┘  │    │  │ • status                    │  │ │
│  │                           │    │  └─────────────────────────────┘  │ │
│  │  ┌─────────────────────┐  │    │                                   │ │
│  │  │ UserStake           │  │    │  States:                          │ │
│  │  │ • amount            │  │    │  Created → Funded → Released      │ │
│  │  │ • rewards_earned    │  │    │                   → Refunded      │ │
│  │  │ • last_update       │  │    │                   → Cancelled     │ │
│  │  └─────────────────────┘  │    │                                   │ │
│  └───────────────────────────┘    └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Staking Reward Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reward Distribution Model                     │
│                                                                  │
│  Global State:                                                   │
│  • reward_rate = 100 tokens/second (total emissions)            │
│  • total_staked = 10,000 tokens                                 │
│  • reward_per_token_stored = accumulated rewards per token      │
│                                                                  │
│  Per User:                                                       │
│  • user_stake = 1,000 tokens (10% of pool)                     │
│  • rewards = user_stake × (reward_per_token - paid_per_token)  │
│                                                                  │
│  Example:                                                        │
│  After 1 hour (3600 seconds):                                   │
│  • Total rewards = 100 × 3600 = 360,000 tokens                  │
│  • reward_per_token += 360,000 / 10,000 = 36                    │
│  • User rewards = 1,000 × 36 = 36,000 tokens (10% of total)    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Escrow State Machine

```
                    ┌─────────────┐
                    │   CREATED   │
                    │ (unfunded)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            │
        ┌───────────┐  fund()          │
        │ CANCELLED │     │            │
        │           │     │         cancel()
        └───────────┘     │            │
                          ▼            │
                    ┌─────────────┐    │
                    │   FUNDED    │────┘
                    │             │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         release()                  refund()
              │                         │
              ▼                         ▼
        ┌───────────┐           ┌───────────┐
        │ RELEASED  │           │ REFUNDED  │
        │           │           │           │
        └───────────┘           └───────────┘
```

---

## Staking Program

### Account Structures

```rust
// programs/staking/src/state.rs
use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    /// Pool authority (admin)
    pub authority: Pubkey,
    /// Token mint being staked
    pub stake_mint: Pubkey,
    /// Token mint for rewards
    pub reward_mint: Pubkey,
    /// Vault holding staked tokens
    pub stake_vault: Pubkey,
    /// Vault holding reward tokens
    pub reward_vault: Pubkey,
    /// Rewards distributed per second
    pub reward_rate: u64,
    /// Total tokens staked in pool
    pub total_staked: u64,
    /// Accumulated rewards per staked token (scaled by 1e18)
    pub reward_per_token_stored: u128,
    /// Last time rewards were updated
    pub last_update_time: i64,
    /// Pool start time
    pub start_time: i64,
    /// Pool end time (when rewards stop)
    pub end_time: i64,
    /// Unstaking cooldown in seconds
    pub cooldown_period: i64,
    /// Bump seed
    pub bump: u8,
}

impl StakingPool {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // stake_mint
        32 + // reward_mint
        32 + // stake_vault
        32 + // reward_vault
        8 +  // reward_rate
        8 +  // total_staked
        16 + // reward_per_token_stored
        8 +  // last_update_time
        8 +  // start_time
        8 +  // end_time
        8 +  // cooldown_period
        1;   // bump
}

#[account]
pub struct UserStake {
    /// Owner of this stake
    pub owner: Pubkey,
    /// Associated pool
    pub pool: Pubkey,
    /// Amount staked
    pub amount: u64,
    /// Rewards already paid (scaled by 1e18)
    pub reward_per_token_paid: u128,
    /// Accumulated rewards not yet claimed
    pub rewards_earned: u64,
    /// Timestamp of last stake/unstake
    pub last_stake_time: i64,
    /// Amount pending unstake (in cooldown)
    pub pending_unstake: u64,
    /// When cooldown ends
    pub cooldown_end: i64,
    /// Bump seed
    pub bump: u8,
}

impl UserStake {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // pool
        8 +  // amount
        16 + // reward_per_token_paid
        8 +  // rewards_earned
        8 +  // last_stake_time
        8 +  // pending_unstake
        8 +  // cooldown_end
        1;   // bump
}
```

### Staking Program Implementation

```rust
// programs/staking/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("STAKE111111111111111111111111111111111111");

pub mod state;
use state::*;

const PRECISION: u128 = 1_000_000_000_000_000_000; // 1e18

#[program]
pub mod staking {
    use super::*;

    /// Initialize a new staking pool
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        reward_rate: u64,
        start_time: i64,
        end_time: i64,
        cooldown_period: i64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.stake_mint = ctx.accounts.stake_mint.key();
        pool.reward_mint = ctx.accounts.reward_mint.key();
        pool.stake_vault = ctx.accounts.stake_vault.key();
        pool.reward_vault = ctx.accounts.reward_vault.key();
        pool.reward_rate = reward_rate;
        pool.total_staked = 0;
        pool.reward_per_token_stored = 0;
        pool.last_update_time = start_time;
        pool.start_time = start_time;
        pool.end_time = end_time;
        pool.cooldown_period = cooldown_period;
        pool.bump = ctx.bumps.pool;

        Ok(())
    }

    /// Stake tokens
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        // Update global rewards
        update_reward(pool, user_stake, clock.unix_timestamp)?;

        // Transfer tokens from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_stake_token.to_account_info(),
                    to: ctx.accounts.stake_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update state
        user_stake.amount = user_stake.amount.checked_add(amount).unwrap();
        user_stake.last_stake_time = clock.unix_timestamp;
        pool.total_staked = pool.total_staked.checked_add(amount).unwrap();

        emit!(Staked {
            user: ctx.accounts.user.key(),
            pool: pool.key(),
            amount,
        });

        Ok(())
    }

    /// Request unstake (starts cooldown)
    pub fn request_unstake(ctx: Context<RequestUnstake>, amount: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        require!(amount > 0, StakingError::ZeroAmount);
        require!(amount <= user_stake.amount, StakingError::InsufficientStake);

        // Update rewards before changing stake
        update_reward(&mut ctx.accounts.pool.clone(), user_stake, clock.unix_timestamp)?;

        // Move to pending
        user_stake.amount = user_stake.amount.checked_sub(amount).unwrap();
        user_stake.pending_unstake = user_stake.pending_unstake.checked_add(amount).unwrap();
        user_stake.cooldown_end = clock.unix_timestamp + pool.cooldown_period;

        // Update pool total
        ctx.accounts.pool.total_staked = ctx.accounts.pool.total_staked.checked_sub(amount).unwrap();

        emit!(UnstakeRequested {
            user: ctx.accounts.user.key(),
            pool: pool.key(),
            amount,
            cooldown_end: user_stake.cooldown_end,
        });

        Ok(())
    }

    /// Complete unstake after cooldown
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        require!(user_stake.pending_unstake > 0, StakingError::NoPendingUnstake);
        require!(
            clock.unix_timestamp >= user_stake.cooldown_end,
            StakingError::CooldownNotComplete
        );

        let amount = user_stake.pending_unstake;

        // Transfer tokens back to user
        let pool = &ctx.accounts.pool;
        let seeds = &[
            b"pool",
            pool.stake_mint.as_ref(),
            pool.reward_mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stake_vault.to_account_info(),
                    to: ctx.accounts.user_stake_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        user_stake.pending_unstake = 0;
        user_stake.cooldown_end = 0;

        emit!(Unstaked {
            user: ctx.accounts.user.key(),
            pool: pool.key(),
            amount,
        });

        Ok(())
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        // Update rewards
        update_reward(pool, user_stake, clock.unix_timestamp)?;

        let rewards = user_stake.rewards_earned;
        require!(rewards > 0, StakingError::NoRewards);

        // Transfer rewards
        let seeds = &[
            b"pool",
            pool.stake_mint.as_ref(),
            pool.reward_mint.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault.to_account_info(),
                    to: ctx.accounts.user_reward_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            rewards,
        )?;

        user_stake.rewards_earned = 0;

        emit!(RewardsClaimed {
            user: ctx.accounts.user.key(),
            pool: pool.key(),
            amount: rewards,
        });

        Ok(())
    }
}

/// Update reward calculations
fn update_reward(pool: &mut StakingPool, user_stake: &mut UserStake, now: i64) -> Result<()> {
    // Calculate new reward_per_token
    let reward_per_token = calculate_reward_per_token(pool, now)?;
    pool.reward_per_token_stored = reward_per_token;
    pool.last_update_time = std::cmp::min(now, pool.end_time);

    // Calculate user rewards
    if user_stake.amount > 0 {
        let pending = (user_stake.amount as u128)
            .checked_mul(reward_per_token.checked_sub(user_stake.reward_per_token_paid).unwrap())
            .unwrap()
            .checked_div(PRECISION)
            .unwrap() as u64;

        user_stake.rewards_earned = user_stake.rewards_earned.checked_add(pending).unwrap();
    }
    user_stake.reward_per_token_paid = reward_per_token;

    Ok(())
}

/// Calculate current reward per token
fn calculate_reward_per_token(pool: &StakingPool, now: i64) -> Result<u128> {
    if pool.total_staked == 0 {
        return Ok(pool.reward_per_token_stored);
    }

    let last_time = std::cmp::min(now, pool.end_time);
    let time_delta = std::cmp::max(0, last_time - pool.last_update_time) as u128;

    let reward_delta = time_delta
        .checked_mul(pool.reward_rate as u128)
        .unwrap()
        .checked_mul(PRECISION)
        .unwrap()
        .checked_div(pool.total_staked as u128)
        .unwrap();

    Ok(pool.reward_per_token_stored.checked_add(reward_delta).unwrap())
}

// Events
#[event]
pub struct Staked {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
}

#[event]
pub struct UnstakeRequested {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub cooldown_end: i64,
}

#[event]
pub struct Unstaked {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
}

// Errors
#[error_code]
pub enum StakingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient staked balance")]
    InsufficientStake,
    #[msg("No pending unstake")]
    NoPendingUnstake,
    #[msg("Cooldown period not complete")]
    CooldownNotComplete,
    #[msg("No rewards to claim")]
    NoRewards,
}
```

---

## Escrow Program

### Escrow Implementation

```rust
// programs/escrow/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("ESCR111111111111111111111111111111111111");

#[program]
pub mod escrow {
    use super::*;

    /// Create a new escrow
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        amount: u64,
        description: String,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);
        require!(description.len() <= 200, EscrowError::DescriptionTooLong);

        let escrow = &mut ctx.accounts.escrow;
        escrow.creator = ctx.accounts.creator.key();
        escrow.recipient = ctx.accounts.recipient.key();
        escrow.mint = ctx.accounts.mint.key();
        escrow.vault = ctx.accounts.vault.key();
        escrow.amount = amount;
        escrow.description = description;
        escrow.status = EscrowStatus::Created;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;

        emit!(EscrowCreated {
            escrow: escrow.key(),
            creator: escrow.creator,
            recipient: escrow.recipient,
            amount,
        });

        Ok(())
    }

    /// Fund the escrow
    pub fn fund_escrow(ctx: Context<FundEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Created, EscrowError::InvalidStatus);
        require!(
            ctx.accounts.creator.key() == escrow.creator,
            EscrowError::Unauthorized
        );

        // Transfer tokens to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            escrow.amount,
        )?;

        escrow.status = EscrowStatus::Funded;
        escrow.funded_at = Some(Clock::get()?.unix_timestamp);

        emit!(EscrowFunded {
            escrow: escrow.key(),
            amount: escrow.amount,
        });

        Ok(())
    }

    /// Release funds to recipient
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Funded, EscrowError::InvalidStatus);
        require!(
            ctx.accounts.creator.key() == escrow.creator,
            EscrowError::Unauthorized
        );

        // Transfer tokens to recipient
        let seeds = &[
            b"escrow",
            escrow.creator.as_ref(),
            escrow.recipient.as_ref(),
            &escrow.created_at.to_le_bytes(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            escrow.amount,
        )?;

        escrow.status = EscrowStatus::Released;
        escrow.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(EscrowReleased {
            escrow: escrow.key(),
            recipient: escrow.recipient,
            amount: escrow.amount,
        });

        Ok(())
    }

    /// Refund funds to creator
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Funded, EscrowError::InvalidStatus);

        // Both parties can request refund in MVP
        // In production, add dispute resolution
        require!(
            ctx.accounts.signer.key() == escrow.creator
                || ctx.accounts.signer.key() == escrow.recipient,
            EscrowError::Unauthorized
        );

        // Transfer tokens back to creator
        let seeds = &[
            b"escrow",
            escrow.creator.as_ref(),
            escrow.recipient.as_ref(),
            &escrow.created_at.to_le_bytes(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.creator_token.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            escrow.amount,
        )?;

        escrow.status = EscrowStatus::Refunded;
        escrow.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(EscrowRefunded {
            escrow: escrow.key(),
            creator: escrow.creator,
            amount: escrow.amount,
        });

        Ok(())
    }

    /// Cancel unfunded escrow
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(escrow.status == EscrowStatus::Created, EscrowError::InvalidStatus);
        require!(
            ctx.accounts.creator.key() == escrow.creator,
            EscrowError::Unauthorized
        );

        escrow.status = EscrowStatus::Cancelled;
        escrow.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(EscrowCancelled {
            escrow: escrow.key(),
        });

        Ok(())
    }
}

#[account]
pub struct Escrow {
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub description: String,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub funded_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub bump: u8,
}

impl Escrow {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // recipient
        32 + // mint
        32 + // vault
        8 +  // amount
        4 + 200 + // description (String)
        1 +  // status
        8 +  // created_at
        9 +  // funded_at (Option<i64>)
        9 +  // completed_at (Option<i64>)
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Created,
    Funded,
    Released,
    Refunded,
    Cancelled,
}

// Events
#[event]
pub struct EscrowCreated {
    pub escrow: Pubkey,
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowFunded {
    pub escrow: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowReleased {
    pub escrow: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowRefunded {
    pub escrow: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowCancelled {
    pub escrow: Pubkey,
}

// Errors
#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,
    #[msg("Unauthorized")]
    Unauthorized,
}
```

---

## Frontend Implementation

### Wallet Adapter Setup

```tsx
// src/providers/WalletProvider.tsx
import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: React.ReactNode;
}

export function WalletProvider({ children }: Props) {
  const network = 'devnet';
  const endpoint = useMemo(() => clusterApiUrl(network), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

### Custom Hooks

```tsx
// src/hooks/useStaking.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN, Program, AnchorProvider } from '@coral-xyz/anchor';
import { IDL, Staking } from '../idl/staking';

const STAKING_PROGRAM_ID = new PublicKey('STAKE111111111111111111111111111111111111');

export function useStakingPool(poolAddress: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useQuery({
    queryKey: ['stakingPool', poolAddress.toString()],
    queryFn: async () => {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Staking>(IDL, STAKING_PROGRAM_ID, provider);

      const pool = await program.account.stakingPool.fetch(poolAddress);

      // Calculate APY
      const totalRewardsPerYear = pool.rewardRate.toNumber() * 365 * 24 * 60 * 60;
      const apy = pool.totalStaked.toNumber() > 0
        ? (totalRewardsPerYear / pool.totalStaked.toNumber()) * 100
        : 0;

      return {
        ...pool,
        apy,
      };
    },
    enabled: !!wallet.publicKey,
    refetchInterval: 10000,
  });
}

export function useUserStake(poolAddress: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useQuery({
    queryKey: ['userStake', poolAddress.toString(), wallet.publicKey?.toString()],
    queryFn: async () => {
      if (!wallet.publicKey) return null;

      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Staking>(IDL, STAKING_PROGRAM_ID, provider);

      const [userStakePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_stake'), poolAddress.toBuffer(), wallet.publicKey.toBuffer()],
        STAKING_PROGRAM_ID
      );

      try {
        const userStake = await program.account.userStake.fetch(userStakePDA);

        // Calculate pending rewards
        const pool = await program.account.stakingPool.fetch(poolAddress);
        const pendingRewards = calculatePendingRewards(pool, userStake);

        return {
          ...userStake,
          pendingRewards,
          pda: userStakePDA,
        };
      } catch {
        return null; // User hasn't staked yet
      }
    },
    enabled: !!wallet.publicKey,
    refetchInterval: 5000,
  });
}

export function useStake(poolAddress: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
      }

      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Staking>(IDL, STAKING_PROGRAM_ID, provider);

      // Build and send transaction
      const tx = await program.methods
        .stake(new BN(amount))
        .accounts({
          pool: poolAddress,
          // ... other accounts
        })
        .transaction();

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakingPool'] });
      queryClient.invalidateQueries({ queryKey: ['userStake'] });
    },
  });
}

export function useClaimRewards(poolAddress: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Staking>(IDL, STAKING_PROGRAM_ID, provider);

      const tx = await program.methods
        .claimRewards()
        .accounts({
          pool: poolAddress,
          // ... other accounts
        })
        .transaction();

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStake'] });
    },
  });
}

function calculatePendingRewards(pool: any, userStake: any): number {
  // Simplified - actual calculation matches on-chain logic
  const PRECISION = 1e18;
  const now = Math.floor(Date.now() / 1000);
  const lastTime = Math.min(now, pool.endTime.toNumber());
  const timeDelta = Math.max(0, lastTime - pool.lastUpdateTime.toNumber());

  if (pool.totalStaked.toNumber() === 0) return userStake.rewardsEarned.toNumber();

  const rewardDelta =
    (timeDelta * pool.rewardRate.toNumber() * PRECISION) / pool.totalStaked.toNumber();

  const currentRewardPerToken = pool.rewardPerTokenStored.toNumber() + rewardDelta;
  const pending =
    (userStake.amount.toNumber() *
      (currentRewardPerToken - userStake.rewardPerTokenPaid.toNumber())) /
    PRECISION;

  return userStake.rewardsEarned.toNumber() + pending;
}
```

### Escrow Hooks

```tsx
// src/hooks/useEscrow.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN, Program, AnchorProvider } from '@coral-xyz/anchor';
import { IDL, Escrow } from '../idl/escrow';

const ESCROW_PROGRAM_ID = new PublicKey('ESCR111111111111111111111111111111111111');

export function useUserEscrows() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useQuery({
    queryKey: ['escrows', wallet.publicKey?.toString()],
    queryFn: async () => {
      if (!wallet.publicKey) return [];

      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Escrow>(IDL, ESCROW_PROGRAM_ID, provider);

      // Fetch escrows where user is creator or recipient
      const [asCreator, asRecipient] = await Promise.all([
        program.account.escrow.all([
          { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } },
        ]),
        program.account.escrow.all([
          { memcmp: { offset: 8 + 32, bytes: wallet.publicKey.toBase58() } },
        ]),
      ]);

      // Combine and dedupe
      const all = [...asCreator, ...asRecipient];
      const unique = Array.from(
        new Map(all.map((e) => [e.publicKey.toString(), e])).values()
      );

      return unique.map((e) => ({
        address: e.publicKey,
        ...e.account,
      }));
    },
    enabled: !!wallet.publicKey,
  });
}

export function useCreateEscrow() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipient,
      amount,
      description,
      mint,
    }: {
      recipient: string;
      amount: number;
      description: string;
      mint: string;
    }) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Escrow>(IDL, ESCROW_PROGRAM_ID, provider);

      const recipientPubkey = new PublicKey(recipient);
      const mintPubkey = new PublicKey(mint);
      const createdAt = Math.floor(Date.now() / 1000);

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          wallet.publicKey.toBuffer(),
          recipientPubkey.toBuffer(),
          new BN(createdAt).toArrayLike(Buffer, 'le', 8),
        ],
        ESCROW_PROGRAM_ID
      );

      const tx = await program.methods
        .createEscrow(new BN(amount), description)
        .accounts({
          escrow: escrowPDA,
          creator: wallet.publicKey,
          recipient: recipientPubkey,
          mint: mintPubkey,
          // ... other accounts
        })
        .transaction();

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return { signature, escrowAddress: escrowPDA };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
    },
  });
}

export function useReleaseEscrow() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (escrowAddress: PublicKey) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program<Escrow>(IDL, ESCROW_PROGRAM_ID, provider);

      const tx = await program.methods
        .release()
        .accounts({
          escrow: escrowAddress,
          creator: wallet.publicKey,
          // ... other accounts
        })
        .transaction();

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
    },
  });
}
```

### Staking UI Component

```tsx
// src/components/StakingPool.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useStakingPool, useUserStake, useStake, useClaimRewards } from '../hooks/useStaking';

interface Props {
  poolAddress: PublicKey;
}

export function StakingPool({ poolAddress }: Props) {
  const wallet = useWallet();
  const { data: pool, isLoading: poolLoading } = useStakingPool(poolAddress);
  const { data: userStake, isLoading: stakeLoading } = useUserStake(poolAddress);

  const stakeMutation = useStake(poolAddress);
  const claimMutation = useClaimRewards(poolAddress);

  const [stakeAmount, setStakeAmount] = useState('');

  if (!wallet.connected) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-4">Staking Pool</h2>
        <p className="mb-4">Connect your wallet to start staking</p>
        <WalletMultiButton />
      </div>
    );
  }

  if (poolLoading) {
    return <div className="text-center p-8">Loading pool...</div>;
  }

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount) * 1e9; // Convert to lamports
    await stakeMutation.mutateAsync(amount);
    setStakeAmount('');
  };

  const handleClaim = async () => {
    await claimMutation.mutateAsync();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Staking Pool</h2>
        <WalletMultiButton />
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-500">Total Staked</p>
          <p className="text-xl font-bold">
            {pool ? (pool.totalStaked.toNumber() / 1e9).toFixed(2) : '0'} SOL
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-500">APY</p>
          <p className="text-xl font-bold text-green-600">
            {pool ? pool.apy.toFixed(2) : '0'}%
          </p>
        </div>
      </div>

      {/* User Stats */}
      {userStake && (
        <div className="bg-blue-50 p-4 rounded mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Your Stake</span>
            <span className="font-bold">
              {(userStake.amount.toNumber() / 1e9).toFixed(4)} SOL
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Pending Rewards</span>
            <span className="font-bold text-green-600">
              {(userStake.pendingRewards / 1e9).toFixed(6)} SOL
            </span>
          </div>
        </div>
      )}

      {/* Stake Form */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Stake Amount</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 p-3 border rounded"
          />
          <button
            onClick={handleStake}
            disabled={stakeMutation.isPending || !stakeAmount}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {stakeMutation.isPending ? 'Staking...' : 'Stake'}
          </button>
        </div>
      </div>

      {/* Claim Button */}
      {userStake && userStake.pendingRewards > 0 && (
        <button
          onClick={handleClaim}
          disabled={claimMutation.isPending}
          className="w-full py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
        >
          {claimMutation.isPending ? 'Claiming...' : 'Claim Rewards'}
        </button>
      )}

      {/* Error Display */}
      {stakeMutation.error && (
        <p className="text-red-500 mt-4">{String(stakeMutation.error)}</p>
      )}
    </div>
  );
}
```

### Escrow UI Component

```tsx
// src/components/EscrowList.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  useUserEscrows,
  useCreateEscrow,
  useReleaseEscrow,
} from '../hooks/useEscrow';

const STATUS_COLORS = {
  Created: 'bg-yellow-100 text-yellow-800',
  Funded: 'bg-blue-100 text-blue-800',
  Released: 'bg-green-100 text-green-800',
  Refunded: 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export function EscrowList() {
  const wallet = useWallet();
  const { data: escrows, isLoading } = useUserEscrows();
  const createMutation = useCreateEscrow();
  const releaseMutation = useReleaseEscrow();

  const [showCreate, setShowCreate] = useState(false);
  const [newEscrow, setNewEscrow] = useState({
    recipient: '',
    amount: '',
    description: '',
  });

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      recipient: newEscrow.recipient,
      amount: parseFloat(newEscrow.amount) * 1e9,
      description: newEscrow.description,
      mint: 'So11111111111111111111111111111111111111112', // Native SOL
    });
    setShowCreate(false);
    setNewEscrow({ recipient: '', amount: '', description: '' });
  };

  const handleRelease = async (escrowAddress: PublicKey) => {
    await releaseMutation.mutateAsync(escrowAddress);
  };

  if (!wallet.connected) {
    return (
      <div className="text-center p-8">
        Connect your wallet to view escrows
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Escrows</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Escrow
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Escrow</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Recipient Address
              </label>
              <input
                type="text"
                value={newEscrow.recipient}
                onChange={(e) =>
                  setNewEscrow({ ...newEscrow, recipient: e.target.value })
                }
                className="w-full p-3 border rounded"
                placeholder="Solana address"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Amount (SOL)
              </label>
              <input
                type="number"
                value={newEscrow.amount}
                onChange={(e) =>
                  setNewEscrow({ ...newEscrow, amount: e.target.value })
                }
                className="w-full p-3 border rounded"
                placeholder="0.0"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={newEscrow.description}
                onChange={(e) =>
                  setNewEscrow({ ...newEscrow, description: e.target.value })
                }
                className="w-full p-3 border rounded"
                rows={3}
                placeholder="What is this escrow for?"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escrow List */}
      {isLoading ? (
        <div className="text-center p-8">Loading escrows...</div>
      ) : escrows?.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No escrows found. Create one to get started!
        </div>
      ) : (
        <div className="space-y-4">
          {escrows?.map((escrow) => (
            <div
              key={escrow.address.toString()}
              className="p-4 border rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      STATUS_COLORS[escrow.status as keyof typeof STATUS_COLORS]
                    }`}
                  >
                    {escrow.status}
                  </span>
                  <p className="text-lg font-bold mt-2">
                    {(escrow.amount.toNumber() / 1e9).toFixed(4)} SOL
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  {escrow.address.toString().slice(0, 8)}...
                </p>
              </div>

              <p className="text-gray-600 text-sm mb-2">{escrow.description}</p>

              <div className="text-xs text-gray-400 mb-3">
                <p>
                  To:{' '}
                  <span className="font-mono">
                    {escrow.recipient.toString().slice(0, 16)}...
                  </span>
                </p>
                <p>
                  Created:{' '}
                  {new Date(escrow.createdAt.toNumber() * 1000).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              {escrow.status === 'Funded' &&
                escrow.creator.equals(wallet.publicKey!) && (
                  <button
                    onClick={() => handleRelease(escrow.address)}
                    disabled={releaseMutation.isPending}
                    className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    {releaseMutation.isPending ? 'Releasing...' : 'Release Funds'}
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### App Entry Point

```tsx
// src/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './providers/WalletProvider';
import { StakingPool } from './components/StakingPool';
import { EscrowList } from './components/EscrowList';
import { PublicKey } from '@solana/web3.js';

const queryClient = new QueryClient();

// Example pool address (replace with your deployed pool)
const STAKING_POOL = new PublicKey('POOL1111111111111111111111111111111111111');

function App() {
  const [tab, setTab] = React.useState<'staking' | 'escrow'>('staking');

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <div className="min-h-screen bg-gray-100">
          <nav className="bg-white shadow">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setTab('staking')}
                  className={`px-4 py-2 rounded ${
                    tab === 'staking'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  Staking
                </button>
                <button
                  onClick={() => setTab('escrow')}
                  className={`px-4 py-2 rounded ${
                    tab === 'escrow'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  Escrow
                </button>
              </div>
            </div>
          </nav>

          <main className="py-8">
            {tab === 'staking' ? (
              <StakingPool poolAddress={STAKING_POOL} />
            ) : (
              <EscrowList />
            )}
          </main>
        </div>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
```

---

## Testing

### Anchor Tests

```typescript
// tests/staking.ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Staking } from '../target/types/staking';
import { expect } from 'chai';

describe('Staking', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Staking as Program<Staking>;

  it('Stakes and earns rewards', async () => {
    // ... test implementation
  });

  it('Respects cooldown period', async () => {
    // ... test implementation
  });
});

// tests/escrow.ts
describe('Escrow', () => {
  it('Creates, funds, and releases escrow', async () => {
    // ... test implementation
  });

  it('Allows refund from creator', async () => {
    // ... test implementation
  });
});
```

---

## Implementation Phases

### Phase 1: Staking Program (Week 1-2)
- [ ] Implement pool initialization
- [ ] Implement stake/unstake
- [ ] Implement reward calculation
- [ ] Implement claim rewards
- [ ] Write tests

### Phase 2: Escrow Program (Week 2-3)
- [ ] Implement create escrow
- [ ] Implement fund escrow
- [ ] Implement release/refund
- [ ] Write tests

### Phase 3: Frontend Setup (Week 3)
- [ ] Set up React + Vite project
- [ ] Configure wallet adapter
- [ ] Set up React Query

### Phase 4: Staking UI (Week 4)
- [ ] Build staking pool component
- [ ] Implement stake/unstake forms
- [ ] Add real-time reward display
- [ ] Add claim functionality

### Phase 5: Escrow UI (Week 4-5)
- [ ] Build escrow list component
- [ ] Build create escrow form
- [ ] Add release/refund buttons
- [ ] Add status filtering

### Phase 6: Polish (Week 5)
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsiveness
- [ ] Deploy to devnet

---

## Concepts Covered

| Concept | Where Applied |
|---------|---------------|
| **Staking Math** | Time-weighted reward distribution |
| **State Machines** | Escrow status transitions |
| **PDAs** | User stake accounts, escrow accounts |
| **Wallet Adapter** | Multi-wallet connection |
| **React Query** | Server state management |
| **Custom Hooks** | Reusable blockchain logic |
| **Real-time Updates** | Polling for balance changes |
| **Transaction Building** | Frontend tx construction |

---

## Folder Structure

```
staking-escrow/
├── programs/
│   ├── staking/
│   │   └── src/
│   │       ├── lib.rs
│   │       └── state.rs
│   └── escrow/
│       └── src/
│           └── lib.rs
├── app/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StakingPool.tsx
│   │   │   └── EscrowList.tsx
│   │   ├── hooks/
│   │   │   ├── useStaking.ts
│   │   │   └── useEscrow.ts
│   │   ├── providers/
│   │   │   └── WalletProvider.tsx
│   │   ├── idl/
│   │   │   ├── staking.ts
│   │   │   └── escrow.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── tests/
│   ├── staking.ts
│   └── escrow.ts
├── Anchor.toml
└── package.json
```

---

## Development Commands

```bash
# Setup
anchor init staking-escrow
cd staking-escrow

# Build programs
anchor build

# Test programs
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Generate IDL
anchor idl parse -f programs/staking/src/lib.rs -o app/src/idl/staking.json

# Frontend setup
cd app
npm create vite@latest . -- --template react-ts
npm install @solana/web3.js @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets \
  @coral-xyz/anchor @tanstack/react-query

# Run frontend
npm run dev

# Build for production
npm run build
```

---

## Summary

This project teaches essential DeFi patterns and frontend integration:

1. **Staking Mechanics**: Time-weighted reward distribution, cooldowns
2. **Escrow Pattern**: Conditional fund release state machine
3. **Frontend Integration**: Wallet adapter, React Query, custom hooks
4. **Full Stack Web3**: Programs + SDK + React frontend

These patterns are foundational for most DeFi applications and provide a complete template for building Solana dApps with modern React tooling.
