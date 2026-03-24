# Two-Phase Commit (2PC)

[← Back to Index](README.md)

Imagine you are building an internal money transfer between two account shards. The business rule is simple: debit the source account and credit the destination account as one atomic transfer.

Without a coordination protocol, teams often write code that looks clean but is only locally correct:

```typescript
type TransferInput = {
  txId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
};

interface DebitShard {
  debit(accountId: string, amountCents: number): Promise<void>;
}

interface CreditShard {
  credit(accountId: string, amountCents: number): Promise<void>;
}

class NaiveTransferService {
  constructor(
    private readonly sourceShard: DebitShard,
    private readonly destinationShard: CreditShard,
  ) {}

  async transfer(input: TransferInput): Promise<void> {
    await this.sourceShard.debit(input.fromAccountId, input.amountCents);
    await this.destinationShard.credit(input.toAccountId, input.amountCents);
  }
}
```

This fails in predictable ways:
- the source shard may commit the debit even if the process crashes before the credit
- a timeout after the credit call may leave you unsure whether the destination committed
- retries can create double credits unless every participant is carefully designed for idempotency
- one local database transaction does not automatically extend across both shards

This is where **Two-Phase Commit (2PC)** comes in. 2PC is the classic atomic commit protocol for multiple transactional participants. It gives one coordinator a disciplined way to ask every participant to prepare first, then make one final commit-or-abort decision for all of them.

In this chapter, you will learn:
  * [Why Two-Phase Commit exists](#1-why-two-phase-commit-exists)
  * [What Two-Phase Commit is](#2-what-two-phase-commit-is)
  * [Which roles, guarantees, and preconditions matter](#3-roles-guarantees-and-preconditions)
  * [How the protocol works step by step](#4-how-the-protocol-works)
  * [How state transitions and recovery behave](#5-state-transitions-and-recovery)
  * [Why failures create the blocking problem](#6-failures-and-the-blocking-problem)
  * [How 2PC compares with other approaches](#7-2pc-vs-other-approaches)
  * [What practical TypeScript patterns look like](#8-practical-typescript-patterns)
  * [When to use it and which pitfalls repeat](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Two-Phase Commit Exists

Two-Phase Commit exists because some transactions must update more than one independent transactional resource while still presenting one atomic outcome.

### One Logical Transaction Can Span Many Owners

Examples include:
- moving funds between database shards
- updating related records across separate databases in one controlled platform
- coordinating a database write with another transactional resource that supports prepare and commit

Without coordination, each participant can commit its local work independently:

```text
Application
    |
    v
debit source shard  -----------> committed
    |
    v
credit destination shard -----> maybe committed, maybe not
    |
    v
client times out
```

That leaves the caller with an uncertain story:
- maybe the debit happened and the credit did not
- maybe both happened but the acknowledgment was lost
- maybe one participant will retry or recover differently from the other

### Local ACID Stops at the Resource Boundary

Each database engine can usually guarantee atomicity for its own writes because it controls:
- its lock manager
- its transaction log
- its recovery process
- its commit decision

Once a transaction spans two resource managers, no single engine can commit or roll back the whole unit of work alone.

### 2PC Tries to Solve a Narrow but Important Problem

2PC is designed for this narrower question:

```text
Can a set of transactional participants either
all commit one shared decision
or all abort it?
```

That is powerful, but it is narrower than "make every distributed workflow easy." 2PC is best understood as an atomic commit protocol for cooperating transactional participants, not as a universal answer for every cross-service business process.


# 2. What Two-Phase Commit Is

Two-Phase Commit is a coordinated commit protocol with two distinct phases:
- **Phase 1: Prepare**
- **Phase 2: Commit or abort**

### A Conservative Definition

The durable idea is:

```text
2PC =
  one coordinator
  + multiple participants
  + a prepare vote from each participant
  + one final durable decision for all participants
```

### Phase 1: Prepare

The coordinator asks each participant:

```text
Can you commit this transaction if I later tell you to?
```

If a participant votes `YES`, it has usually done three important things locally:
- validated that the transaction can succeed
- recorded enough durable state to survive a crash
- entered a prepared state where it is waiting for the final decision

If a participant cannot safely continue, it votes `NO`.

### Phase 2: Final Decision

The coordinator decides:
- `COMMIT` only if every participant voted `YES`
- `ABORT` if any participant voted `NO` or failed before a safe unanimous prepare

The coordinator records that decision durably, then sends it to all participants.

### What Prepare Really Means

Prepare is not the same as commit.

It usually means:
- the participant has reserved or locked the relevant data
- the participant has written a prepare record or equivalent durable state
- the participant promises it can commit later if told to do so

That prepared state is what makes coordinated commit possible, but it is also what creates blocking under failure.

### What 2PC Is Not

2PC is usually not a good fit for:
- external APIs that cannot expose a real prepare phase
- email, SMS, webhook delivery, or other irreversible side effects
- long-running workflows involving user approval or human delay
- arbitrary microservices that only expose normal request-response endpoints

If a participant cannot truly support prepare, commit, abort, and recovery semantics, it is not a real 2PC participant.


# 3. Roles, Guarantees, and Preconditions

2PC discussions become much clearer once the main roles and limits are explicit.

### Coordinator

The coordinator:
- assigns or tracks the transaction ID
- sends `PREPARE` to all participants
- collects votes
- records the final decision durably
- sends `COMMIT` or `ABORT`
- retries decision delivery during recovery if acknowledgments are missing

### Participants

Each participant:
- performs its local transaction work
- decides whether it can safely prepare
- records prepared state durably before voting `YES`
- waits for the final decision
- commits or aborts locally when instructed

### Shared Transaction Identity

Every participant needs a stable transaction ID so logs and retries can line up:

```text
tx-9012
  ├── coordinator log record
  ├── source shard prepared record
  └── destination shard prepared record
```

Without a stable identifier, crash recovery and duplicate message handling become much harder.

### What 2PC Can Give You

When the infrastructure supports it correctly, 2PC can provide:
- one atomic commit decision across multiple transactional participants
- durable recovery from many crash windows
- a cleaner model than ad hoc cross-resource retries

### What 2PC Does Not Give You

2PC does not automatically provide:
- high availability during partitions or coordinator outages
- rollback of external side effects that already escaped
- low latency under slow or overloaded participants
- a good fit for long-running business workflows

### Preconditions for Real 2PC

2PC depends on strong preconditions:
- every participant must support a real prepare state
- prepared state must survive process or node crashes
- the coordinator must log the final decision durably
- participants must handle repeated `COMMIT` and `ABORT` messages safely
- transactions should stay short enough that held locks do not become an operational hazard

### Capability Summary

```text
┌──────────────────────────────┬────────────────────────────────────────────┐
│ 2PC helps with               │ 2PC does not solve                         │
├──────────────────────────────┼────────────────────────────────────────────┤
│ atomic commit across         │ irreversible external side effects         │
│ cooperating resources        │                                            │
├──────────────────────────────┼────────────────────────────────────────────┤
│ durable decision recovery    │ long-running approval workflows            │
├──────────────────────────────┼────────────────────────────────────────────┤
│ commit/abort agreement       │ coordinator-free availability              │
│ after unanimous prepare      │ during partitions                          │
├──────────────────────────────┼────────────────────────────────────────────┤
│ controlled internal          │ arbitrary HTTP APIs with no prepare phase  │
│ transactional environments   │                                            │
└──────────────────────────────┴────────────────────────────────────────────┘
```


# 4. How the Protocol Works

The protocol has one happy path and one early-abort path.

### Happy Path

```text
Client        Coordinator        Participant A        Participant B
  |                |                   |                   |
  | begin tx-42    |                   |                   |
  |--------------->|                   |                   |
  |                | PREPARE tx-42     |                   |
  |                |------------------>|                   |
  |                | PREPARE tx-42                         |
  |                |-------------------------------------->|
  |                |                   | write PREPARED    |
  |                |                   | lock rows         |
  |                |                   | vote YES          |
  |                |<------------------|                   |
  |                |                                       | write PREPARED
  |                |                                       | lock rows
  |                |                                       | vote YES
  |                |<--------------------------------------|
  |                | write COMMIT decision                 |
  |                | COMMIT tx-42      |                   |
  |                |------------------>|                   |
  |                | COMMIT tx-42                          |
  |                |-------------------------------------->|
  |                |                   | commit locally    |
  |                |                   | release locks     |
  |                |<------------------| ack               |
  |                |                                       | commit locally
  |                |                                       | release locks
  |                |<--------------------------------------| ack
  | success        |                   |                   |
  |<---------------|                   |                   |
```

### Abort Path

If any participant votes `NO`, or if the coordinator does not obtain a safe unanimous prepare, the coordinator records `ABORT` and sends `ABORT` to every participant.

```text
prepare votes:
  A -> YES
  B -> NO

result:
  coordinator decision = ABORT
```

Participants that already prepared must still receive the abort message so they can release locks and discard reserved state.

### Step-by-Step View

1. The coordinator identifies the participants for transaction `tx-42`.
2. The coordinator sends `PREPARE` to all participants.
3. Each participant validates local constraints and records prepared state before voting `YES`.
4. If every participant voted `YES`, the coordinator writes a durable `COMMIT` decision.
5. Otherwise, the coordinator writes a durable `ABORT` decision.
6. The coordinator sends the final decision to every participant.
7. Each participant completes its local commit or local abort and releases held resources.

### Why the Coordinator Must Log First

The most important ordering rule is:

```text
write final decision durably
before
telling participants the decision
```

If the coordinator could send `COMMIT` before logging it durably, a crash could leave some participants committed while recovery has no trustworthy record of the intended outcome.


# 5. State Transitions and Recovery

2PC works in practice only if both coordinator and participants can recover from crashes using durable state.

### Coordinator States

```text
INIT
  |
  v
WAITING_FOR_VOTES
  |\
  | \ all YES
  |  \
  |   v
  |  COMMIT_DECIDED
  |
  | any NO or prepare failure
  v
ABORT_DECIDED

COMMIT_DECIDED ----> DONE
ABORT_DECIDED  ----> DONE
```

### Participant States

```text
WORKING
  |\
  | \ vote NO
  |  \
  |   v
  |  ABORTED
  |
  | vote YES after durable prepare
  v
PREPARED
  |\
  | \ receive COMMIT
  |  \
  |   v
  |  COMMITTED
  |
  | receive ABORT
  v
ABORTED
```

### What Recovery Needs to Answer

After a crash, each side needs to answer:
- did I already record a final decision?
- did I already enter prepared state?
- if I am prepared but undecided, who can tell me the decision?

### Recovery Rules to Keep Straight

Useful conservative rules are:
- if a participant never durably prepared, it can usually roll back its local work
- if a participant is durably `PREPARED`, it should not invent its own final outcome
- if the coordinator has a durable `COMMIT` or `ABORT` record, recovery should re-drive that decision until participants acknowledge it
- if no durable commit record exists yet, many implementations recover toward abort, but prepared participants still need an authoritative decision path rather than a local guess

### Durable Metadata Example

In many systems, the coordinator and participants persist enough metadata to recover incomplete decisions.

```sql
CREATE TABLE two_phase_transactions (
    tx_id UUID PRIMARY KEY,
    coordinator_status VARCHAR(32) NOT NULL,
    decision VARCHAR(16) NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE two_phase_participants (
    tx_id UUID NOT NULL,
    participant_id VARCHAR(64) NOT NULL,
    vote VARCHAR(8) NULL,
    participant_status VARCHAR(32) NOT NULL,
    prepared_at TIMESTAMPTZ NULL,
    PRIMARY KEY (tx_id, participant_id)
);

CREATE INDEX idx_two_phase_transactions_status
ON two_phase_transactions (coordinator_status, updated_at);
```

The exact schema varies, but the durable idea is stable:
- record enough state to know whether prepare happened
- record the final decision once it is made
- make recovery able to replay incomplete commit or abort delivery

### An Important Ambiguity

If all participants voted `YES` but the coordinator crashes before a participant learns the final decision, the participant may remain in doubt:

```text
participant state = PREPARED
decision visible locally = unknown
safe local action = wait for authoritative recovery
```

That is the heart of the blocking problem explained next.


# 6. Failures and the Blocking Problem

The central weakness of 2PC is not that it is old. The central weakness is that prepared participants may have to wait when the decision path is unavailable.

### Common Failure Cases

```text
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────────────┐
│ Failure                      │ Safe interpretation          │ Typical consequence                  │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Participant votes NO         │ abort is required            │ coordinator sends ABORT              │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Participant crashes before   │ prepare may be absent        │ coordinator often aborts             │
│ voting YES                   │                              │                                      │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Coordinator crashes after    │ prepared participants know   │ they may block waiting for decision  │
│ YES votes but before         │ only that they are prepared  │                                      │
│ participants receive decision│                              │                                      │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Network partition between    │ final outcome is unclear     │ retries and blocking until recovery  │
│ coordinator and participant  │ to isolated participant      │                                      │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────────────┤
│ Lost commit acknowledgment   │ decision may still be commit │ coordinator must retry decision      │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────────────┘
```

### Why 2PC Is Blocking

A participant that already voted `YES` has made a durable promise:
- it is ready to commit later
- it must not unilaterally abort if commit may already have been chosen elsewhere
- it may still be holding locks or reserved resources

If the coordinator is unavailable and the participant cannot learn the final decision safely, it may have to remain in `PREPARED`.

```text
Coordinator down
      |
      v
Participant A: PREPARED, locks held
Participant B: PREPARED, locks held
      |
      v
other work may wait behind those locks
```

### Blocking Is an Operational Cost, Not Just a Theory Problem

Blocking can lead to:
- lock contention
- rising latency for unrelated transactions
- growing in-doubt transaction queues
- operator intervention or automated recovery pressure

This is why 2PC is usually a better fit for short, tightly controlled transactions than for slow, user-facing workflows.

### Why Timeouts Do Not Magically Solve It

A timeout helps detect that progress is not happening. It does not prove which final decision is safe.

For a prepared participant:

```text
timeout != permission to guess
```

If it guessed wrong, atomicity would be broken precisely when the protocol is supposed to preserve it.


# 7. 2PC vs Other Approaches

2PC is one coordination tool among several. It is useful only when its trade-offs match the problem.

### Comparison Table

```text
┌────────────────────────────┬──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Approach                   │ Best fit                     │ Main benefit                 │ Main cost                    │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Single local transaction   │ one database owns all writes │ simplest strong atomicity    │ less autonomy                │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Two-Phase Commit           │ short internal multi-resource│ atomic commit agreement      │ blocking and extra latency   │
│                            │ transactions                 │ across participants          │                              │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Saga / compensation        │ long-running workflows       │ better autonomy and          │ compensating logic and       │
│                            │ with reversible steps        │ availability                 │ temporary inconsistency      │
├────────────────────────────┼──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Outbox plus idempotency    │ reliable async propagation   │ durable handoff to messaging │ not one atomic global commit │
└────────────────────────────┴──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

### Prefer Local Transactions When You Can

If the data genuinely belongs in one transactional boundary, a single local transaction is usually simpler and safer than 2PC.

Keeping the critical write path local often reduces:
- coordination overhead
- failure ambiguity
- recovery complexity

### Prefer Sagas for Long or External Workflows

If the workflow includes:
- payment gateways with no prepare phase
- email or webhook side effects
- human approval steps
- operations that can take seconds or minutes

then saga-style local transactions plus compensation are often a better fit than 2PC.

### Where 2PC Still Fits

2PC is most plausible when:
- the participants are inside one controlled environment
- each participant can expose genuine transactional prepare semantics
- the transaction is short-lived
- atomic commit matters more than temporary availability during failures

You will often see 2PC discussed inside database engines, transaction managers, or tightly integrated storage systems more than in arbitrary application-level HTTP workflows.


# 8. Practical TypeScript Patterns

The code below models the coordinator logic and participant contracts so the mechanics stay visible. In many real deployments, the actual prepare and commit are implemented by a database engine or transaction manager below your business logic, but the same rules still apply:
- durable decision logging
- idempotent commit and abort handling
- recovery for incomplete outcomes

### Coordinator and Participant Interfaces

```typescript
type Vote = "YES" | "NO";
type Decision = "COMMIT" | "ABORT";

interface Participant {
  readonly id: string;
  prepare(txId: string): Promise<Vote>;
  commit(txId: string): Promise<void>;
  abort(txId: string): Promise<void>;
}

interface CoordinatorLogRepository {
  start(txId: string, participantIds: string[]): Promise<void>;
  recordVote(txId: string, participantId: string, vote: Vote): Promise<void>;
  recordDecision(txId: string, decision: Decision): Promise<void>;
  markFinished(txId: string): Promise<void>;
}
```

### A Minimal Coordinator

```typescript
class TwoPhaseCommitCoordinator {
  constructor(private readonly log: CoordinatorLogRepository) {}

  async execute(txId: string, participants: Participant[]): Promise<Decision> {
    await this.log.start(
      txId,
      participants.map((participant) => participant.id),
    );

    const votes = await Promise.all(
      participants.map(async (participant) => {
        try {
          const vote = await participant.prepare(txId);
          await this.log.recordVote(txId, participant.id, vote);
          return { participant, vote } as const;
        } catch {
          await this.log.recordVote(txId, participant.id, "NO");
          return { participant, vote: "NO" as const };
        }
      }),
    );

    const decision: Decision = votes.every((entry) => entry.vote === "YES")
      ? "COMMIT"
      : "ABORT";

    await this.log.recordDecision(txId, decision);
    await this.broadcastDecision(txId, participants, decision);
    await this.log.markFinished(txId);

    return decision;
  }

  private async broadcastDecision(
    txId: string,
    participants: Participant[],
    decision: Decision,
  ): Promise<void> {
    const operation =
      decision === "COMMIT"
        ? (participant: Participant) => participant.commit(txId)
        : (participant: Participant) => participant.abort(txId);

    await Promise.all(participants.map((participant) => operation(participant)));
  }
}
```

This example keeps the critical 2PC ordering intact:
- gather prepare votes first
- write the final decision durably
- only then fan out the decision

### A Prepared Participant Model

The participant below uses a local preparation record. This is still a study model, but it captures the practical ideas:
- prepare must be durable
- commit and abort must be idempotent
- the same transaction ID must be reusable during retries or recovery

```typescript
type TransferPreparationStatus = "PREPARED" | "COMMITTED" | "ABORTED";

type TransferPreparation = {
  txId: string;
  accountId: string;
  deltaCents: number;
  status: TransferPreparationStatus;
};

interface AccountTx {
  getBalanceForUpdate(accountId: string): Promise<number>;
  getPreparation(txId: string): Promise<TransferPreparation | null>;
  savePreparation(preparation: TransferPreparation): Promise<void>;
  applyDelta(accountId: string, deltaCents: number): Promise<void>;
}

interface AccountRepository {
  withTransaction<T>(work: (tx: AccountTx) => Promise<T>): Promise<T>;
}

class AccountShardParticipant implements Participant {
  constructor(
    public readonly id: string,
    private readonly repository: AccountRepository,
    private readonly accountId: string,
    private readonly deltaCents: number,
  ) {}

  async prepare(txId: string): Promise<Vote> {
    return this.repository.withTransaction(async (tx) => {
      const existing = await tx.getPreparation(txId);

      if (existing?.status === "PREPARED" || existing?.status === "COMMITTED") {
        return "YES";
      }

      const balance = await tx.getBalanceForUpdate(this.accountId);
      const nextBalance = balance + this.deltaCents;

      if (nextBalance < 0) {
        return "NO";
      }

      await tx.savePreparation({
        txId,
        accountId: this.accountId,
        deltaCents: this.deltaCents,
        status: "PREPARED",
      });

      return "YES";
    });
  }

  async commit(txId: string): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const preparation = await tx.getPreparation(txId);

      if (!preparation) {
        throw new Error(`missing preparation for ${txId}`);
      }

      if (preparation.status === "COMMITTED") {
        return;
      }

      if (preparation.status === "ABORTED") {
        throw new Error(`cannot commit aborted preparation ${txId}`);
      }

      await tx.applyDelta(preparation.accountId, preparation.deltaCents);
      await tx.savePreparation({ ...preparation, status: "COMMITTED" });
    });
  }

  async abort(txId: string): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const preparation = await tx.getPreparation(txId);

      if (!preparation || preparation.status === "ABORTED") {
        return;
      }

      if (preparation.status === "COMMITTED") {
        throw new Error(`cannot abort committed preparation ${txId}`);
      }

      await tx.savePreparation({ ...preparation, status: "ABORTED" });
    });
  }
}
```

### Recovery Worker Pattern

If a coordinator crashes after recording the decision but before every participant acknowledges it, recovery usually needs to replay that decision:

```typescript
interface RecoveryRepository {
  getTransactionsAwaitingReplay(limit: number): Promise<Array<{
    txId: string;
    decision: Decision;
    participantIds: string[];
  }>>;
}

class DecisionReplayWorker {
  constructor(
    private readonly repository: RecoveryRepository,
    private readonly participantDirectory: Map<string, Participant>,
  ) {}

  async run(limit = 100): Promise<void> {
    const pending = await this.repository.getTransactionsAwaitingReplay(limit);

    for (const record of pending) {
      for (const participantId of record.participantIds) {
        const participant = this.participantDirectory.get(participantId);

        if (!participant) {
          continue;
        }

        if (record.decision === "COMMIT") {
          await participant.commit(record.txId);
          continue;
        }

        await participant.abort(record.txId);
      }
    }
  }
}
```

### Practical Notes for Production Systems

For production use, you would usually add:
- explicit timeout and retry policy around prepare and decision delivery
- durable participant membership for each transaction
- metrics for in-doubt transaction age and prepared lock duration
- integration with the actual resource manager rather than an application-only simulation

The durable lesson is:
- prepare must be real
- decision logging must be durable
- commit and abort must be retry-safe


# 9. When to Use It and Common Pitfalls

2PC is useful, but only in a fairly specific envelope.

### Good Fit

2PC is usually a reasonable fit when:
- the participants are internal transactional resources
- each participant supports prepare, commit, abort, and crash recovery
- the transaction is short enough that holding locks briefly is acceptable
- atomic commit is more important than staying fully available during some failure windows

### Weak Fit

2PC is usually a weak fit when:
- the workflow includes third-party APIs with no real prepare phase
- the workflow is long-running or user-driven
- a participant cannot hold prepared state safely
- availability under partition is more important than atomic commit

### Repeating Pitfalls

```text
Bad:
├── treating normal HTTP services as if they were true 2PC participants
├── holding transactions open for long-running business workflows
├── failing to log the final decision durably before sending it
├── forgetting that commit and abort messages can be delivered more than once
├── ignoring prepared-lock buildup during coordinator outages
└── using 2PC for irreversible side effects such as emails or webhooks

Good:
├── restrict 2PC to short-lived, internal, transactional participants
├── keep transaction IDs stable across retries and recovery
├── make commit and abort idempotent
├── monitor in-doubt and long-prepared transactions
├── rehearse crash recovery and decision replay paths
└── choose saga or outbox patterns when participants cannot truly prepare
```

### A Conservative Real-World View

2PC is still worth understanding because it clarifies what atomic commit across multiple participants really requires. It also explains why many distributed systems avoid it at the application workflow layer:
- the infrastructure requirements are strict
- the availability trade-offs are real
- the blocking behavior becomes painful under slow or partitioned networks

That does not make 2PC obsolete. It makes it specialized.


# 10. Summary

**Two-Phase Commit (2PC)** is a classic atomic commit protocol for multiple transactional participants.
- It splits coordination into a prepare phase and a final commit-or-abort phase.
- It works best when every participant can durably prepare and later follow one authoritative decision.

**Its main strength is atomic agreement across cooperating resources.**
- All participants commit only after unanimous prepare.
- Crash recovery is possible because both participants and coordinator persist enough state to replay the final outcome.

**Its main weakness is blocking under failure.**
- Participants that already prepared may have to wait for the coordinator or recovery path before they can safely finish.
- That waiting can hold locks, increase latency, and reduce availability.

**It is not a universal distributed workflow tool.**
- It is usually a poor fit for external APIs, long-running business processes, and irreversible side effects.
- When prepare is not real, saga-style compensation or reliable asynchronous handoff patterns are often better choices.

**Implementation checklist:**

```text
Protocol design:
  □ Confirm that every participant can support a real durable prepare phase
  □ Keep the participant set explicit and stable for each transaction
  □ Use one transaction ID across coordinator logs and participant records

Coordinator:
  □ Record the final decision durably before sending COMMIT or ABORT
  □ Retry decision delivery until every participant acknowledges it
  □ Track in-doubt transactions and their age

Participants:
  □ Persist prepared state before voting YES
  □ Make COMMIT and ABORT handlers idempotent
  □ Release locks or reservations promptly after the final decision

Recovery:
  □ Rebuild incomplete transactions from durable logs after crashes
  □ Re-drive commit or abort for transactions with a recorded decision
  □ Test coordinator crash, participant crash, lost acknowledgment, and partition scenarios

Fit and operations:
  □ Prefer one local transaction when one resource can own the whole write path
  □ Prefer saga or outbox-style patterns when participants cannot truly prepare
  □ Monitor prepared transaction backlog, lock duration, and recovery replay lag
```
