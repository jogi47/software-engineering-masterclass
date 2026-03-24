# Three-Phase Commit (3PC)

[← Back to Index](README.md)

Imagine you are building an internal settlement workflow that moves money between two ledger shards and only succeeds if both sides finalize the same transfer. After learning about coordinated commit, your team upgrades from naive sequential calls to a vote-then-commit coordinator and assumes the problem is solved.

Without an extra recovery-safe phase, you can still end up with participants waiting on an uncertain outcome:

```typescript
type Vote = "YES" | "NO";

interface TwoStepParticipant {
  readonly id: string;
  canCommit(txId: string): Promise<Vote>;
  doCommit(txId: string): Promise<void>;
  abort(txId: string): Promise<void>;
}

class FragileCoordinator {
  private readonly volatilePrepared = new Set<string>();

  async execute(txId: string, participants: TwoStepParticipant[]): Promise<void> {
    const votes = await Promise.all(
      participants.map((participant) => participant.canCommit(txId)),
    );

    if (votes.some((vote) => vote === "NO")) {
      await Promise.all(participants.map((participant) => participant.abort(txId)));
      return;
    }

    this.volatilePrepared.add(txId);

    // If the coordinator crashes here, participants only know they voted YES.
    // They do not know whether abort or commit is the safe final outcome.
    await Promise.all(participants.map((participant) => participant.doCommit(txId)));
  }
}
```

This fails in ways that matter operationally:
- after unanimous `YES`, participants may still not know whether the transaction must commit or must abort
- a coordinator crash can leave locks or reservations held while everyone waits for recovery
- timeouts add uncertainty rather than certainty when the failure model is only partially understood
- retries can increase noise and duplicate work without resolving the ambiguity

This is where **Three-Phase Commit (3PC)** comes in. 3PC adds an intermediate `PRECOMMIT` step between the initial vote and the final commit so recovery can infer a safer direction from durable participant state. The trade-off is stricter timing assumptions, another round trip, and more operational machinery than 2PC.

In this chapter, you will learn:
  * [Why Three-Phase Commit exists](#1-why-three-phase-commit-exists)
  * [What Three-Phase Commit is](#2-what-three-phase-commit-is)
  * [Which roles, assumptions, and preconditions matter](#3-roles-assumptions-and-preconditions)
  * [How the protocol works step by step](#4-how-the-protocol-works)
  * [How state transitions and timeout rules behave](#5-state-transitions-and-timeout-rules)
  * [How 3PC tries to avoid blocking under failure](#6-failure-handling-and-why-3pc-aims-to-avoid-blocking)
  * [How 3PC compares with other approaches](#7-3pc-vs-other-approaches)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [When to use it and which pitfalls repeat](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Three-Phase Commit Exists

Three-Phase Commit exists because 2PC's blocking problem comes from one awkward state: a participant can vote yes, hold resources, and still not know which final outcome is safe if the coordinator disappears.

### 2PC Leaves an Ambiguous Middle State

In a classic 2PC flow, a participant that has prepared is stuck in a state that is adjacent to both final outcomes:

```text
2PC participant view

INIT --> PREPARED --> COMMIT
            |
            +--------> ABORT
```

If the coordinator fails at the wrong moment, an operational participant may know:
- it already voted `YES`
- it may be holding locks or reservations
- it cannot safely commit on its own
- it cannot safely abort on its own

That is why 2PC blocks.

### 3PC Splits That Ambiguous State

The classic 3PC idea is to separate the "still safe to abort" state from the "commit is now the only safe direction" state:

```text
3PC participant view

INIT --> WAIT ---------> ABORT
          |
          v
      PRECOMMIT -------> COMMIT
```

The extra state acts as a buffer between the initial vote and the final commit.

### The Core Goal

The durable goal is not simply "add one more message."

The durable goal is:
- remove the single participant state that is adjacent to both `COMMIT` and `ABORT`
- make recovery infer a safe direction from participant state
- reduce indefinite waiting under the classical failure model

### Why This Matters

Blocking is not only a theoretical inconvenience. It can mean:
- rows or shards staying locked longer than expected
- capacity being consumed by in-doubt transactions
- operators needing manual repair after coordinator loss
- user-visible latency spikes during recovery

3PC tries to improve that situation, but only by paying for more protocol structure and stronger assumptions.


# 2. What Three-Phase Commit Is

Three-Phase Commit is a coordinated atomic commit protocol with three distinct stages:
- **CanCommit**
- **PreCommit**
- **DoCommit**

### A Conservative Definition

The durable idea is:

```text
3PC =
  one coordinator
  + multiple transactional participants
  + an initial vote
  + a separate prepare-to-commit buffer state
  + a final commit message
  + timeout-based recovery under stronger timing assumptions
```

### Phase 1: CanCommit

The coordinator asks each participant:

```text
Can you enter a waiting state for this transaction?
```

If the participant votes `YES`, it usually:
- validates local constraints
- records enough local state to remember the transaction
- enters a durable `WAIT` state

If it cannot continue, it votes `NO` and the transaction aborts.

### Phase 2: PreCommit

If every participant voted `YES`, the coordinator moves to `PRECOMMIT` and asks participants to do the same.

This phase means more than "please wait longer." It means:
- everyone already voted yes
- the coordinator has crossed the point where the protocol is moving toward commit
- participants can persist that they are now one safe step away from final commit

### Phase 3: DoCommit

After the coordinator receives acknowledgment that participants entered `PRECOMMIT`, it sends the final `DOCOMMIT` instruction.

Participants then:
- commit locally
- release locks or reservations
- record a final committed state

### What 3PC Is Not

3PC is usually not:
- a universal answer for long-running business workflows
- a good fit for arbitrary HTTP services with no durable state machine
- a substitute for consensus protocols in hostile or highly asynchronous environments
- a rollback mechanism for irreversible external side effects

If a participant cannot durably model `WAIT`, `PRECOMMIT`, and `COMMIT`, then it is not a real 3PC participant.


# 3. Roles, Assumptions, and Preconditions

3PC discussions only stay precise if the protocol assumptions are explicit. They are stricter than many application teams first expect.

### Coordinator

The coordinator:
- identifies the participant set
- sends `CAN_COMMIT`
- collects votes
- sends `PRECOMMIT`
- waits for acknowledgments
- sends `DOCOMMIT` or aborts earlier if phase 1 fails
- participates in recovery or yields to a backup coordinator after failure

### Participants

Each participant:
- validates whether it can join the transaction
- persists its local state transitions durably
- responds to `CAN_COMMIT`, `PRECOMMIT`, and `DOCOMMIT`
- exposes enough state for a recovery process to infer a safe final direction

### Shared Transaction Identity

Every message and local record must line up under one transaction ID:

```text
tx-48021
  ├── coordinator phase log
  ├── ledger shard A state
  ├── ledger shard B state
  └── recovery replay record
```

Without a stable transaction ID, recovery turns into guesswork.

### Classical Timing Assumptions

Textbook 3PC is usually described under assumptions roughly like these:
- message delay is bounded enough that timeout is meaningful
- process response time is bounded enough that long silence suggests failure
- failures are crash-or-timeout style, not arbitrary Byzantine behavior
- operational nodes can still exchange messages point to point during recovery

These assumptions are important. If the network can delay messages for an arbitrary amount of time, a timeout may mean slowness rather than failure, and 3PC's recovery logic becomes much less trustworthy.

### Durability Requirements

For 3PC to mean anything, participants and coordinator need durable state transitions:
- `WAIT` must survive crashes
- `PRECOMMIT` must survive crashes
- final `COMMIT` or `ABORT` must survive crashes
- retries of the same phase message must be safe

### Capability Summary

```text
┌──────────────────────────────┬────────────────────────────────────────────┐
│ 3PC helps with               │ 3PC still does not solve                  │
├──────────────────────────────┼────────────────────────────────────────────┤
│ atomic commit coordination   │ irreversible external side effects         │
│ across cooperating resources │                                            │
├──────────────────────────────┼────────────────────────────────────────────┤
│ reducing some blocking cases │ unbounded-delay or arbitrary-partition     │
│ seen in 2PC                 │ environments                               │
├──────────────────────────────┼────────────────────────────────────────────┤
│ state-driven recovery        │ long-running human workflows               │
│ after coordinator loss       │                                            │
├──────────────────────────────┼────────────────────────────────────────────┤
│ short internal transactions  │ generic internet-facing HTTP coordination  │
│ with durable participants    │ with no real transactional state machine   │
└──────────────────────────────┴────────────────────────────────────────────┘
```


# 4. How the Protocol Works

The happy path adds one more round than 2PC, but that extra round is the entire point.

### Happy Path Sequence

```text
Client        Coordinator         Participant A         Participant B
  |                |                   |                     |
  | begin tx-77    |                   |                     |
  |--------------->|                   |                     |
  |                | CAN_COMMIT        |                     |
  |                |------------------>|                     |
  |                | CAN_COMMIT                              |
  |                |---------------------------------------->|
  |                |                   | validate            |
  |                |                   | persist WAIT        |
  |                |<------------------| YES                 |
  |                |                                         | validate
  |                |                                         | persist WAIT
  |                |<----------------------------------------| YES
  |                | persist PRECOMMIT                       |
  |                | PRECOMMIT         |                     |
  |                |------------------>|                     |
  |                | PRECOMMIT                               |
  |                |---------------------------------------->|
  |                |                   | persist PRECOMMIT   |
  |                |<------------------| ACK                 |
  |                |                                         | persist PRECOMMIT
  |                |<----------------------------------------| ACK
  |                | persist COMMIT                          |
  |                | DOCOMMIT          |                     |
  |                |------------------>|                     |
  |                | DOCOMMIT                                |
  |                |---------------------------------------->|
  |                |                   | commit locally      |
  |                |<------------------| ACK                 |
  |                |                                         | commit locally
  |                |<----------------------------------------| ACK
  | success        |                   |                     |
  |<---------------|                   |                     |
```

### Abort Path

If any participant votes `NO` during `CAN_COMMIT`, the coordinator can abort immediately:

```text
votes:
  A -> YES
  B -> NO

result:
  coordinator sends ABORT
  participants release local reservations
```

The protocol only reaches `PRECOMMIT` after unanimous `YES`.

### Step-by-Step View

1. The coordinator identifies the fixed participant set for transaction `tx-77`.
2. It sends `CAN_COMMIT` to every participant.
3. Each participant validates local constraints, records `WAIT`, and replies `YES`, or rejects with `NO`.
4. If any participant rejects, the coordinator aborts.
5. If every participant votes `YES`, the coordinator records `PRECOMMIT` and sends `PRECOMMIT`.
6. Participants record `PRECOMMIT` durably and acknowledge it.
7. After all acknowledgments arrive, the coordinator records `COMMIT` and sends `DOCOMMIT`.
8. Participants commit locally and acknowledge completion.

### Why the PreCommit Acknowledgment Matters

The coordinator does not send `DOCOMMIT` immediately after unanimous `YES`.

It waits until every participant has acknowledged `PRECOMMIT` because that creates a stronger recovery picture:
- no operational participant should still be deciding whether abort is the safe direction
- a backup coordinator can inspect participant state and see whether the transaction crossed the precommit boundary
- a `PRECOMMIT` participant is closer to a final commit-safe state than a plain `WAIT` participant


# 5. State Transitions and Timeout Rules

3PC becomes much easier to reason about when you treat it as a pair of explicit state machines rather than as a sequence of messages.

### Coordinator States

```text
INIT
  |
  v
WAITING_FOR_VOTES ---- any NO / timeout ----> ABORT
  |
  | all YES
  v
PRECOMMIT -------- precommit acks complete --> COMMIT
```

### Participant States

```text
INIT -- vote YES --> WAIT -- PRECOMMIT msg --> PRECOMMIT -- DOCOMMIT --> COMMIT
  |
  +-- vote NO / ABORT -----------------------------------------------> ABORT
```

The key structural point is that the participant no longer has one state adjacent to both final outcomes.

### How to Read the States

`INIT`
- no durable promise yet
- safe to abandon the transaction

`WAIT`
- participant said it can commit
- it has not yet crossed into the commit-only direction
- recovery must still inspect the wider system before deciding the final outcome

`PRECOMMIT`
- participant knows the transaction passed the second coordination point
- under the classical protocol assumptions, commit is now the expected safe direction
- recovery should avoid taking this participant backward to abort without stronger evidence

`COMMIT` / `ABORT`
- final, idempotent states
- retries should not change the outcome

### Timeout Rules Need Recovery Logic

A timeout is not the same thing as a business decision.

Useful conservative rules are:
- if the coordinator times out while collecting `CAN_COMMIT` votes, it should abort rather than guess
- if the coordinator fails after some participants reached `PRECOMMIT`, recovery should inspect participant states before deciding
- if a participant is still in `WAIT` and loses the coordinator, it should not commit blindly
- if a participant is in `PRECOMMIT`, recovery usually drives the transaction toward commit rather than abort

### Why Timeouts Are Operationally Dangerous

Timeout-based recovery works only if your timeout model means something.

If long GC pauses, scheduler stalls, or network delays are common, then:
- a healthy coordinator may look dead
- a delayed `PRECOMMIT` may look absent when it is only late
- independent timeout decisions can diverge

That is why 3PC is usually taught with strong timing assumptions and a controlled environment.


# 6. Failure Handling and Why 3PC Aims to Avoid Blocking

3PC is best understood as a protocol that tries to make recovery inferable from state, not as a protocol that makes failure easy.

### The Structural Difference from 2PC

A compact way to compare them is:

```text
2PC:
  PREPARED can still lead to either ABORT or COMMIT
  -> coordinator failure can leave participants waiting indefinitely

3PC:
  WAIT tends toward ABORT
  PRECOMMIT tends toward COMMIT
  -> recovery can often infer direction from participant state
```

That state split is the heart of the design.

### Backup Coordinator Recovery Pattern

The classic recovery pattern is to choose a backup coordinator and let it inspect participant states.

```text
backup coordinator recovery:
  1. collect states from operational participants
  2. if any participant is COMMIT or PRECOMMIT, drive commit path
  3. otherwise, abort
```

In practice, a backup often first moves operational participants into one common recovery state before sending the final outcome, so future failovers see a consistent picture.

### Why This Can Reduce Blocking

Suppose the original coordinator crashes after sending `PRECOMMIT` to the participants but before sending `DOCOMMIT`.

Participants that persisted `PRECOMMIT` now give the backup useful evidence:
- everyone voted yes earlier
- the transaction crossed the precommit boundary
- commit is safer than indefinite waiting or arbitrary abort

That is better than 2PC, where a prepared participant may still be unable to distinguish "safe to commit" from "safe to abort."

### Important Limitation

The phrase "nonblocking" around 3PC needs careful framing.

In the classic literature, the claim depends on the protocol assumptions holding. If your environment allows:
- long unbounded network partitions
- unreliable failure detection
- participants that cannot exchange recovery messages

then textbook 3PC loses much of the clarity it relies on.

### Durable Practical Interpretation

A conservative way to describe 3PC is:

```text
3PC aims to avoid some 2PC blocking scenarios
by separating abort-safe and commit-safe intermediate states,
but those benefits rely on stronger timing and communication assumptions.
```

That is a more durable statement than saying it "solves blocking" without qualification.


# 7. 3PC vs Other Approaches

3PC is one point in a wider design space. It is rarely the default answer unless its assumptions fit your environment unusually well.

### Comparison Table

```text
┌────────────────────────────┬──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Approach                   │ Best fit                     │ Main benefit                 │ Main cost                    │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Single local transaction   │ one engine owns all writes   │ simplest strong atomicity    │ less service autonomy        │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Two-Phase Commit           │ short internal multi-resource│ classic atomic commit        │ blocking under failure       │
│                            │ transactions                 │ coordination                 │                              │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Three-Phase Commit         │ tightly controlled internal  │ separates WAIT from          │ extra round trip and strong  │
│                            │ environments with meaningful │ PRECOMMIT to reduce some     │ timing assumptions           │
│                            │ timeouts                     │ blocking cases               │                              │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Consensus-backed           │ replicated agreement where   │ stronger handling of leader  │ more machinery, replication, │
│ coordination               │ partitions and failover are  │ failover and durable         │ and operational complexity   │
│                            │ central design concerns      │ replicated decisions         │                              │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Saga / compensation        │ long-running workflows and   │ better autonomy and external │ compensating logic and       │
│                            │ external side effects        │ system fit                   │ temporary inconsistency      │
└────────────────────────────┴──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

### Prefer Local Transactions When You Can

If one resource can honestly own the critical write path, one local transaction is still the cleanest answer:
- simpler reasoning
- simpler recovery
- no cross-node ambiguity

The best distributed commit protocol is often "do not distribute this transaction."

### 3PC vs 2PC

3PC improves on 2PC in one narrow way:
- it adds a buffer state so recovery can often infer direction from state

But it also adds:
- another message round
- another durable state transition
- stronger dependency on meaningful timeout behavior

If your system does not satisfy those assumptions, a half-implemented 3PC is often worse than an honestly constrained 2PC.

### 3PC vs Consensus-Backed Systems

Consensus-backed coordination addresses a different class of problems:
- replicated agreement on a sequence of decisions
- leadership changes under failure
- durability that does not depend on one coordinator's local memory

That does not make 3PC obsolete. It means 3PC and consensus solve different layers of coordination, and modern systems often prefer consensus when the failure model is harsher.

### 3PC vs Sagas

If your workflow includes:
- payment gateways
- human approval
- shipping requests
- email or webhook side effects

then saga-style local transactions plus compensation are often more realistic than trying to force a textbook atomic commit protocol across participants that cannot truly prepare and recover.


# 8. Practical TypeScript Patterns

The code below models the state machine explicitly. It is a study implementation, not a production-ready transaction manager, but it captures the durable lessons:
- phase transitions must be explicit
- local state must be durable
- recovery needs observable participant state

### Coordinator and Participant Contracts

```typescript
type Vote = "YES" | "NO";
type FinalDecision = "COMMIT" | "ABORT";

type CoordinatorPhase =
  | "INIT"
  | "WAITING_FOR_VOTES"
  | "PRECOMMIT"
  | "COMMIT"
  | "ABORT";

type ParticipantState =
  | "INIT"
  | "WAIT"
  | "PRECOMMIT"
  | "COMMITTED"
  | "ABORTED";

interface ThreePhaseParticipant {
  readonly id: string;
  canCommit(txId: string): Promise<Vote>;
  preCommit(txId: string): Promise<void>;
  doCommit(txId: string): Promise<void>;
  abort(txId: string): Promise<void>;
  getState(txId: string): Promise<ParticipantState>;
}

interface CoordinatorLogRepository {
  start(txId: string, participantIds: string[]): Promise<void>;
  recordVote(txId: string, participantId: string, vote: Vote): Promise<void>;
  recordPhase(txId: string, phase: CoordinatorPhase): Promise<void>;
  markFinished(txId: string): Promise<void>;
}
```

### A Minimal 3PC Coordinator

```typescript
class ThreePhaseCommitCoordinator {
  constructor(private readonly log: CoordinatorLogRepository) {}

  async execute(
    txId: string,
    participants: ThreePhaseParticipant[],
  ): Promise<FinalDecision> {
    await this.log.start(
      txId,
      participants.map((participant) => participant.id),
    );

    await this.log.recordPhase(txId, "WAITING_FOR_VOTES");

    const votes = await Promise.all(
      participants.map(async (participant) => {
        try {
          const vote = await participant.canCommit(txId);
          await this.log.recordVote(txId, participant.id, vote);
          return { participant, vote } as const;
        } catch {
          await this.log.recordVote(txId, participant.id, "NO");
          return { participant, vote: "NO" as const };
        }
      }),
    );

    if (votes.some((entry) => entry.vote === "NO")) {
      await this.abortAll(txId, participants);
      return "ABORT";
    }

    await this.log.recordPhase(txId, "PRECOMMIT");
    await Promise.all(participants.map((participant) => participant.preCommit(txId)));

    await this.log.recordPhase(txId, "COMMIT");
    await Promise.all(participants.map((participant) => participant.doCommit(txId)));

    await this.log.markFinished(txId);
    return "COMMIT";
  }

  private async abortAll(
    txId: string,
    participants: ThreePhaseParticipant[],
  ): Promise<void> {
    await this.log.recordPhase(txId, "ABORT");
    await Promise.allSettled(
      participants.map((participant) => participant.abort(txId)),
    );
    await this.log.markFinished(txId);
  }
}
```

This keeps the important order visible:
- first gather votes
- then persist the `PRECOMMIT` phase
- only then tell participants to enter `PRECOMMIT`
- only after that send the final commit

### A Participant with Explicit Durable State

```typescript
type TransferRecord = {
  txId: string;
  accountId: string;
  deltaCents: number;
  state: ParticipantState;
};

interface LedgerTx {
  getTransfer(txId: string): Promise<TransferRecord | null>;
  saveTransfer(record: TransferRecord): Promise<void>;
  getBalanceForUpdate(accountId: string): Promise<number>;
  applyDelta(accountId: string, deltaCents: number): Promise<void>;
}

interface LedgerRepository {
  withTransaction<T>(work: (tx: LedgerTx) => Promise<T>): Promise<T>;
}

class LedgerShardParticipant implements ThreePhaseParticipant {
  constructor(
    public readonly id: string,
    private readonly repository: LedgerRepository,
    private readonly accountId: string,
    private readonly deltaCents: number,
  ) {}

  async canCommit(txId: string): Promise<Vote> {
    return this.repository.withTransaction(async (tx) => {
      const existing = await tx.getTransfer(txId);

      if (
        existing?.state === "WAIT" ||
        existing?.state === "PRECOMMIT" ||
        existing?.state === "COMMITTED"
      ) {
        return "YES";
      }

      if (existing?.state === "ABORTED") {
        return "NO";
      }

      const balance = await tx.getBalanceForUpdate(this.accountId);
      const nextBalance = balance + this.deltaCents;

      if (nextBalance < 0) {
        return "NO";
      }

      await tx.saveTransfer({
        txId,
        accountId: this.accountId,
        deltaCents: this.deltaCents,
        state: "WAIT",
      });

      return "YES";
    });
  }

  async preCommit(txId: string): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const existing = await tx.getTransfer(txId);

      if (!existing) {
        throw new Error(`missing WAIT record for ${txId}`);
      }

      if (
        existing.state === "PRECOMMIT" ||
        existing.state === "COMMITTED"
      ) {
        return;
      }

      if (existing.state === "ABORTED") {
        throw new Error(`cannot precommit aborted transfer ${txId}`);
      }

      await tx.saveTransfer({ ...existing, state: "PRECOMMIT" });
    });
  }

  async doCommit(txId: string): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const existing = await tx.getTransfer(txId);

      if (!existing) {
        throw new Error(`missing transfer record for ${txId}`);
      }

      if (existing.state === "COMMITTED") {
        return;
      }

      if (existing.state !== "PRECOMMIT") {
        throw new Error(`cannot commit from state ${existing.state}`);
      }

      await tx.applyDelta(existing.accountId, existing.deltaCents);
      await tx.saveTransfer({ ...existing, state: "COMMITTED" });
    });
  }

  async abort(txId: string): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const existing = await tx.getTransfer(txId);

      if (!existing || existing.state === "ABORTED") {
        return;
      }

      if (
        existing.state === "PRECOMMIT" ||
        existing.state === "COMMITTED"
      ) {
        throw new Error(`cannot abort from state ${existing.state}`);
      }

      await tx.saveTransfer({ ...existing, state: "ABORTED" });
    });
  }

  async getState(txId: string): Promise<ParticipantState> {
    return this.repository.withTransaction(async (tx) => {
      return (await tx.getTransfer(txId))?.state ?? "INIT";
    });
  }
}
```

The key lesson is that every phase change is durable and retry-safe.

### A Simplified Backup Coordinator

```typescript
class BackupCoordinator {
  async recover(
    txId: string,
    participants: ThreePhaseParticipant[],
  ): Promise<FinalDecision> {
    const states = await Promise.all(
      participants.map(async (participant) => {
        return {
          participant,
          state: await participant.getState(txId),
        } as const;
      }),
    );

    const shouldCommit = states.some(
      (entry) =>
        entry.state === "PRECOMMIT" || entry.state === "COMMITTED",
    );

    if (!shouldCommit) {
      await Promise.allSettled(
        states.map(async ({ participant, state }) => {
          if (state === "WAIT") {
            await participant.abort(txId);
          }
        }),
      );

      return "ABORT";
    }

    await Promise.allSettled(
      states.map(async ({ participant, state }) => {
        if (state === "WAIT") {
          await participant.preCommit(txId);
        }
      }),
    );

    await Promise.allSettled(
      participants.map((participant) => participant.doCommit(txId)),
    );

    return "COMMIT";
  }
}
```

This recovery worker is intentionally simplified, but it shows the 3PC idea clearly:
- if any operational participant already reached `PRECOMMIT`, the backup favors the commit path
- otherwise it favors abort
- it first tries to align operational participants on a common intermediate state before finalizing

### Production Notes

Real implementations would usually add:
- durable participant membership and message replay
- explicit timeout policy for each phase
- coordinator election or leasing
- metrics for transactions stuck in `WAIT` or `PRECOMMIT`
- tests for coordinator crash, delayed messages, duplicate delivery, and replay

The durable lesson is that 3PC is mostly a state-machine discipline problem, not an "add one more RPC" trick.


# 9. When to Use It and Common Pitfalls

3PC fits only a fairly narrow envelope. It is more valuable as a coordination concept than as a default building block for ordinary microservice workflows.

### Better Fit

3PC is most plausible when:
- every participant is internal and under one operational team or tightly aligned teams
- participants can persist explicit protocol states durably
- transactions are short-lived
- timeout behavior is meaningful enough that recovery decisions are not random guesses
- you care about reducing some 2PC blocking cases more than you care about minimizing protocol complexity

### Weak Fit

3PC is usually a weak fit when:
- the workflow crosses third-party APIs
- participants are generic stateless HTTP services
- network delays can be long or highly variable
- the environment frequently experiences partitions or long stop-the-world pauses
- the workflow is long-running or includes humans in the loop

### Repeating Pitfalls

```text
Bad:
├── treating a normal request timeout as trustworthy failure detection
├── implementing PRECOMMIT in volatile memory rather than durable storage
├── letting participants abort after they already entered PRECOMMIT
├── forgetting that backup-coordinator logic is part of the protocol, not an optional extra
├── using 3PC for email, webhooks, or payment APIs with no real prepare phase
└── assuming textbook nonblocking claims automatically hold in cloud-scale async environments

Good:
├── keep the participant set small, explicit, and durable
├── persist WAIT, PRECOMMIT, COMMIT, and ABORT transitions safely
├── make phase handlers idempotent under retries
├── rehearse backup recovery and replay paths
├── monitor transactions that linger in intermediate states
└── choose a different coordination model when the assumptions do not hold
```

### A Practical Modern View

You should still learn 3PC because it teaches an important design lesson:

```text
Blocking often comes from ambiguous intermediate state.
```

By splitting that state, 3PC shows how protocol structure changes recovery behavior.

At the same time, many modern production systems choose other tools for end-to-end workflows:
- local transactions when one boundary can own the truth
- consensus-backed coordination for replicated agreement under harder failures
- sagas or outbox-based designs for external and long-running workflows

That is not a rejection of 3PC. It is an admission that the real failure model often matters more than the elegance of the textbook protocol.


# 10. Summary

**Three-Phase Commit (3PC)** is an atomic commit protocol that adds a `PRECOMMIT` buffer state between the initial vote and the final commit.
- It exists to reduce the ambiguity that makes 2PC block under coordinator failure.
- Its extra phase separates a still-abortable `WAIT` state from a commit-leaning `PRECOMMIT` state.

**Its main strength is better state-driven recovery than plain 2PC under the classical model.**
- A backup coordinator can often infer the safer direction from participant state.
- Participants are not left with one intermediate state adjacent to both `COMMIT` and `ABORT`.

**Its main cost is stricter assumptions plus more protocol overhead.**
- It adds another network round and another durable state transition.
- Its timeout-based recovery story depends on bounded-delay assumptions that many modern environments do not reliably satisfy.

**It is specialized, not universal.**
- It can make sense for short internal transactions among durable, cooperative participants.
- It is usually a poor fit for third-party APIs, long-running workflows, and generic microservice request chains.

**Implementation checklist:**

```text
Protocol shape:
  □ Confirm you actually need cross-resource atomic commit rather than a local transaction
  □ Keep the participant set explicit and stable for each transaction
  □ Use one transaction ID across coordinator logs and participant records

Participants:
  □ Persist WAIT before voting YES
  □ Persist PRECOMMIT before acknowledging that phase
  □ Make DOCOMMIT idempotent and valid only from PRECOMMIT
  □ Do not let participants silently abort after entering PRECOMMIT

Coordinator and recovery:
  □ Record coordinator phase transitions durably
  □ Abort conservatively if phase 1 does not complete cleanly
  □ Implement backup coordinator or equivalent recovery ownership
  □ Gather participant states before forcing an outcome after failure

Operations:
  □ Use conservative timeout settings only in environments where they are meaningful
  □ Monitor transactions stuck in WAIT or PRECOMMIT
  □ Test coordinator crash, delayed message, duplicate message, and replay scenarios
  □ Prefer consensus-backed or compensation-based approaches when the failure model demands them
```
