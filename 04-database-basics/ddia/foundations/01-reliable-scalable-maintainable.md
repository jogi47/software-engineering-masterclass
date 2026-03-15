# Chapter 1: Reliable, Scalable, and Maintainable Applications

## Introduction

Many applications today are **data-intensive** rather than **compute-intensive**. This means the main challenge isn't CPU power, but rather:
- The amount of data
- The complexity of data
- The speed at which data changes

Think about applications like:
- A social media feed (massive amounts of posts, comments, likes)
- An e-commerce site (product catalogs, user carts, order history)
- A banking system (transactions, account balances, audit logs)

These applications are built from standard building blocks:
- **Databases**: Store data so it can be found later
- **Caches**: Remember expensive operations to speed up reads
- **Search indexes**: Allow searching data by keyword or filtering
- **Stream processing**: Send messages to other processes asynchronously
- **Batch processing**: Periodically crunch large amounts of data

The chapter focuses on three concerns that are most important in software systems:

```
┌─────────────────────────────────────────────────────────────┐
│                    Data-Intensive Application               │
├─────────────────┬─────────────────┬─────────────────────────┤
│   RELIABILITY   │   SCALABILITY   │    MAINTAINABILITY      │
│                 │                 │                         │
│  Works correctly│  Handles growth │  Easy to work on        │
│  even when      │  in data, traffic│  over time             │
│  things go wrong│  and complexity │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## Reliability

### What Does Reliability Mean?

Reliability means the system continues to work correctly even when things go wrong. "Working correctly" means:
- The application performs the function the user expected
- It can tolerate user mistakes or unexpected usage
- Its performance is good enough for the required use case
- The system prevents unauthorized access and abuse

### Faults vs Failures

It's important to distinguish between:
- **Fault**: One component of the system deviating from its specification
- **Failure**: When the system as a whole stops providing the required service to users

**Example**: If one hard drive fails (a fault), but the system has redundancy and continues serving users, there's no failure. The goal is to build **fault-tolerant** systems that prevent faults from causing failures.

Sometimes we even deliberately trigger faults to test fault tolerance - this is called **chaos engineering** (Netflix's Chaos Monkey randomly kills servers to ensure the system can handle it).

### Types of Faults

#### 1. Hardware Faults

Hardware fails all the time:
- Hard disks have a mean time to failure (MTTF) of about 10-50 years
- With 10,000 disks, you should expect one disk to die per day on average
- RAM can have memory errors
- Power supplies fail
- Network cables get unplugged

**Traditional Solution: Redundancy**
- RAID for disks (data spread across multiple disks)
- Dual power supplies
- Hot-swappable CPUs
- Diesel generators for backup power

**Modern Approach: Software fault tolerance**
- Systems designed to tolerate entire machine failures
- Rolling upgrades (update one node at a time without downtime)
- This is increasingly preferred because:
  - Cloud platforms are designed around commodity hardware
  - Allows operational flexibility

#### 2. Software Errors

Software bugs are often **systematic** - they affect many nodes at the same time, making them worse than random hardware faults.

**Examples of software bugs:**
- A bug triggered by unusual input (like a leap second causing Linux kernels to hang)
- A runaway process that uses up all CPU, memory, or disk
- A service the system depends on slows down or returns corrupted responses
- **Cascading failures**: One component fails, causing another to fail, causing another...

**Why are they hard to catch?**
- They lie dormant until triggered by a specific circumstance
- Software assumes things about its environment that are usually true, but not always

**Solutions:**
- Thorough testing
- Process isolation (one process can't take down another)
- Allowing processes to crash and restart
- Measuring, monitoring, and alerting
- Self-healing systems that can restart failed components

#### 3. Human Errors

Studies show that configuration errors by operators are the leading cause of outages - not hardware or software faults. Humans are known to be unreliable.

**How to design systems that minimize human errors:**

1. **Design for minimum opportunity for error**
   - Well-designed APIs and admin interfaces that make it easy to do the right thing
   - Discourage the wrong thing without being overly restrictive

2. **Decouple places where mistakes are made from places where they cause failures**
   - Sandbox environments for experimentation with real data
   - Staging environments that mirror production

3. **Test thoroughly at all levels**
   - Unit tests, integration tests, end-to-end tests
   - Manual testing
   - Automated testing

4. **Allow quick and easy recovery**
   - Fast rollback of configuration changes
   - Gradual rollouts (deploy to a small subset first)
   - Tools to recompute data if needed

5. **Set up detailed monitoring**
   - Performance metrics
   - Error rates
   - Early warning systems
   - Telemetry to understand what happened when things go wrong

6. **Implement good management practices and training**
   - This is beyond technology, but equally important

---

## Scalability

### What Does Scalability Mean?

Scalability is NOT a one-dimensional label. You can't say "X is scalable" or "Y doesn't scale." It's more nuanced:

> "If the system grows in a particular way, what are our options for coping with that growth?"

To discuss scalability, we need to describe:
1. **Load** - What is the current load on the system?
2. **Performance** - What happens when load increases?
3. **Approaches** - How can we add resources to handle additional load?

### Describing Load

Load is described using **load parameters**. Which parameters matter most depends on your system:
- Requests per second to a web server
- Ratio of reads to writes in a database
- Number of simultaneously active users in a chat room
- Cache hit rate

**Case Study: Twitter's Timeline**

Twitter has two main operations:
1. **Post tweet**: User posts a new message (4.6k requests/sec average, 12k peak)
2. **Home timeline**: User views tweets from people they follow (300k requests/sec)

The challenge: A user has many followers, and follows many users. How do you efficiently show the home timeline?

**Approach 1: Fan-out on read**
```sql
SELECT tweets.*, users.* FROM tweets
JOIN users ON tweets.sender_id = users.id
JOIN follows ON follows.followee_id = users.id
WHERE follows.follower_id = current_user
ORDER BY tweets.created_at DESC
LIMIT 100;
```
When a user requests their timeline, look up everyone they follow, find all their tweets, and merge them. Simple, but slow for users following many people.

**Approach 2: Fan-out on write**
```
When user posts tweet:
  For each follower:
    Insert tweet into their timeline cache
```
Maintain a cache for each user's home timeline. When a user posts, insert that tweet into the cache of all their followers. Reading the timeline is now fast - just look up the cache.

**Problem**: Celebrities like Justin Bieber have 30+ million followers. One tweet = 30 million writes!

**Twitter's hybrid approach:**
- For most users: Fan-out on write (fast reads)
- For celebrities: Fan-out on read (their tweets are merged at read time)

### Describing Performance

When load increases, two questions:
1. **If you keep resources unchanged, how is performance affected?**
2. **If you want to keep performance unchanged, how much do you need to increase resources?**

**Throughput**: For batch systems (like Hadoop), we care about throughput - how many records can we process per second?

**Response Time**: For online systems, we care about response time - the time between a client sending a request and receiving a response.

**Important**: Response time varies! Even with the same request, response times can differ due to:
- Context switches
- Network packet loss and retransmission
- Garbage collection pauses
- Page faults (reading from disk)
- Background processes

### Percentiles: The Right Way to Measure

**Don't use averages!** If your average response time is 200ms, that tells you almost nothing about user experience.

Use **percentiles**:
- **Median (p50)**: Half of requests are faster than this, half are slower
- **p95**: 95% of requests are faster than this
- **p99**: 99% of requests are faster than this
- **p999**: 99.9% of requests are faster than this (tail latency)

**Example:**
```
p50  = 200ms  (typical user experience)
p95  = 500ms  (1 in 20 users wait this long)
p99  = 1.5s   (1 in 100 users wait this long)
p999 = 3s     (1 in 1000 users wait this long)
```

**Why tail latencies matter:**
- Users with slow responses are often your most valuable customers (they have more data, more purchases)
- A single slow backend call can delay the entire user request
- In a page that makes 100 backend calls, even p99.99 becomes relevant

**Service Level Objectives (SLO) and Agreements (SLA):**
- SLO: "The service will have a median response time under 200ms and p99 under 1 second"
- SLA: Contract with customers that specifies what happens if SLO is not met (refunds, etc.)

### Approaches for Coping with Load

**Scaling Up (Vertical Scaling)**
- Move to a more powerful machine
- More CPU, RAM, disk space
- Simpler but has limits and gets expensive

**Scaling Out (Horizontal Scaling)**
- Distribute load across multiple smaller machines
- More complex to build and operate
- Can scale almost indefinitely

**Elastic Systems**
- Automatically add computing resources when load increases
- Good for unpredictable load patterns
- More complex but can save money

**Stateless vs Stateful Services**
- Stateless services are easy to scale (any server can handle any request)
- Stateful services (databases) are harder - you need to deal with consistency

**The Architecture Trade-off**

There's no one-size-fits-all scalable architecture. It depends heavily on:
- Read volume vs write volume
- Data volume to store
- Complexity of data
- Response time requirements
- Access patterns

An architecture that works well for 100,000 requests/second at 1KB each is very different from one for 3 requests/minute at 2GB each.

---

## Maintainability

### Why Maintainability Matters

The majority of software cost is not initial development, but ongoing maintenance:
- Fixing bugs
- Keeping systems operational
- Investigating failures
- Adapting to new platforms
- Adding new features
- Repaying technical debt

Many people dislike working on legacy systems. But we can (and should) design software to minimize pain during maintenance.

### Three Design Principles for Maintainability

#### 1. Operability: Make Life Easy for Operations

Good operations can work around bad software, but good software cannot run with bad operations. Operations teams are responsible for:
- Monitoring system health and restoring service when things go wrong
- Tracking down problems (system failures, degraded performance)
- Keeping software and platforms up to date
- Understanding how different systems affect each other
- Capacity planning for future needs
- Establishing good practices and tools for deployment
- Performing complex maintenance tasks (platform migrations)
- Maintaining security as configuration changes
- Defining processes that make operations predictable
- Preserving organizational knowledge as people come and go

**What good software can do for operations:**
- Provide visibility into runtime behavior (good monitoring)
- Support automation and integration with standard tools
- Avoid dependency on individual machines (allow machines to be taken down for maintenance)
- Provide good documentation
- Provide good default behavior, with freedom to override
- Self-heal where appropriate, but give admins manual control
- Exhibit predictable behavior (minimize surprises)

#### 2. Simplicity: Make It Easy to Understand

As projects get larger, they often become very complex. Complexity manifests as:
- Explosion of state space
- Tight coupling between modules
- Tangled dependencies
- Inconsistent naming and terminology
- Hacks to work around issues
- Special cases to handle edge cases

Complexity has many problems:
- Increases maintenance costs
- Makes bugs more likely
- Slows down new development
- Frustrates developers

**Accidental Complexity vs Essential Complexity**
- **Essential**: Inherent in the problem being solved
- **Accidental**: Arises from the implementation, not the problem

**Abstraction is the best tool for removing accidental complexity:**
- A good abstraction hides implementation details behind a clean interface
- Example: SQL - you describe what data you want, not how to get it
- Example: Programming languages - you write code, not machine instructions

#### 3. Evolvability: Make Change Easy

Systems are not static. Requirements change constantly:
- New facts are learned
- Previously unanticipated use cases emerge
- Business priorities shift
- Users request new features
- New platforms need to be supported
- Legal/regulatory requirements change

**Agile methodologies** help at the small scale (within a team or project). But how do we make changes easy at the system architecture level?

This depends heavily on **simplicity** and **good abstractions**:
- Simple, well-understood systems are easier to modify
- Changes are localized when modules have clean boundaries
- This is sometimes called **extensibility**, **modifiability**, or **plasticity**

---

## Key Takeaways

1. **Reliability** = The system works correctly even when faults occur
   - Design for hardware faults, software faults, and human errors
   - Build fault-tolerant systems that prevent faults from becoming failures

2. **Scalability** = Having strategies to maintain good performance as load increases
   - Describe load with parameters specific to your system
   - Measure performance with percentiles, not averages
   - Scale up (bigger machines) or scale out (more machines)

3. **Maintainability** = Making systems that are easy to work on over time
   - Operability: Operations can keep it running
   - Simplicity: New engineers can understand it
   - Evolvability: Changes can be made easily

4. **There is no magic architecture** that works for every application. The best approach depends on your specific load parameters, requirements, and constraints.

5. **Human errors are the biggest threat** to reliability. Design systems that minimize opportunities for error and allow quick recovery.

6. **Percentiles matter more than averages** for understanding real user experience. Tail latencies (p99, p999) can have outsized impact on overall performance.
