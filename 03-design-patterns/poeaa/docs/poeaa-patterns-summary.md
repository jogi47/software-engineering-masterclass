# Patterns of Enterprise Application Architecture (PoEAA)

**Author:** Martin Fowler
**Published:** 2002

A catalog of patterns for enterprise application development, focusing on organizing domain logic, mapping objects to databases, handling web requests, and managing distribution.

---

## Pattern Categories

| Category | Focus Area |
|----------|------------|
| Domain Logic | How to organize business logic |
| Data Source | How objects interact with the database |
| Object-Relational | Managing object-database relationships |
| Web Presentation | Handling HTTP requests and responses |
| Distribution | Communication across process boundaries |
| Base | Foundational patterns used throughout |

---

## Domain Logic Patterns

### Transaction Script
Organizes business logic as a collection of procedures, where each procedure handles a single request from the presentation layer.

**When to use:** Simple applications with straightforward business logic. Easy to understand but can lead to code duplication as complexity grows.

### Domain Model
An object model of the domain that incorporates both behavior and data. Objects represent real business entities with their own rules and logic.

**When to use:** Complex business logic with many rules and conditions. More upfront investment but scales better with complexity.

### Service Layer
Defines an application's boundary with a layer of services that establishes a set of available operations and coordinates the application's response.

**When to use:** When you need a clear API for your domain, especially when multiple clients (web, mobile, API) access the same business logic.

### Table Module
A single instance that handles the business logic for all rows in a database table or view.

**When to use:** When working with record sets (like DataTable in .NET). Good middle ground between Transaction Script and Domain Model.

---

## Data Source Architectural Patterns

### Active Record
An object that wraps a row in a database table, encapsulates the database access, and adds domain logic on that data.

**When to use:** Simple domain logic where each object maps directly to a database table. Popular in Rails and Laravel.

### Data Mapper
A layer of mappers that moves data between objects and a database while keeping them independent of each other.

**When to use:** Complex domains where you want to keep domain objects completely ignorant of the database. More flexibility but more complexity.

### Table Data Gateway
An object that acts as a Gateway to a database table. One instance handles all the rows in the table.

**When to use:** When you want to separate SQL from application logic and work with record sets.

### Row Data Gateway
An object that acts as a Gateway to a single record in a data source. There is one instance per row.

**When to use:** When you want database access separated from domain logic, with each row represented by its own object.

---

## Object-Relational Patterns

### Repository
Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects.

**When to use:** When you want to decouple domain logic from data access and enable easy testing with mock repositories.

### Unit of Work
Maintains a list of objects affected by a business transaction and coordinates the writing out of changes.

**When to use:** When you need to track multiple changes and commit them as a single transaction.

### Identity Map
Ensures that each object gets loaded only once by keeping every loaded object in a map. Looks up objects using the map when referring to them.

**When to use:** To prevent duplicate objects and ensure consistency within a business transaction.

### Lazy Load
An object that doesn't contain all the data you need but knows how to get it. Defers loading of data until it's actually needed.

**When to use:** When loading related data is expensive and not always needed. Be careful of N+1 query problems.

---

## Web Presentation Patterns

### Model View Controller (MVC)
Splits user interface interaction into three distinct roles: Model (data and business logic), View (display), and Controller (user input handling).

**When to use:** Almost always for web applications. Separates concerns and enables parallel development.

### Front Controller
A controller that handles all requests for a web site. Centralizes common behavior like security, i18n, and routing.

**When to use:** When you need consistent handling across all requests. Most web frameworks implement this pattern.

### Page Controller
An object that handles a request for a specific page or action on a web site.

**When to use:** Simple web applications where each page has its own handler. Easy to understand but can lead to duplication.

---

## Distribution Patterns

### Remote Facade
Provides a coarse-grained facade on fine-grained objects to improve efficiency over a network.

**When to use:** When exposing domain objects over a network. Reduces round trips by providing chunky interfaces.

### Data Transfer Object (DTO)
An object that carries data between processes in order to reduce the number of method calls.

**When to use:** When transferring data across boundaries (API responses, service calls). Decouples internal domain from external contracts.

---

## Base Patterns

### Gateway
An object that encapsulates access to an external system or resource.

**When to use:** When interacting with external services, APIs, or resources. Simplifies testing and allows swapping implementations.

### Value Object
A small object whose equality isn't based on identity but on value. Two Value Objects are equal if all their fields are equal.

**When to use:** For concepts like Money, DateRange, Address. Immutable and side-effect free.

### Registry
A well-known object that other objects can use to find common objects and services.

**When to use:** When objects need to access shared services without passing them through constructors. Use sparingly as it can become a global state.

---

## Quick Reference

| Pattern | Complexity | Use When |
|---------|------------|----------|
| Transaction Script | Low | Simple CRUD operations |
| Domain Model | High | Complex business rules |
| Service Layer | Medium | Multiple UI clients |
| Active Record | Low | Simple domain, rapid development |
| Data Mapper | High | Complex domain, testability important |
| Repository | Medium | Clean domain, easy testing |
| Unit of Work | Medium | Multiple related changes |
| DTO | Low | API boundaries |
| Value Object | Low | Immutable domain concepts |

---

## Code Examples

See the `03-design-patterns/poeaa/` directory for TypeScript implementations of each pattern.
