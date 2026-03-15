# Design Notification System

#### What is a Notification System?

A **notification system** is a software component responsible for sending messages to users across multiple channels such as **Email**, **SMS**, and **Push notifications**. It acts as a centralized service that handles the creation, routing, and delivery of notifications based on user preferences and message priority.

Modern applications use notification systems for various purposes:
- **Transactional alerts** - Order confirmations, password resets, payment receipts
- **Reminders** - Appointment reminders, subscription renewals
- **Marketing** - Promotional offers, product updates
- **Real-time updates** - Chat messages, activity notifications

In this chapter, we will explore the **low-level design of a notification system** in detail.

## On this page

- [1. Clarifying Requirements](#1-clarifying-requirements)
  - [1.1 Functional Requirements](#11-functional-requirements)
  - [1.2 Non-Functional Requirements](#12-non-functional-requirements)
- [2. Identifying Core Entities](#2-identifying-core-entities)
- [3. Class Design](#3-class-design)
  - [3.1 Class Definitions](#31-class-definitions)
  - [3.2 Class Relationships](#32-class-relationships)
  - [3.3 Key Design Patterns](#33-key-design-patterns)
  - [3.4 Full Class Diagram](#34-full-class-diagram)
- [4. Code Implementation](#4-code-implementation)
- [5. Run and Test](#5-run-and-test)
- [6. Summary](#6-summary)

---

Let's start by clarifying the requirements:

# 1. Clarifying Requirements

Before starting the design, it's important to ask thoughtful questions to uncover hidden assumptions, clarify ambiguities, and define the system's scope more precisely.

Here is an example of how a discussion between the candidate and the interviewer might unfold:

Discussion

**Candidate:** What notification channels should the system support?

**Interviewer:** The system should support at least three channels: Email, SMS, and Push notifications. It should be extensible to add more channels in the future.

**Candidate:** Should users be able to set preferences for which channels they want to receive notifications on?

**Interviewer:** Yes, users should be able to opt-in or opt-out of specific channels. The system should respect these preferences when sending notifications.

**Candidate:** Do we need to support different priority levels for notifications?

**Interviewer:** Yes, notifications should have priority levels like LOW, MEDIUM, and HIGH. High-priority notifications might be sent immediately, while lower priority ones could be batched.

**Candidate:** Should we support notification templates for consistent messaging?

**Interviewer:** Yes, templates are important. They allow us to define message formats with placeholders that get filled in with dynamic content.

**Candidate:** What should happen if a notification fails to deliver?

**Interviewer:** For this design, we'll track the status (PENDING, SENT, FAILED) but won't implement retry logic. Just log the failure.

**Candidate:** Should the system support sending to multiple users at once (bulk notifications)?

**Interviewer:** Yes, the system should be able to send the same notification to multiple users efficiently.

**Candidate:** Do we need to handle rate limiting or throttling?

**Interviewer:** Not for this version. Let's keep it simple and focus on the core notification flow.

After gathering the details, we can summarize the key system requirements.

## 1.1 Functional Requirements

* Support **multiple notification channels**: Email, SMS, and Push notifications
* Allow users to set **channel preferences** (opt-in/opt-out per channel)
* Support **priority levels** (LOW, MEDIUM, HIGH) for notifications
* Provide **notification templates** with placeholder substitution
* Track **notification status** (PENDING, SENT, FAILED)
* Support sending notifications to **single or multiple users**
* Make it easy to **add new channels** without modifying existing code

## 1.2 Non-Functional Requirements

* **Extensibility:** Adding new notification channels should not require changes to the core notification service
* **Modularity:** Clear separation between notification creation, channel selection, and delivery
* **Maintainability:** Clean, readable code with single responsibility for each class
* **Testability:** Components should be testable in isolation (channels can be mocked)

Now that we understand what we're building, let's identify the building blocks of our system.

# 2. Identifying Core Entities

Let's walk through our requirements and identify what needs to exist in our system.

#### 1. Support multiple notification channels: Email, SMS, and Push

We need to represent the different types of notifications. An enum `**NotificationType**` with values `EMAIL`, `SMS`, and `PUSH` captures this cleanly.

Each channel has different delivery mechanisms (SMTP for email, API calls for SMS, etc.), but they all do the same thing: send a message. This suggests an interface `**NotificationChannel**` with concrete implementations for each channel type.

**This is the Strategy Pattern in action.** Each channel is a strategy for delivering notifications. The system can switch between strategies without changing its core logic.

#### 2. Track notification status (PENDING, SENT, FAILED)

We need an enum `**NotificationStatus**` to track where each notification is in its lifecycle.

#### 3. Support priority levels for notifications

An enum `**Priority**` with values `LOW`, `MEDIUM`, and `HIGH` handles this requirement.

#### 4. Allow users to set channel preferences

We need a `**User**` entity that stores not just identification (id, name, email, phone) but also their notification preferences per channel.

#### 5. Provide notification templates with placeholder substitution

We need a `**NotificationTemplate**` entity that holds a template string with placeholders like `{{userName}}` that get replaced with actual values.

#### 6. Create and send notifications

We need a `**Notification**` entity to represent a single notification instance with its type, content, recipient, status, and priority.

#### 7. Orchestrate the notification flow

A `**NotificationService**` coordinates everything: receives notification requests, checks user preferences, selects the appropriate channel, and triggers delivery.

Note

The key insight here is that notification channels are interchangeable strategies. Email, SMS, and Push all implement the same interface, making the system extensible without modifying the core service.

### Entity Overview

We've identified three types of entities:

**Enums** define fixed sets of values: NotificationType, NotificationStatus, Priority.

**Data Classes** hold data with some behavior: User (with preferences), Notification, NotificationTemplate.

**Core Classes** contain the main logic: NotificationChannel (interface), EmailChannel, SMSChannel, PushChannel (implementations), and NotificationService (orchestrator).

With our entities identified, let's define their attributes, behaviors, and relationships.

# 3. Class Design

Now that we know what entities we need, let's flesh out their details.

## 3.1 Class Definitions

We'll work bottom-up: simple types first, then data containers, then the classes with real logic.

### Enums

Enums define fixed sets of values that provide type safety and make code self-documenting.

#### `NotificationType`

Represents the channel through which a notification is sent.

```
enum NotificationType {
    EMAIL,
    SMS,
    PUSH
}
```

Each type corresponds to a specific delivery mechanism and channel implementation.

#### `NotificationStatus`

Tracks the lifecycle of a notification.

```
enum NotificationStatus {
    PENDING,    // Created but not yet sent
    SENT,       // Successfully delivered to the channel
    FAILED      // Delivery failed
}
```

#### `Priority`

Indicates the urgency of a notification.

```
enum Priority {
    LOW,
    MEDIUM,
    HIGH
}
```

Design Decision

We keep priorities simple with three levels. In a production system, you might add URGENT or CRITICAL, but three levels cover most use cases without overcomplicating the system.

### Data Classes

Data classes are containers that hold data with some associated behavior.

#### `User`

Represents a user who can receive notifications.

```
User {
    - id: string
    - name: string
    - email: string
    - phone: string
    - deviceToken: string  // For push notifications
    - preferences: Map<NotificationType, boolean>

    + constructor(id, name, email, phone, deviceToken)
    + isChannelEnabled(type: NotificationType): boolean
    + setChannelPreference(type, enabled): void
    + getContactForChannel(type): string
}
```

The `preferences` map stores whether each channel is enabled for this user. The `getContactForChannel()` method returns the appropriate contact info (email for EMAIL, phone for SMS, deviceToken for PUSH).

#### `NotificationTemplate`

Defines a reusable message template with placeholders.

```
NotificationTemplate {
    - id: string
    - name: string
    - subject: string
    - body: string  // Contains {{placeholders}}

    + constructor(id, name, subject, body)
    + render(data: Map<string, string>): { subject, body }
}
```

The `render()` method replaces placeholders like `{{userName}}` with actual values from the data map.

#### `Notification`

Represents a single notification instance.

```
Notification {
    - id: string
    - type: NotificationType
    - recipient: User
    - subject: string
    - body: string
    - priority: Priority
    - status: NotificationStatus
    - createdAt: Date
    - sentAt: Date | null

    + constructor(type, recipient, subject, body, priority)
    + markSent(): void
    + markFailed(): void
}
```

Design Decision

The Notification holds the rendered content (subject, body) rather than a reference to the template. This captures the exact message sent, even if the template changes later.

### Core Classes

Core classes contain the main business logic.

#### `NotificationChannel` (Interface)

Defines the contract for sending notifications.

```
interface NotificationChannel {
    + getType(): NotificationType
    + send(notification: Notification): boolean
}
```

This interface enables the Strategy Pattern. Each channel implements the same interface but delivers messages differently.

#### `EmailChannel`

Sends notifications via email.

```
EmailChannel implements NotificationChannel {
    + getType(): NotificationType  // Returns EMAIL
    + send(notification): boolean  // Simulates SMTP send
}
```

#### `SMSChannel`

Sends notifications via SMS.

```
SMSChannel implements NotificationChannel {
    + getType(): NotificationType  // Returns SMS
    + send(notification): boolean  // Simulates SMS API call
}
```

#### `PushChannel`

Sends push notifications to mobile devices.

```
PushChannel implements NotificationChannel {
    + getType(): NotificationType  // Returns PUSH
    + send(notification): boolean  // Simulates push service
}
```

Design Decision

Each channel simulates the actual sending with console output. In a real system, EmailChannel would use SMTP, SMSChannel would call Twilio/AWS SNS, and PushChannel would use Firebase/APNs.

#### `NotificationService`

The main orchestrator that coordinates notification delivery.

```
NotificationService {
    - channels: Map<NotificationType, NotificationChannel>
    - templates: Map<string, NotificationTemplate>

    + constructor()
    + registerChannel(channel: NotificationChannel): void
    + registerTemplate(template: NotificationTemplate): void
    + createNotification(type, recipient, templateId, data, priority): Notification
    + send(notification: Notification): boolean
    + sendToMultiple(type, recipients[], templateId, data, priority): Notification[]
}
```

**Key Design Principles:**

1. **Channel Registry:** Channels are registered at startup. The service doesn't know about specific channel implementations.
2. **Template Registry:** Templates are stored centrally for reuse.
3. **Preference Check:** Before sending, the service checks if the user has enabled the channel.
4. **Status Tracking:** The service updates notification status based on delivery result.

## 3.2 Class Relationships

How do these classes connect?

#### Composition

* **NotificationService owns Channels:** The service manages the lifecycle of registered channels.

#### Aggregation

* **Notification references User:** A notification is sent to a user, but users exist independently.
* **NotificationService uses Templates:** Templates are stored in the service but could exist elsewhere.

#### Interface Implementation

* **EmailChannel implements NotificationChannel**
* **SMSChannel implements NotificationChannel**
* **PushChannel implements NotificationChannel**

## 3.3 Key Design Patterns

Let's make the structural patterns explicit and justify why each is appropriate here.

### Strategy Pattern (NotificationChannel)

**The Problem:** We need to send notifications through different channels (Email, SMS, Push), each with completely different delivery mechanisms. If we put all this logic in one class, it becomes a maintenance nightmare with conditionals everywhere.

**The Solution:** The Strategy pattern defines a family of algorithms (delivery mechanisms), encapsulates each one in its own class, and makes them interchangeable. The NotificationService delegates delivery to the appropriate channel without knowing how each channel works.

**Why This Pattern:**

```typescript
// Without Strategy - messy conditionals
send(notification: Notification): void {
    if (notification.type === NotificationType.EMAIL) {
        // Email-specific SMTP logic
    } else if (notification.type === NotificationType.SMS) {
        // SMS-specific API logic
    } else if (notification.type === NotificationType.PUSH) {
        // Push-specific FCM logic
    }
    // Adding new channels means modifying this method
}

// With Strategy - clean and extensible
send(notification: Notification): void {
    const channel = this.channels.get(notification.type);
    channel.send(notification);
    // Adding new channels means registering a new implementation
}
```

Design Decision

New channels (like WhatsApp, Slack, In-App) can be added by creating a new class that implements NotificationChannel and registering it. Zero changes to existing code.

### Factory Pattern (Template Rendering)

**The Problem:** Creating notifications requires several steps: looking up the template, rendering with user data, creating the notification object. Spreading this logic across the codebase leads to inconsistency.

**The Solution:** The NotificationService acts as a factory for notifications. The `createNotification()` method encapsulates all creation logic in one place.

**Why This Pattern:**

```typescript
// Clean factory method
createNotification(
    type: NotificationType,
    recipient: User,
    templateId: string,
    data: Map<string, string>,
    priority: Priority
): Notification {
    const template = this.templates.get(templateId);
    const rendered = template.render(data);
    return new Notification(type, recipient, rendered.subject, rendered.body, priority);
}
```

Design Decision

We don't use a separate Factory class because the NotificationService is the natural home for this logic. It already has access to templates and understands the notification lifecycle.

## 3.4 Full Class Diagram

```
+-------------------+     +-------------------+     +-------------------+
|    <<enum>>       |     |    <<enum>>       |     |    <<enum>>       |
| NotificationType  |     | NotificationStatus|     |     Priority      |
+-------------------+     +-------------------+     +-------------------+
| EMAIL             |     | PENDING           |     | LOW               |
| SMS               |     | SENT              |     | MEDIUM            |
| PUSH              |     | FAILED            |     | HIGH              |
+-------------------+     +-------------------+     +-------------------+

+-------------------------+     +-------------------------+
|          User           |     |   NotificationTemplate  |
+-------------------------+     +-------------------------+
| - id: string            |     | - id: string            |
| - name: string          |     | - name: string          |
| - email: string         |     | - subject: string       |
| - phone: string         |     | - body: string          |
| - deviceToken: string   |     +-------------------------+
| - preferences: Map      |     | + render(data): {s,b}   |
+-------------------------+     +-------------------------+
| + isChannelEnabled()    |
| + getContactForChannel()|
+-------------------------+
         |
         v
+-------------------------+
|      Notification       |
+-------------------------+
| - id: string            |
| - type: NotificationType|
| - recipient: User       |
| - subject: string       |
| - body: string          |
| - priority: Priority    |
| - status: Status        |
+-------------------------+
| + markSent()            |
| + markFailed()          |
+-------------------------+

+-------------------------+
|  <<interface>>          |
|  NotificationChannel    |
+-------------------------+
| + getType(): Type       |
| + send(n): boolean      |
+-------------------------+
         ^
         |
    +----+----+----+
    |         |    |
+-------+ +------+ +------+
| Email | | SMS  | | Push |
|Channel| |Channel| |Channel|
+-------+ +------+ +------+

+----------------------------------+
|       NotificationService        |
+----------------------------------+
| - channels: Map<Type, Channel>   |
| - templates: Map<string, Tmpl>   |
+----------------------------------+
| + registerChannel(channel)       |
| + registerTemplate(template)     |
| + createNotification(...)        |
| + send(notification): boolean    |
| + sendToMultiple(...): []        |
+----------------------------------+
```

# 4. Code Implementation

Now let's translate our design into working TypeScript code.

## 4.1 Enums

```typescript
enum NotificationType {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH'
}

enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED'
}

enum Priority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}
```

## 4.2 Data Classes

```typescript
class User {
    private readonly id: string;
    private readonly name: string;
    private readonly email: string;
    private readonly phone: string;
    private readonly deviceToken: string;
    private preferences: Map<NotificationType, boolean>;

    constructor(
        id: string,
        name: string,
        email: string,
        phone: string,
        deviceToken: string = ''
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.deviceToken = deviceToken;
        // All channels enabled by default
        this.preferences = new Map([
            [NotificationType.EMAIL, true],
            [NotificationType.SMS, true],
            [NotificationType.PUSH, true],
        ]);
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getEmail(): string {
        return this.email;
    }

    getPhone(): string {
        return this.phone;
    }

    getDeviceToken(): string {
        return this.deviceToken;
    }

    isChannelEnabled(type: NotificationType): boolean {
        return this.preferences.get(type) ?? false;
    }

    setChannelPreference(type: NotificationType, enabled: boolean): void {
        this.preferences.set(type, enabled);
    }

    /**
     * Returns the appropriate contact info for the given channel.
     */
    getContactForChannel(type: NotificationType): string {
        switch (type) {
            case NotificationType.EMAIL:
                return this.email;
            case NotificationType.SMS:
                return this.phone;
            case NotificationType.PUSH:
                return this.deviceToken;
            default:
                return '';
        }
    }
}
```

```typescript
class NotificationTemplate {
    private readonly id: string;
    private readonly name: string;
    private readonly subject: string;
    private readonly body: string;

    constructor(id: string, name: string, subject: string, body: string) {
        this.id = id;
        this.name = name;
        this.subject = subject;
        this.body = body;
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    /**
     * Renders the template by replacing placeholders with actual values.
     * Placeholders are in the format {{key}}.
     */
    render(data: Map<string, string>): { subject: string; body: string } {
        let renderedSubject = this.subject;
        let renderedBody = this.body;

        data.forEach((value, key) => {
            const placeholder = `{{${key}}}`;
            renderedSubject = renderedSubject.split(placeholder).join(value);
            renderedBody = renderedBody.split(placeholder).join(value);
        });

        return { subject: renderedSubject, body: renderedBody };
    }
}
```

```typescript
class Notification {
    private readonly id: string;
    private readonly type: NotificationType;
    private readonly recipient: User;
    private readonly subject: string;
    private readonly body: string;
    private readonly priority: Priority;
    private status: NotificationStatus;
    private readonly createdAt: Date;
    private sentAt: Date | null;

    constructor(
        type: NotificationType,
        recipient: User,
        subject: string,
        body: string,
        priority: Priority = Priority.MEDIUM
    ) {
        this.id = this.generateId();
        this.type = type;
        this.recipient = recipient;
        this.subject = subject;
        this.body = body;
        this.priority = priority;
        this.status = NotificationStatus.PENDING;
        this.createdAt = new Date();
        this.sentAt = null;
    }

    private generateId(): string {
        return `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getId(): string {
        return this.id;
    }

    getType(): NotificationType {
        return this.type;
    }

    getRecipient(): User {
        return this.recipient;
    }

    getSubject(): string {
        return this.subject;
    }

    getBody(): string {
        return this.body;
    }

    getPriority(): Priority {
        return this.priority;
    }

    getStatus(): NotificationStatus {
        return this.status;
    }

    markSent(): void {
        this.status = NotificationStatus.SENT;
        this.sentAt = new Date();
    }

    markFailed(): void {
        this.status = NotificationStatus.FAILED;
    }
}
```

## 4.3 Channel Classes (Strategy Pattern)

```typescript
interface NotificationChannel {
    getType(): NotificationType;
    send(notification: Notification): boolean;
}

class EmailChannel implements NotificationChannel {
    getType(): NotificationType {
        return NotificationType.EMAIL;
    }

    send(notification: Notification): boolean {
        const recipient = notification.getRecipient();
        const email = recipient.getEmail();

        // Simulate email sending (in production, use SMTP/SendGrid/SES)
        console.log(`\n[EMAIL] Sending to: ${email}`);
        console.log(`  Subject: ${notification.getSubject()}`);
        console.log(`  Body: ${notification.getBody()}`);
        console.log(`  Status: Delivered via SMTP`);

        // Simulate success (could randomly fail for testing)
        return true;
    }
}

class SMSChannel implements NotificationChannel {
    getType(): NotificationType {
        return NotificationType.SMS;
    }

    send(notification: Notification): boolean {
        const recipient = notification.getRecipient();
        const phone = recipient.getPhone();

        // Simulate SMS sending (in production, use Twilio/AWS SNS)
        console.log(`\n[SMS] Sending to: ${phone}`);
        console.log(`  Message: ${notification.getBody()}`);
        console.log(`  Status: Delivered via SMS Gateway`);

        return true;
    }
}

class PushChannel implements NotificationChannel {
    getType(): NotificationType {
        return NotificationType.PUSH;
    }

    send(notification: Notification): boolean {
        const recipient = notification.getRecipient();
        const deviceToken = recipient.getDeviceToken();

        if (!deviceToken) {
            console.log(`\n[PUSH] Failed: No device token for ${recipient.getName()}`);
            return false;
        }

        // Simulate push notification (in production, use FCM/APNs)
        console.log(`\n[PUSH] Sending to device: ${deviceToken}`);
        console.log(`  Title: ${notification.getSubject()}`);
        console.log(`  Body: ${notification.getBody()}`);
        console.log(`  Status: Delivered via Push Service`);

        return true;
    }
}
```

## 4.4 NotificationService

```typescript
class NotificationService {
    private channels: Map<NotificationType, NotificationChannel>;
    private templates: Map<string, NotificationTemplate>;

    constructor() {
        this.channels = new Map();
        this.templates = new Map();
    }

    /**
     * Registers a notification channel.
     */
    registerChannel(channel: NotificationChannel): void {
        this.channels.set(channel.getType(), channel);
        console.log(`Registered channel: ${channel.getType()}`);
    }

    /**
     * Registers a notification template.
     */
    registerTemplate(template: NotificationTemplate): void {
        this.templates.set(template.getId(), template);
        console.log(`Registered template: ${template.getName()}`);
    }

    /**
     * Creates a notification from a template.
     */
    createNotification(
        type: NotificationType,
        recipient: User,
        templateId: string,
        data: Map<string, string>,
        priority: Priority = Priority.MEDIUM
    ): Notification | null {
        const template = this.templates.get(templateId);
        if (!template) {
            console.log(`Template not found: ${templateId}`);
            return null;
        }

        const rendered = template.render(data);
        return new Notification(type, recipient, rendered.subject, rendered.body, priority);
    }

    /**
     * Sends a notification through the appropriate channel.
     * Respects user preferences.
     */
    send(notification: Notification): boolean {
        const type = notification.getType();
        const recipient = notification.getRecipient();

        // Check user preference
        if (!recipient.isChannelEnabled(type)) {
            console.log(
                `\n[SKIPPED] ${recipient.getName()} has disabled ${type} notifications`
            );
            return false;
        }

        // Get the appropriate channel
        const channel = this.channels.get(type);
        if (!channel) {
            console.log(`\nNo channel registered for type: ${type}`);
            notification.markFailed();
            return false;
        }

        // Send the notification
        const success = channel.send(notification);

        if (success) {
            notification.markSent();
        } else {
            notification.markFailed();
        }

        return success;
    }

    /**
     * Sends notifications to multiple recipients.
     */
    sendToMultiple(
        type: NotificationType,
        recipients: User[],
        templateId: string,
        data: Map<string, string>,
        priority: Priority = Priority.MEDIUM
    ): Notification[] {
        const notifications: Notification[] = [];

        for (const recipient of recipients) {
            // Add recipient-specific data
            const personalizedData = new Map(data);
            personalizedData.set('userName', recipient.getName());

            const notification = this.createNotification(
                type,
                recipient,
                templateId,
                personalizedData,
                priority
            );

            if (notification) {
                this.send(notification);
                notifications.push(notification);
            }
        }

        return notifications;
    }

    /**
     * Displays summary of sent notifications.
     */
    displaySummary(notifications: Notification[]): void {
        console.log('\n=== Notification Summary ===');
        const sent = notifications.filter(n => n.getStatus() === NotificationStatus.SENT).length;
        const failed = notifications.filter(n => n.getStatus() === NotificationStatus.FAILED).length;
        const pending = notifications.filter(n => n.getStatus() === NotificationStatus.PENDING).length;

        console.log(`Total: ${notifications.length}`);
        console.log(`Sent: ${sent}`);
        console.log(`Failed: ${failed}`);
        console.log(`Pending: ${pending}`);
        console.log('============================\n');
    }
}
```

## 4.5 Demo

```typescript
function runDemo(): void {
    console.log('=== Notification System Demo ===\n');

    // Create the notification service
    const notificationService = new NotificationService();

    // Register channels
    notificationService.registerChannel(new EmailChannel());
    notificationService.registerChannel(new SMSChannel());
    notificationService.registerChannel(new PushChannel());

    // Register templates
    const welcomeTemplate = new NotificationTemplate(
        'welcome',
        'Welcome Email',
        'Welcome to Our Platform, {{userName}}!',
        'Hi {{userName}}, thank you for joining us! Your account is now active.'
    );

    const orderTemplate = new NotificationTemplate(
        'order-confirmation',
        'Order Confirmation',
        'Order #{{orderId}} Confirmed',
        'Hi {{userName}}, your order #{{orderId}} has been confirmed. Total: ${{amount}}'
    );

    const reminderTemplate = new NotificationTemplate(
        'reminder',
        'Reminder',
        'Reminder: {{eventName}}',
        'Hi {{userName}}, this is a reminder for {{eventName}} at {{eventTime}}.'
    );

    notificationService.registerTemplate(welcomeTemplate);
    notificationService.registerTemplate(orderTemplate);
    notificationService.registerTemplate(reminderTemplate);

    console.log('\n--- Creating Users ---');

    // Create users with different preferences
    const alice = new User('u1', 'Alice', 'alice@example.com', '+1234567890', 'device-token-alice');

    const bob = new User('u2', 'Bob', 'bob@example.com', '+0987654321', 'device-token-bob');
    bob.setChannelPreference(NotificationType.SMS, false); // Bob disabled SMS

    const charlie = new User('u3', 'Charlie', 'charlie@example.com', '+1122334455', '');
    // Charlie has no device token for push

    console.log(`Created user: ${alice.getName()} (all channels enabled)`);
    console.log(`Created user: ${bob.getName()} (SMS disabled)`);
    console.log(`Created user: ${charlie.getName()} (no push token)`);

    // Send individual notifications
    console.log('\n--- Sending Individual Notifications ---');

    // Welcome email to Alice
    const welcomeData = new Map([['userName', alice.getName()]]);
    const welcomeNotification = notificationService.createNotification(
        NotificationType.EMAIL,
        alice,
        'welcome',
        welcomeData,
        Priority.HIGH
    );
    if (welcomeNotification) {
        notificationService.send(welcomeNotification);
    }

    // Order SMS to Alice
    const orderData = new Map([
        ['userName', alice.getName()],
        ['orderId', '12345'],
        ['amount', '99.99'],
    ]);
    const orderNotification = notificationService.createNotification(
        NotificationType.SMS,
        alice,
        'order-confirmation',
        orderData,
        Priority.HIGH
    );
    if (orderNotification) {
        notificationService.send(orderNotification);
    }

    // Try SMS to Bob (should be skipped - disabled)
    const bobSmsNotification = notificationService.createNotification(
        NotificationType.SMS,
        bob,
        'order-confirmation',
        new Map([['userName', bob.getName()], ['orderId', '67890'], ['amount', '150.00']]),
        Priority.MEDIUM
    );
    if (bobSmsNotification) {
        notificationService.send(bobSmsNotification);
    }

    // Push notification to Charlie (should fail - no token)
    const charlieData = new Map([
        ['userName', charlie.getName()],
        ['eventName', 'Team Meeting'],
        ['eventTime', '3:00 PM'],
    ]);
    const pushNotification = notificationService.createNotification(
        NotificationType.PUSH,
        charlie,
        'reminder',
        charlieData,
        Priority.MEDIUM
    );
    if (pushNotification) {
        notificationService.send(pushNotification);
    }

    // Send bulk notifications
    console.log('\n--- Sending Bulk Notifications ---');

    const allUsers = [alice, bob, charlie];
    const promoData = new Map([
        ['eventName', 'Flash Sale'],
        ['eventTime', 'Today at 5 PM'],
    ]);

    const bulkNotifications = notificationService.sendToMultiple(
        NotificationType.EMAIL,
        allUsers,
        'reminder',
        promoData,
        Priority.LOW
    );

    // Display summary
    notificationService.displaySummary([
        welcomeNotification!,
        orderNotification!,
        bobSmsNotification!,
        pushNotification!,
        ...bulkNotifications,
    ]);

    console.log('=== Demo Complete ===');
}

// Run the demo
runDemo();
```

# 5. Run and Test

To run this implementation:

```bash
# Save all the code to a single file: notification-system.ts
npx ts-node 10-low-level-design-interview/02-design-notification-system.ts
```

### Expected Output

```
=== Notification System Demo ===

Registered channel: EMAIL
Registered channel: SMS
Registered channel: PUSH
Registered template: Welcome Email
Registered template: Order Confirmation
Registered template: Reminder

--- Creating Users ---
Created user: Alice (all channels enabled)
Created user: Bob (SMS disabled)
Created user: Charlie (no push token)

--- Sending Individual Notifications ---

[EMAIL] Sending to: alice@example.com
  Subject: Welcome to Our Platform, Alice!
  Body: Hi Alice, thank you for joining us! Your account is now active.
  Status: Delivered via SMTP

[SMS] Sending to: +1234567890
  Message: Hi Alice, your order #12345 has been confirmed. Total: $99.99
  Status: Delivered via SMS Gateway

[SKIPPED] Bob has disabled SMS notifications

[PUSH] Failed: No device token for Charlie

--- Sending Bulk Notifications ---

[EMAIL] Sending to: alice@example.com
  Subject: Reminder: Flash Sale
  Body: Hi Alice, this is a reminder for Flash Sale at Today at 5 PM.
  Status: Delivered via SMTP

[EMAIL] Sending to: bob@example.com
  Subject: Reminder: Flash Sale
  Body: Hi Bob, this is a reminder for Flash Sale at Today at 5 PM.
  Status: Delivered via SMTP

[EMAIL] Sending to: charlie@example.com
  Subject: Reminder: Flash Sale
  Body: Hi Charlie, this is a reminder for Flash Sale at Today at 5 PM.
  Status: Delivered via SMTP

=== Notification Summary ===
Total: 7
Sent: 5
Failed: 2
Pending: 0
============================

=== Demo Complete ===
```

# 6. Summary

In this design, we built a notification system that demonstrates key object-oriented principles:

| Pattern | Where Used | Why |
|---------|------------|-----|
| **Strategy** | NotificationChannel | Interchangeable delivery mechanisms for different channels |
| **Factory** | NotificationService.createNotification() | Encapsulates notification creation with template rendering |
| **Interface Segregation** | NotificationChannel interface | Channels only implement what they need |

### Key Takeaways

1. **Strategy Pattern enables extensibility** - Adding WhatsApp or Slack just requires a new class implementing NotificationChannel
2. **User preferences are first-class** - The system respects opt-in/opt-out choices before sending
3. **Templates separate content from delivery** - Message formatting is decoupled from channel logic
4. **Status tracking provides visibility** - Every notification has a clear lifecycle state
