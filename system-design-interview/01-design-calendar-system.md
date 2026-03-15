# Design Calendar System

#### What is a Calendar System?
A calendar system allows users to schedule, organize, and manage events and appointments across time. It provides features like creating events, setting reminders, handling recurring schedules, sharing calendars with others, and coordinating meetings across multiple participants.

The core idea seems straightforward: store events with start and end times. However, the complexity emerges when handling recurring events (that weekly team standup that repeats forever), time zones (scheduling a call with someone 12 hours ahead), conflict detection (is everyone free at 3pm?), and real-time synchronization across multiple users and devices.

**Popular Examples:** Google Calendar, Microsoft Outlook Calendar, Apple Calendar, Calendly

This system design problem tests several important skills: **complex data modeling** for recurring events using RRULE specifications, **time-based queries** that must correctly handle time zones and daylight saving transitions, **conflict detection algorithms** for free/busy queries, and **notification systems** that must fire reminders at exactly the right moment across millions of users.

In this chapter, we will explore the **high-level design of a calendar system**.

---

## On this page

- [1. Clarifying Requirements](#1-clarifying-requirements)
  - [1.1 Functional Requirements](#11-functional-requirements)
  - [1.2 Non-Functional Requirements](#12-non-functional-requirements)
- [2. Back-of-the-Envelope Estimation](#2-back-of-the-envelope-estimation)
- [3. Core APIs](#3-core-apis)
- [4. High-Level Design](#4-high-level-design)
  - [4.1 Event Management](#41-event-management)
  - [4.2 Notifications and Reminders](#42-notifications-and-reminders)
  - [4.3 Calendar Sharing and Invitations](#43-calendar-sharing-and-invitations)
  - [4.4 Putting It All Together](#44-putting-it-all-together)
- [5. Database Design](#5-database-design)
  - [5.1 SQL vs NoSQL](#51-sql-vs-nosql)
  - [5.2 Database Schema](#52-database-schema)
- [6. Design Deep Dive](#6-design-deep-dive)
  - [6.1 Handling Recurring Events](#61-handling-recurring-events)
  - [6.2 Time Zone Handling](#62-time-zone-handling)
  - [6.3 Conflict Detection and Free/Busy Queries](#63-conflict-detection-and-freebusy-queries)
  - [6.4 Reminder System Design](#64-reminder-system-design)
  - [6.5 Scaling Calendar Reads](#65-scaling-calendar-reads)
  - [6.6 Event Synchronization](#66-event-synchronization)
- [Quiz](#quiz)

---

# 1. Clarifying Requirements

Before diving into the design, it's important to ask thoughtful questions to uncover hidden assumptions, clarify ambiguities, and define the system's scope more precisely.

Here is an example of how a discussion between the candidate and the interviewer might unfold:

Discussion

**Candidate:** "What is the expected scale? How many users and events should the system support?"

**Interviewer:** "Let's design for 100 million daily active users. Each user has an average of 5 events per day on their calendar."

**Candidate:** "Should we support only personal calendars, or also shared team calendars?"

**Interviewer:** "Both. Users should be able to create personal calendars, share them with others, and invite attendees to events."

**Candidate:** "What about recurring events? Should we support complex patterns like 'every second Tuesday' or 'last Friday of the month'?"

**Interviewer:** "Yes, recurring events are critical. We should support standard recurrence patterns following the iCalendar specification (RFC 5545)."

**Candidate:** "How should we handle time zones? Users might schedule events in different time zones or travel frequently."

**Interviewer:** "Events should store the time zone they were created in. Users should see events in their local time zone, but the original time zone context should be preserved."

**Candidate:** "Do we need reminders and notifications?"

**Interviewer:** "Yes. Users should be able to set multiple reminders per event (e.g., 10 minutes before, 1 day before). Reminders should be delivered via push notification and email."

**Candidate:** "Should we support free/busy queries for scheduling meetings?"

**Interviewer:** "Yes. When scheduling a meeting, users should be able to see when invitees are free or busy, without revealing the details of their events."

**Candidate:** "What about calendar synchronization with external systems like CalDAV?"

**Interviewer:** "You can mention it conceptually, but detailed protocol implementation is out of scope."

After gathering the details, we can summarize the key system requirements.

## 1.1 Functional Requirements

  * **Event CRUD:** Users can create, read, update, and delete calendar events with title, description, location, start/end times, and attendees.
  * **Recurring Events:** Users can create events that repeat daily, weekly, monthly, or with custom patterns (e.g., "every 2 weeks on Monday and Wednesday").
  * **Calendar Sharing:** Users can share calendars with others, granting view-only or edit permissions.
  * **Event Invitations:** Users can invite others to events. Invitees can accept, decline, or mark as tentative.
  * **Reminders:** Users can set multiple reminders per event, delivered via push notification and/or email.
  * **Free/Busy Queries:** Users can check when others are available without seeing event details.
  * **Multiple Views:** Users can view their calendar by day, week, month, or agenda.


Out of Scope

To keep our discussion focused, we will set aside a few features that, while important, would take us down rabbit holes:
  * **Video Conferencing Integration:** Auto-generating Zoom/Meet links.
  * **Room/Resource Booking:** Managing physical meeting rooms and equipment.
  * **Calendar Import/Export:** Detailed iCal file parsing.
  * **CalDAV Protocol:** Full sync protocol implementation.


## 1.2 Non-Functional Requirements

  * **Low Latency:** Calendar views should load within 200ms. Users expect snappy interactions when navigating between days/weeks.
  * **High Availability:** The system must be highly available (99.99% uptime). Missing a meeting due to calendar downtime is unacceptable.
  * **Consistency for Critical Writes:** The organizer and immediate attendees should see event creates or updates quickly with read-after-write behavior on the primary path. Some replicas, caches, and secondary devices may observe brief staleness.
  * **Reminder Accuracy:** Reminders must fire within seconds of their scheduled time. A reminder that arrives 5 minutes late defeats its purpose.
  * **Scalability:** Support 100M+ daily active users and billions of events.
  * **Time Zone Correctness:** Events must display correctly across all time zones, including during daylight saving transitions.


# 2. Back-of-the-Envelope Estimation

With our requirements clear, let's understand the scale we are dealing with. In most interviews, you are not required to do a detailed estimation.

We will use these baseline numbers throughout our calculations:
  * **Daily Active Users (DAU):** 100 million
  * **Events per user per day (visible):** 5
  * **Average event size:** 2 KB (includes title, description, attendees, recurrence rules)
  * **Reminders per event:** 1.5 on average
  * **Calendar views per user per day:** 10 (checking calendar multiple times)


#### Storage Requirements

Let's calculate how much data we're storing:
  * **Total events created per day:** Assume 10% of users create a new event = 10 million new events/day
  * **Event storage per day:** 10 million x 2 KB = **20 GB/day**
  * **Annual event storage:** 20 GB x 365 = **~7.3 TB/year**


This is quite manageable. Calendar data is much smaller than messaging or media applications because events are structured metadata rather than user-generated content.

#### Read Throughput

Calendar systems are heavily read-biased. Users check their calendar far more often than they create events:
  * **Calendar view requests per day:** 100 million users x 10 views = **1 billion reads/day**
  * **Average reads per second:** 1 billion / 86,400 = **~11,500 reads/second**
  * **Peak reads (3x average):** **~35,000 reads/second**


Each calendar view might fetch events for a week or month, potentially touching hundreds of events. Efficient indexing and caching are essential.

#### Write Throughput

Writes are much less frequent:
  * **Event creates/updates per day:** ~20 million (creates + updates + deletes)
  * **Average writes per second:** 20 million / 86,400 = **~230 writes/second**
  * **Peak writes:** **~700 writes/second**


The read-to-write ratio of approximately 50:1 tells us to optimize heavily for reads.

#### Reminder Load

Reminders create a unique challenge because they are time-triggered rather than user-triggered:
  * **Events with reminders per day:** 500 million events visible x 1.5 reminders = **750 million reminders/day**
  * **Reminders per second (if evenly distributed):** ~8,700/second
  * **Peak reminder load (morning rush):** Could be 10x average = **~87,000 reminders/second**


Reminder distribution is highly non-uniform. Most reminders fire at the start of the hour (9:00 AM meetings), creating massive spikes.

# 3. Core APIs

Before diving into architecture, let's define the API contract. What operations does our system need to support?

Calendar APIs follow standard RESTful patterns more closely than real-time systems like messaging, since most operations are user-initiated rather than push-based.

### **1. Create Event**

#### Endpoint: `POST /calendars/{calendar_id}/events`

This is the primary write operation. When a user creates a new meeting or appointment, this API handles persisting it and notifying any invitees.

##### **Request Body:**

```json
{
  "title": "Weekly Team Standup",
  "description": "Discuss progress and blockers",
  "location": "Conference Room A / Zoom",
  "start_time": "2026-01-27T09:00:00",
  "end_time": "2026-01-27T09:30:00",
  "time_zone": "America/New_York",
  "recurrence": {
    "frequency": "WEEKLY",
    "interval": 1,
    "by_day": ["MO", "WE", "FR"],
    "until": "2026-12-31T23:59:59Z"
  },
  "attendees": [
    {"email": "alice@company.com", "optional": false},
    {"email": "bob@company.com", "optional": true}
  ],
  "reminders": [
    {"method": "push", "minutes_before": 10},
    {"method": "email", "minutes_before": 1440}
  ],
  "visibility": "default"
}
```

##### **Response:**

```json
{
  "event_id": "evt_abc123",
  "calendar_id": "cal_xyz789",
  "created_at": "2026-01-24T14:30:00Z",
  "updated_at": "2026-01-24T14:30:00Z",
  "html_link": "https://calendar.example.com/event/evt_abc123",
  "ical_uid": "evt_abc123@calendar.example.com"
}
```

The `recurrence` object follows the iCalendar RRULE specification. This is an industry standard that handles complex patterns. The `ical_uid` is a globally unique identifier used for interoperability with other calendar systems.

### **2. Get Events (Calendar View)**

#### Endpoint: `GET /calendars/{calendar_id}/events`

This powers the calendar UI. When a user views their week or month, this API returns all events in that time range, including expanded instances of recurring events.

##### **Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| time_min | datetime | Start of time range (inclusive) |
| time_max | datetime | End of time range (exclusive) |
| time_zone | string | IANA time zone for response times |
| single_events | boolean | If true, expand recurring events into instances |
| max_results | integer | Maximum events to return (pagination) |
| page_token | string | Token for fetching next page |

##### **Sample Response:**

```json
{
  "events": [
    {
      "event_id": "evt_abc123",
      "title": "Weekly Team Standup",
      "start": {"datetime": "2026-01-27T09:00:00-05:00", "time_zone": "America/New_York"},
      "end": {"datetime": "2026-01-27T09:30:00-05:00", "time_zone": "America/New_York"},
      "recurring_event_id": "evt_abc123",
      "instance_id": "evt_abc123_20260127T140000Z",
      "attendees": [...],
      "response_status": "accepted"
    }
  ],
  "next_page_token": "token_xyz"
}
```

Notice `single_events=true` expands a recurring event into individual instances. The `instance_id` uniquely identifies this specific occurrence, allowing users to modify or delete just one instance without affecting the series.

### **3. Update Event**

#### Endpoint: `PATCH /calendars/{calendar_id}/events/{event_id}`

Updates can be tricky for recurring events. Are we updating the entire series, just this instance, or this and all future instances?

##### **Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| update_scope | enum | `single`, `all`, `following` |
| send_updates | enum | `all`, `external_only`, `none` |

##### **Request Body (partial update):**

```json
{
  "start_time": "2026-01-27T10:00:00",
  "end_time": "2026-01-27T10:30:00",
  "notification_message": "Meeting moved to 10 AM"
}
```

The `update_scope` parameter is critical for recurring events:
- `single`: Only this instance (creates an exception)
- `all`: The entire recurring series
- `following`: This instance and all future instances (splits the series)

### **4. Delete Event**

#### Endpoint: `DELETE /calendars/{calendar_id}/events/{event_id}`

##### **Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| delete_scope | enum | `single`, `all`, `following` |
| send_updates | enum | `all`, `external_only`, `none` |

Deletion for recurring events follows the same scope semantics as updates.

### **5. RSVP to Invitation**

#### Endpoint: `POST /calendars/{calendar_id}/events/{event_id}/rsvp`

When a user receives an event invitation, they respond with their attendance status.

##### **Request Body:**

```json
{
  "response": "accepted",
  "comment": "I'll be there!"
}
```

Response can be `accepted`, `declined`, or `tentative`. The organizer sees all responses and can track who is attending.

### **6. Get Free/Busy**

#### Endpoint: `POST /users/freebusy`

This is essential for scheduling meetings. It returns time slots where users are busy without revealing event details.

##### **Request Body:**

```json
{
  "time_min": "2026-01-27T00:00:00Z",
  "time_max": "2026-01-31T23:59:59Z",
  "time_zone": "America/New_York",
  "items": [
    {"id": "alice@company.com"},
    {"id": "bob@company.com"},
    {"id": "carol@company.com"}
  ]
}
```

##### **Response:**

```json
{
  "calendars": {
    "alice@company.com": {
      "busy": [
        {"start": "2026-01-27T09:00:00Z", "end": "2026-01-27T10:00:00Z"},
        {"start": "2026-01-27T14:00:00Z", "end": "2026-01-27T15:00:00Z"}
      ]
    },
    "bob@company.com": {
      "busy": [
        {"start": "2026-01-27T09:00:00Z", "end": "2026-01-27T09:30:00Z"}
      ]
    }
  }
}
```

The response only shows time ranges, not event titles or details. This preserves privacy while enabling meeting scheduling.

### **7. Share Calendar**

#### Endpoint: `POST /calendars/{calendar_id}/acl`

Manages access control for calendar sharing.

##### **Request Body:**

```json
{
  "role": "reader",
  "scope": {
    "type": "user",
    "value": "colleague@company.com"
  }
}
```

Roles typically include:
- `freeBusyReader`: Can only see free/busy, not event details
- `reader`: Can see all event details
- `writer`: Can create and modify events
- `owner`: Full control including sharing permissions

# 4. High-Level Design

Now let's design the architecture that makes these APIs work at scale. We'll build incrementally, starting with the simplest design and adding complexity only as needed.

Our system must satisfy three core requirements:
  1. **Fast Calendar Reads:** Users should see their calendar instantly when opening the app.
  2. **Reliable Event Management:** Creates, updates, and deletes must be consistent and never lost.
  3. **Accurate Reminders:** Notifications must fire at exactly the right time, even under heavy load.

Unlike messaging systems that require persistent connections, calendar is primarily a request-response system. Users pull their calendar view; we don't need to push every change in real-time (though we can optimize with WebSockets for collaborative editing).

Let's build this system piece by piece.

## 4.1 Event Management

The core of our system is CRUD operations on events. Let's design this first.

### The Components We Need

#### **API Gateway**

The entry point for all client requests. It handles authentication, rate limiting, and routing to the appropriate backend service.

##### **What the API Gateway does:**
  * Authenticate requests using OAuth tokens
  * Rate limit by user to prevent abuse
  * Route requests to the correct microservice
  * Handle request/response transformation

#### **Calendar Service**

The main application server handling calendar and event logic.

##### **What the Calendar Service does:**
  * Validate event data (dates, recurrence rules, attendees)
  * Enforce permission checks (can this user edit this calendar?)
  * Coordinate with other services (notifications, invitations)
  * Handle the complexity of recurring event expansion

#### **Event Store (Database)**

Persistent storage for all calendar and event data.

##### **What the Event Store does:**
  * Store events with efficient time-range queries
  * Handle recurring event patterns
  * Maintain consistency for concurrent updates
  * Support efficient free/busy calculations

### The Event Creation Flow

Let's trace what happens when a user creates a new team meeting:

```
User                API Gateway         Calendar Service        Event Store
  |                     |                      |                     |
  |-- Create Event ---->|                      |                     |
  |                     |-- Authenticate ----->|                     |
  |                     |                      |-- Validate Event -->|
  |                     |                      |                     |
  |                     |                      |<-- Validation OK ---|
  |                     |                      |                     |
  |                     |                      |-- Store Event ----->|
  |                     |                      |                     |
  |                     |                      |<-- Event Stored ----|
  |                     |                      |                     |
  |                     |                      |-- Queue Invitations |
  |                     |                      |-- Queue Reminders   |
  |                     |                      |                     |
  |<-- Event Created ---|<---------------------|                     |
```

**Step 1-2: Authentication**
The request arrives at the API Gateway, which validates the OAuth token. If valid, it extracts the user ID and forwards the request to the Calendar Service.

**Step 3-4: Validation**
The Calendar Service validates the event data: Are the dates valid? Does the recurrence rule parse correctly? Does the user have permission to create events on this calendar?

**Step 5-6: Persistence**
The validated event is written to the Event Store. For recurring events, we store the pattern, not individual instances (more on this in the deep dive).

**Step 7-8: Async Processing**
After the event is stored, we queue background tasks: send invitation emails to attendees, schedule reminders in the notification system. These happen asynchronously so the user gets a fast response.

## 4.2 Notifications and Reminders

Reminders are surprisingly complex because they are time-triggered. Unlike user-initiated requests that we can load-balance across servers, reminders must fire at specific moments, potentially millions at once (think 9:00 AM on a Monday).

### New Components for Reminders

#### **Reminder Scheduler**

Responsible for knowing which reminders need to fire and when.

##### **What the Reminder Scheduler does:**
  * Track all pending reminders sorted by trigger time
  * Efficiently query "what needs to fire in the next minute?"
  * Handle reminder updates when events change
  * Distribute reminder processing across workers

#### **Notification Service**

Actually delivers the reminders to users.

##### **What the Notification Service does:**
  * Send push notifications via APNs (iOS) and FCM (Android)
  * Send reminder emails
  * Respect user notification preferences
  * Handle delivery failures and retries

### The Reminder Flow

When a user creates an event with a reminder:

**At event creation:**
1. Calendar Service creates a reminder record: "Event X, remind at time T"
2. This record is written to the reminder database, indexed by fire time
3. The user sees immediate confirmation

**When reminder time approaches:**
1. A scheduler process continuously scans for reminders due in the next minute
2. It pulls matching reminders and places them in a queue
3. Worker processes consume from the queue and call the Notification Service
4. The Notification Service delivers via the appropriate channel

The key insight is separating scheduling from delivery. The scheduler only needs to find due reminders; workers handle the actual sending. This lets us scale the delivery workers independently based on load.

### Handling Reminder Spikes

The problem with reminders is clustering. If 100,000 meetings start at 9:00 AM, and each has a "10 minutes before" reminder, we need to send 100,000 notifications at exactly 8:50 AM.

**Solutions:**
1. **Time bucketing:** Instead of firing at exactly 8:50:00, spread reminders across 8:49:30 to 8:50:30. Users won't notice 30 seconds difference.
2. **Pre-loading:** Load reminders for the next 5 minutes into memory, avoiding database queries during the spike.
3. **Horizontal scaling:** Auto-scale notification workers based on upcoming reminder volume.

## 4.3 Calendar Sharing and Invitations

Calendar sharing adds a permission layer on top of our basic CRUD operations. When Alice shares her calendar with Bob, Bob can see Alice's events based on the permission level granted.

### Permission Model

We use Access Control Lists (ACLs) for fine-grained permissions:

| Role | Can See Free/Busy | Can See Event Details | Can Create Events | Can Modify Events | Can Share |
|------|-------------------|----------------------|-------------------|-------------------|-----------|
| freeBusyReader | Yes | No | No | No | No |
| reader | Yes | Yes | No | No | No |
| writer | Yes | Yes | Yes | Own events only | No |
| owner | Yes | Yes | Yes | Yes | Yes |

When Bob requests Alice's calendar, the Calendar Service:
1. Looks up Bob's permission level for Alice's calendar
2. Filters the response based on that level
3. For `freeBusyReader`, returns only time blocks, not event details

### Invitation Flow

Event invitations create a more complex interaction:

```
Organizer          Calendar Service        Invitation Service        Invitee
    |                     |                       |                     |
    |-- Create Event ---->|                       |                     |
    |  (with attendees)   |                       |                     |
    |                     |-- Queue Invitations ->|                     |
    |                     |                       |                     |
    |<-- Event Created ---|                       |                     |
    |                     |                       |-- Send Email ------>|
    |                     |                       |                     |
    |                     |                       |<-- RSVP: Accepted --|
    |                     |<-- Update Attendee ---|                     |
    |                     |                       |                     |
    |<-- Notification ----|                       |                     |
    | (Bob accepted)      |                       |                     |
```

**Key design decisions:**
1. **Copy vs. Reference:** When Alice invites Bob, we create a copy of the event on Bob's calendar, linked to Alice's original. This allows Bob to set his own reminders while staying in sync with Alice's updates.
2. **Organizer authority:** Only the organizer can change event details. Attendees can only change their response status and personal reminders.
3. **Update propagation:** When Alice updates the event, all attendee copies are updated, and notifications are sent.

## 4.4 Putting It All Together

Now let's see the complete architecture:

```
                                    ┌─────────────────┐
                                    │   Load Balancer │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   API Gateway   │
                                    │ (Auth, Routing) │
                                    └────────┬────────┘
                                             │
          ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
          │                  │               │               │                  │
          ▼                  ▼               ▼               ▼                  ▼
   ┌─────────────┐   ┌─────────────┐  ┌───────────┐  ┌─────────────┐   ┌─────────────┐
   │  Calendar   │   │ Invitation  │  │ Reminder  │  │   Search    │   │  Free/Busy  │
   │  Service    │   │  Service    │  │ Scheduler │  │   Service   │   │   Service   │
   └──────┬──────┘   └──────┬──────┘  └─────┬─────┘  └──────┬──────┘   └──────┬──────┘
          │                 │               │               │                  │
          │                 │               ▼               │                  │
          │                 │        ┌─────────────┐        │                  │
          │                 │        │ Notification│        │                  │
          │                 │        │   Service   │        │                  │
          │                 │        └──────┬──────┘        │                  │
          │                 │               │               │                  │
          │                 │               ▼               │                  │
          │                 │        ┌─────────────┐        │                  │
          │                 │        │  APNs/FCM   │        │                  │
          │                 │        │   Email     │        │                  │
          │                 │        └─────────────┘        │                  │
          │                 │                               │                  │
          ▼                 ▼                               ▼                  ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                              PostgreSQL Cluster                              │
   │                    (Events, Calendars, Users, Permissions)                   │
   └─────────────────────────────────────────────────────────────────────────────┘
          │                                                                │
          ▼                                                                ▼
   ┌─────────────┐                                                  ┌─────────────┐
   │    Redis    │                                                  │Elasticsearch│
   │   (Cache)   │                                                  │  (Search)   │
   └─────────────┘                                                  └─────────────┘
```

**Service Layer:**
- **Calendar Service:** Core CRUD operations, recurring event logic, permission enforcement
- **Invitation Service:** Handles attendee management, email invitations, RSVP tracking
- **Reminder Scheduler:** Time-based trigger system for notifications
- **Notification Service:** Multi-channel delivery (push, email)
- **Search Service:** Full-text search across events
- **Free/Busy Service:** Optimized service for availability queries

**Data Layer:**
- **PostgreSQL:** Primary data store for strong consistency
- **Redis:** Caching layer for calendar views and session data
- **Elasticsearch:** Powers event search functionality

# 5. Database Design

The database design for a calendar system needs to balance several concerns: efficient time-range queries, support for recurring events, and fast free/busy calculations.

## 5.1 SQL vs NoSQL

Calendar data has characteristics that strongly favor a relational database:

### Why SQL (PostgreSQL) is the Right Choice

**Relational data model:** Calendars, events, attendees, and permissions have clear relationships. An event belongs to a calendar, has multiple attendees, and multiple reminders. SQL handles these joins naturally.

**Strong consistency:** When Alice updates a meeting time, Bob needs to see the change immediately. Calendar updates should never be eventually consistent.

**Complex queries:** "Find all events this week where I'm an attendee and haven't responded" requires joining events, attendees, and filtering by multiple conditions. SQL makes this straightforward.

**Time-range queries:** "All events between Jan 1 and Jan 31" is efficiently served by a B-tree index on start_time. PostgreSQL's range types are particularly well-suited for calendar data.

**ACID transactions:** When deleting an event, we need to atomically delete the event, all attendee records, and all reminder records. Transactions prevent orphaned data.

### What About Read Scaling?

With 35,000 reads/second at peak, won't PostgreSQL become a bottleneck?

**Solutions:**
1. **Read replicas:** Route read queries to replicas, keeping the primary for writes
2. **Aggressive caching:** Cache calendar views in Redis (more on this in deep dive)
3. **Denormalization:** Store computed data (like attendee count) to avoid joins

The 50:1 read-to-write ratio means caching is highly effective. A cache hit rate of 90% reduces database load to ~3,500 reads/second, easily handled by a replicated PostgreSQL cluster.

## 5.2 Database Schema

Let's design the core tables:

### **1. Users Table**

```sql
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    time_zone       VARCHAR(50) DEFAULT 'UTC',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

Simple user table with default time zone preference. Most user data lives in a separate identity service.

### **2. Calendars Table**

```sql
CREATE TABLE calendars (
    calendar_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(user_id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    color           VARCHAR(7),  -- Hex color code
    time_zone       VARCHAR(50) DEFAULT 'UTC',
    is_primary      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendars_owner ON calendars(owner_id);
CREATE UNIQUE INDEX idx_calendars_primary ON calendars(owner_id) WHERE is_primary = TRUE;
```

Each user can have multiple calendars (Work, Personal, Family). The partial unique index ensures only one primary calendar per user.

### **3. Events Table**

```sql
CREATE TABLE events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id         UUID NOT NULL REFERENCES calendars(calendar_id),
    organizer_id        UUID NOT NULL REFERENCES users(user_id),
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    location            VARCHAR(500),
    start_time          TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time            TIMESTAMP WITH TIME ZONE NOT NULL,
    original_time_zone  VARCHAR(50) NOT NULL,
    is_all_day          BOOLEAN DEFAULT FALSE,
    status              VARCHAR(20) DEFAULT 'confirmed',  -- confirmed, tentative, cancelled
    visibility          VARCHAR(20) DEFAULT 'default',    -- default, public, private

    -- Recurring event fields
    recurrence_rule     TEXT,  -- RRULE string, null for non-recurring
    recurring_event_id  UUID REFERENCES events(event_id),  -- Points to master event
    original_start_time TIMESTAMP WITH TIME ZONE,  -- For exception instances

    -- Metadata
    ical_uid            VARCHAR(255) UNIQUE,
    sequence            INTEGER DEFAULT 0,  -- Incremented on each update
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Critical index for calendar view queries
CREATE INDEX idx_events_calendar_time ON events(calendar_id, start_time, end_time);

-- For finding recurring event instances
CREATE INDEX idx_events_recurring ON events(recurring_event_id) WHERE recurring_event_id IS NOT NULL;

-- For iCal interoperability
CREATE INDEX idx_events_ical_uid ON events(ical_uid);
```

**Key design decisions:**

- **Time zones:** We store `start_time` and `end_time` in UTC (TIMESTAMP WITH TIME ZONE), but also keep `original_time_zone` so we know the context in which the event was created. This matters for recurring events crossing DST boundaries.

- **Recurring events:** The `recurrence_rule` stores the RRULE pattern. Individual instances are NOT stored as separate rows initially (lazy expansion). When an instance is modified, we create an exception row with `recurring_event_id` pointing to the master.

- **Sequence number:** Following iCal spec, `sequence` is incremented on each update. This helps detect conflicts during synchronization.

### **4. Attendees Table**

```sql
CREATE TABLE attendees (
    attendee_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(user_id),  -- Null for external attendees
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255),
    response_status VARCHAR(20) DEFAULT 'needsAction',  -- needsAction, accepted, declined, tentative
    is_organizer    BOOLEAN DEFAULT FALSE,
    is_optional     BOOLEAN DEFAULT FALSE,
    responded_at    TIMESTAMP WITH TIME ZONE,

    UNIQUE(event_id, email)
);

CREATE INDEX idx_attendees_event ON attendees(event_id);
CREATE INDEX idx_attendees_user ON attendees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_attendees_email ON attendees(email);
```

We support both internal users (with `user_id`) and external attendees (email only). The unique constraint prevents inviting the same person twice.

### **5. Reminders Table**

```sql
CREATE TABLE reminders (
    reminder_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(user_id),
    method          VARCHAR(20) NOT NULL,  -- push, email, sms
    minutes_before  INTEGER NOT NULL,
    trigger_time    TIMESTAMP WITH TIME ZONE NOT NULL,  -- Computed: event.start_time - minutes_before
    is_sent         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMP WITH TIME ZONE,

    UNIQUE(event_id, user_id, method, minutes_before)
);

-- Critical for reminder scheduler
CREATE INDEX idx_reminders_pending ON reminders(trigger_time)
    WHERE is_sent = FALSE;
```

The `trigger_time` is denormalized for efficient querying. The scheduler simply queries: `WHERE trigger_time <= NOW() AND is_sent = FALSE`.

### **6. Calendar ACL (Access Control) Table**

```sql
CREATE TABLE calendar_acl (
    acl_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id     UUID NOT NULL REFERENCES calendars(calendar_id) ON DELETE CASCADE,
    grantee_type    VARCHAR(20) NOT NULL,  -- user, group, domain, public
    grantee_id      VARCHAR(255),  -- user_id, group_id, domain name, or null for public
    role            VARCHAR(20) NOT NULL,  -- freeBusyReader, reader, writer, owner
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(calendar_id, grantee_type, grantee_id)
);

CREATE INDEX idx_acl_calendar ON calendar_acl(calendar_id);
CREATE INDEX idx_acl_grantee ON calendar_acl(grantee_type, grantee_id);
```

This enables flexible sharing: with specific users, groups (like a team), entire domains (company-wide visibility), or public access.

# 6. Design Deep Dive

Now let's explore the trickiest aspects of calendar system design.

## 6.1 Handling Recurring Events

Recurring events are the most complex part of a calendar system. A simple rule like "every weekday at 9 AM" generates infinite future instances. We can't store them all.

### The RRULE Specification

The iCalendar RFC 5545 defines RRULE, a powerful grammar for expressing recurrence patterns:

```
RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z
```

This means: Every 2 weeks, on Monday, Wednesday, Friday, until Dec 31, 2026.

**Common RRULE components:**
- `FREQ`: DAILY, WEEKLY, MONTHLY, YEARLY
- `INTERVAL`: Every N periods (default 1)
- `BYDAY`: Days of week (MO, TU, WE, TH, FR, SA, SU)
- `BYMONTHDAY`: Days of month (1-31, or -1 for last day)
- `BYMONTH`: Months (1-12)
- `UNTIL`: End date
- `COUNT`: Number of occurrences

The complexity comes from combinations. "The last Friday of every month" is:
```
RRULE:FREQ=MONTHLY;BYDAY=-1FR
```

### Storage Strategy: Lazy Expansion

We have two options for storing recurring events:

**Option 1: Materialized instances**
Store each instance as a separate row. "Daily meeting for 1 year" = 365 rows.

*Pros:* Simple queries, easy modifications
*Cons:* Storage explosion, slow creation, what about infinite recurrence?

**Option 2: Lazy expansion (Recommended)**
Store only the master event with the RRULE. Expand instances at query time.

*Pros:* Minimal storage, handles infinite recurrence, fast creation
*Cons:* Query-time computation, complex exception handling

We choose lazy expansion. When fetching events for January 2026, we:
1. Query all non-recurring events in that range
2. Query all recurring events where `start_time <= Jan 31` (could generate instances in range)
3. Apply each RRULE to generate instances within the range
4. Filter out exceptions and cancelled instances

### Handling Exceptions

Users often need to modify a single instance: "Move just this week's standup to 10 AM."

When modifying a single instance:
1. Create a new row with `recurring_event_id` pointing to the master
2. Set `original_start_time` to the instance being replaced
3. Store the modified details in this exception row

When expanding the series, we:
1. Generate instances from the RRULE
2. For each instance, check if an exception exists with matching `original_start_time`
3. If yes, use the exception data instead
4. If the exception has `status = 'cancelled'`, skip this instance

### Deleting Instances

Deleting "this and all following" is particularly tricky:

1. Add `UNTIL=<deleted_instance_time>` to the original RRULE
2. This truncates the series at that point
3. All future instances are no longer generated

For "just this one," create a cancelled exception:

```sql
INSERT INTO events (recurring_event_id, original_start_time, status)
VALUES ('master_event_id', '2026-01-27T09:00:00Z', 'cancelled');
```

## 6.2 Time Zone Handling

Time zones introduce subtle but critical bugs if handled incorrectly. The key principle: **store in UTC, display in local time, but preserve original context.**

### The Problem

Consider Alice in New York creating "Team standup at 9 AM" that repeats daily. What should happen when:
1. Bob in London views the event? (Show 2 PM his time)
2. Daylight saving time ends? (Should it still be 9 AM EST, even though UTC offset changed?)
3. Alice travels to Tokyo and views her calendar?

### Storage Strategy

```sql
start_time          TIMESTAMP WITH TIME ZONE  -- UTC
original_time_zone  VARCHAR(50)               -- 'America/New_York'
```

We store the UTC time AND the original time zone. This handles DST correctly:

**Before DST change (EDT, UTC-4):**
- Local: 9:00 AM
- Stored UTC: 13:00 UTC

**After DST change (EST, UTC-5):**
- Local: 9:00 AM
- Stored UTC: 14:00 UTC

Without storing the original time zone, we couldn't know whether the user meant "9 AM local time" or "13:00 UTC."

### Recurring Events and DST

For recurring events, we must recalculate each instance's UTC time using the original time zone:

```python
def expand_recurring_event(master_event, start_range, end_range):
    tz = pytz.timezone(master_event.original_time_zone)
    local_start = master_event.start_time.astimezone(tz)

    instances = []
    for occurrence_date in rrule.between(start_range, end_range):
        # Combine date with original local time
        local_datetime = tz.localize(datetime.combine(
            occurrence_date,
            local_start.time()
        ))
        # Convert to UTC for comparison
        utc_datetime = local_datetime.astimezone(pytz.UTC)
        instances.append(utc_datetime)

    return instances
```

This ensures "9 AM New York time" is always 9 AM in New York, regardless of DST.

### Edge Cases

**1. Floating time events:** All-day events don't have a specific time. "January 15" means Jan 15 in whatever time zone the viewer is in. We store these with a special marker:

```sql
is_all_day = TRUE
start_time = '2026-01-15 00:00:00 UTC'  -- Date only, time ignored
```

**2. Non-existent times:** When DST springs forward, 2:30 AM might not exist. Libraries like `pytz` handle this by raising an exception or adjusting.

**3. Ambiguous times:** When DST falls back, 1:30 AM occurs twice. We must specify which one (usually the first).

## 6.3 Conflict Detection and Free/Busy Queries

Free/busy queries are critical for scheduling meetings. "When is everyone available?" requires efficiently finding overlapping events across multiple calendars.

### The Overlap Problem

Two events overlap if:
```
event1.start < event2.end AND event1.end > event2.start
```

For a free/busy query spanning a week across 10 calendars with 50 events each, we're checking 500 events against any potential time slot.

### Efficient Implementation

**Approach 1: Database query per calendar**

```sql
SELECT start_time, end_time
FROM events
WHERE calendar_id IN (user_calendars)
  AND start_time < :range_end
  AND end_time > :range_start
  AND status != 'cancelled';
```

With proper indexes, this is O(log N) per calendar. For 10 calendars, we make 10 queries (can be parallelized).

**Approach 2: Pre-computed free/busy cache**

For frequently queried users (executives, meeting rooms), we maintain a Redis cache:

```
freebusy:user123:2026-01-27 -> [(09:00, 10:00), (14:00, 15:30), ...]
```

This cache is invalidated when events are created/updated. Queries hit cache first, falling back to database.

### Finding Available Slots

Given busy times, finding free slots is an interval complement problem:

```python
def find_free_slots(busy_intervals, range_start, range_end, min_duration):
    # Sort busy intervals by start time
    sorted_busy = sorted(busy_intervals, key=lambda x: x.start)

    free_slots = []
    current = range_start

    for busy in sorted_busy:
        if current < busy.start:
            gap = busy.start - current
            if gap >= min_duration:
                free_slots.append((current, busy.start))
        current = max(current, busy.end)

    # Check remaining time after last busy slot
    if current < range_end:
        gap = range_end - current
        if gap >= min_duration:
            free_slots.append((current, range_end))

    return free_slots
```

For multiple attendees, we merge their busy intervals first, then find gaps.

## 6.4 Reminder System Design

Reminders must fire at the right time, regardless of system load. A reminder arriving 10 minutes late is worse than useless.

### The Challenge

Reminders are time-triggered, not user-triggered. We can't rely on a user request to trigger the reminder. The system must proactively fire millions of reminders, often clustered at the same moment (top of the hour).

### Architecture Options

**Option 1: Cron-based polling**
A cron job runs every minute, queries for due reminders, and sends them.

*Problem:* Single point of failure. If the cron job fails, no reminders fire.

**Option 2: Distributed timer wheels**
Partition reminders across multiple workers. Each worker manages reminders for a subset of users.

*Problem:* Rebalancing when workers fail. Exactly-once delivery is complex.

**Option 3: Message queue with delayed delivery (Recommended)**
Use a queue like AWS SQS with delayed messages or a specialized job scheduler.

When a reminder is created:
1. Calculate the trigger time
2. Enqueue a message with delay = trigger_time - now
3. When the delay expires, a worker processes the message

This approach:
- Scales horizontally (add more workers)
- Handles worker failures (messages return to queue)
- Usually provides at-least-once delivery, so reminder sending must be idempotent

### Implementation with Redis Sorted Sets

For sub-second timing precision, Redis sorted sets work well:

```python
# When creating a reminder
redis.zadd('reminders', {reminder_id: trigger_timestamp})

# Scheduler loop (runs continuously)
while True:
    now = time.time()
    # Get all reminders due in the next second
    due = redis.zrangebyscore('reminders', 0, now + 1)

    for reminder_id in due:
        # Move to processing queue
        redis.zrem('reminders', reminder_id)
        queue.enqueue(send_reminder, reminder_id)

    time.sleep(0.1)  # Check every 100ms
```

The sorted set ensures O(log N) insertion and O(M + log N) retrieval of due reminders.

### Handling Event Updates

When an event time changes, we must update all associated reminders:

1. Delete old reminder queue entries
2. Calculate new trigger times
3. Insert new queue entries

For recurring events, this gets complex. We typically only schedule reminders for the next N instances (e.g., next 30 days) and re-evaluate periodically.

## 6.5 Scaling Calendar Reads

With 35,000 reads/second at peak, we need aggressive caching.

### Cache Strategy

**What to cache:**
- Calendar view responses (the complete JSON for a week/month view)
- Individual event objects
- User permission mappings
- Free/busy results for popular users

**Cache key design:**

```
calendar_view:{calendar_id}:{start_date}:{end_date}:{user_id}
event:{event_id}
permissions:{user_id}:{calendar_id}
freebusy:{user_id}:{date}
```

Including `user_id` in the view cache key handles per-user permissions and time zone display.

### Cache Invalidation

The hardest problem in computer science. When an event changes, what cache entries are affected?

**Strategy: Event-driven invalidation**

On event create/update/delete:
1. Invalidate the event cache: `event:{event_id}`
2. Invalidate calendar views that might contain this event:
   ```
   calendar_view:{calendar_id}:*  (wildcard delete)
   ```
3. Invalidate free/busy cache for affected users:
   ```
   freebusy:{organizer_id}:{affected_dates}
   freebusy:{attendee_ids}:{affected_dates}
   ```

**TTL as safety net:**
Even with active invalidation, set a TTL (e.g., 5 minutes) so stale data eventually expires.

### Read Replicas

For the database layer:
- Primary handles all writes
- Multiple read replicas handle read queries
- Application routes reads to replicas, writes to primary

With PostgreSQL streaming replication, replicas are typically <1 second behind primary. For calendar data, this brief inconsistency is acceptable.

## 6.6 Event Synchronization

Users expect their calendar to sync across devices and with external systems (Outlook, Apple Calendar).

### Sync Tokens

Rather than re-fetching all events, clients use sync tokens to get only changes since last sync:

```
GET /calendars/{calendar_id}/events?sync_token=abc123

Response:
{
  "events": [...only changed events...],
  "next_sync_token": "def456"
}
```

**Implementation:**

Each event has an `updated_at` timestamp. The sync token encodes the last-seen timestamp:

```python
def get_changes(calendar_id, sync_token):
    last_sync_time = decode_token(sync_token)

    changed_events = Event.query.filter(
        Event.calendar_id == calendar_id,
        Event.updated_at > last_sync_time
    ).order_by(Event.updated_at).all()

    new_token = encode_token(max(e.updated_at for e in changed_events))
    return changed_events, new_token
```

For deleted events, we use soft deletes (mark as deleted rather than removing) so they appear in sync results.

### CalDAV Compatibility

CalDAV is the standard protocol for calendar synchronization. Key concepts:

- **ETags:** Each event has an ETag (version hash). Clients send `If-Match` headers to prevent overwriting concurrent changes.
- **Collection sync:** Get all changes in a calendar since a sync token.
- **Properties:** Standard way to query calendar metadata.

Full CalDAV implementation is complex, but providing CalDAV-compatible endpoints enables integration with Apple Calendar, Thunderbird, and other standard clients.

### Conflict Resolution

When the same event is modified on two devices simultaneously:

1. **Last-write-wins:** Simple but loses data
2. **Server-wins:** Reject the older update
3. **Merge:** For non-conflicting fields, merge changes; for conflicts, prefer server or prompt user

We typically use the `sequence` number from iCal spec:
- Each update increments `sequence`
- Updates with stale `sequence` are rejected (409 Conflict)
- Client must re-fetch and retry

# Quiz

## Design Calendar System Quiz

**1. Why do we store recurring events as patterns rather than individual instances?**

A) Individual instances are harder to query
B) Patterns require less storage and handle infinite recurrence
C) Patterns are faster to update
D) Database constraints require patterns

**Answer: B** - Storing patterns (RRULEs) uses constant storage regardless of how many instances the pattern generates, and naturally handles "repeat forever" events that would require infinite storage as individual rows.

---

**2. When a user modifies a single instance of a recurring event, what happens?**

A) The entire series is updated
B) An exception record is created pointing to the master event
C) The RRULE is modified to exclude that date
D) The event is converted to non-recurring

**Answer: B** - We create an exception row with `recurring_event_id` pointing to the master and `original_start_time` indicating which instance it replaces.

---

**3. Why do we store both UTC time and original time zone for events?**

A) To support multiple display formats
B) To correctly handle recurring events across DST transitions
C) For backwards compatibility
D) To reduce computation at query time

**Answer: B** - Storing the original time zone lets us correctly expand recurring events. "9 AM New York time" should always be 9 AM local time, even when the UTC offset changes for daylight saving.

---

**4. What is the recommended approach for scheduling reminders?**

A) Cron job that runs every minute
B) Database triggers on the events table
C) Distributed message queue with delayed delivery
D) Client-side timers

**Answer: C** - A message queue with delayed delivery provides horizontal scaling, fault tolerance, and exactly-once delivery semantics without single points of failure.

---

**5. For free/busy queries across multiple users, what optimization technique provides the best performance?**

A) Sequential database queries
B) Pre-computed free/busy cache invalidated on event changes
C) Materialized views
D) Graph database for relationship queries

**Answer: B** - Caching free/busy results in Redis with invalidation on event changes provides O(1) lookups for frequently queried users while keeping data fresh.
