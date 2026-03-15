# Refactoring Catalog Summary

Based on Martin Fowler's "Refactoring: Improving the Design of Existing Code" (2nd Edition)

## Overview

This catalog contains 61 refactorings organized into 7 categories. Each refactoring pattern includes:
- Motivation (when to apply)
- Mechanics (step-by-step procedure)
- Before/After code examples

## Categories

### 1. Basic Refactorings (11 patterns)
Foundational refactorings that form the building blocks for more complex transformations.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Extract Function | Create a new function from code fragment |
| 02 | Inline Function | Replace function call with function body |
| 03 | Extract Variable | Replace expression with named variable |
| 04 | Inline Variable | Replace variable with its value |
| 05 | Change Function Declaration | Rename function or change parameters |
| 06 | Encapsulate Variable | Wrap variable access in functions |
| 07 | Rename Variable | Give variable a clearer name |
| 08 | Introduce Parameter Object | Replace related parameters with object |
| 09 | Combine Functions into Class | Group functions operating on same data |
| 10 | Combine Functions into Transform | Create transformation function for data |
| 11 | Split Phase | Separate code into distinct phases |

### 2. Encapsulation (9 patterns)
Refactorings for hiding implementation details and controlling access to data.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Encapsulate Record | Replace record with class |
| 02 | Encapsulate Collection | Return copy, not reference to collection |
| 03 | Replace Primitive with Object | Wrap primitive in meaningful class |
| 04 | Replace Temp with Query | Extract temp calculation to method |
| 05 | Extract Class | Split class with multiple responsibilities |
| 06 | Inline Class | Merge class with insufficient behavior |
| 07 | Hide Delegate | Remove dependency on delegate's interface |
| 08 | Remove Middle Man | Let clients call delegate directly |
| 09 | Substitute Algorithm | Replace algorithm with clearer one |

### 3. Moving Features (9 patterns)
Refactorings for moving elements between contexts.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Move Function | Move function to better context |
| 02 | Move Field | Move field to class that uses it more |
| 03 | Move Statements into Function | Move statements into called function |
| 04 | Move Statements to Callers | Move statements out to callers |
| 05 | Replace Inline Code with Function Call | Replace code with existing function |
| 06 | Slide Statements | Move related code together |
| 07 | Split Loop | Separate loops that do multiple things |
| 08 | Replace Loop with Pipeline | Use collection pipeline operations |
| 09 | Remove Dead Code | Delete unreachable or unused code |

### 4. Organizing Data (5 patterns)
Refactorings for improving how data is organized and represented.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Split Variable | Create separate variable for each purpose |
| 02 | Rename Field | Give field a clearer name |
| 03 | Replace Derived Variable with Query | Replace stored calculation with method |
| 04 | Change Reference to Value | Make object immutable value object |
| 05 | Change Value to Reference | Share single instance across system |

### 5. Simplifying Conditional Logic (6 patterns)
Refactorings for making conditional expressions clearer.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Decompose Conditional | Extract condition and branches to functions |
| 02 | Consolidate Conditional Expression | Combine related conditions |
| 03 | Replace Nested Conditional with Guard Clauses | Use guard clauses for special cases |
| 04 | Replace Conditional with Polymorphism | Use polymorphism instead of conditionals |
| 05 | Introduce Special Case | Handle special case with dedicated class |
| 06 | Introduce Assertion | Make assumptions explicit with assertions |

### 6. Refactoring APIs (10 patterns)
Refactorings for improving function/method interfaces.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Separate Query from Modifier | Split function that queries and modifies |
| 02 | Parameterize Function | Add parameter to generalize function |
| 03 | Remove Flag Argument | Replace flag with separate functions |
| 04 | Preserve Whole Object | Pass whole object instead of fields |
| 05 | Replace Parameter with Query | Remove parameter obtainable from other data |
| 06 | Replace Query with Parameter | Pass value instead of querying global state |
| 07 | Remove Setting Method | Make field immutable after construction |
| 08 | Replace Constructor with Factory Function | Use factory for more flexible creation |
| 09 | Replace Function with Command | Wrap function in command object |
| 10 | Replace Command with Function | Simplify command back to function |

### 7. Dealing with Inheritance (11 patterns)
Refactorings for working with class hierarchies.

| # | Pattern | Description |
|---|---------|-------------|
| 01 | Pull Up Method | Move method from subclasses to superclass |
| 02 | Pull Up Field | Move field from subclasses to superclass |
| 03 | Pull Up Constructor Body | Move common constructor code to super |
| 04 | Push Down Method | Move method from superclass to subclasses |
| 05 | Push Down Field | Move field from superclass to subclasses |
| 06 | Replace Type Code with Subclasses | Use subclasses instead of type field |
| 07 | Remove Subclass | Replace subclass with field in superclass |
| 08 | Extract Superclass | Create superclass from common features |
| 09 | Collapse Hierarchy | Merge superclass and subclass |
| 10 | Replace Subclass with Delegate | Use composition instead of inheritance |
| 11 | Replace Superclass with Delegate | Delegate instead of inheriting |

## When to Refactor

1. **Rule of Three**: Refactor when you see similar code three times
2. **Preparatory Refactoring**: Before adding a feature, refactor to make it easier
3. **Comprehension Refactoring**: Refactor to understand code better
4. **Litter-Pickup Refactoring**: Make small improvements as you go
5. **Planned Refactoring**: Dedicated time for larger refactoring efforts

## Code Smells → Refactorings

| Smell | Suggested Refactorings |
|-------|----------------------|
| Long Function | Extract Function, Replace Temp with Query |
| Large Class | Extract Class, Extract Superclass |
| Primitive Obsession | Replace Primitive with Object |
| Long Parameter List | Introduce Parameter Object, Preserve Whole Object |
| Duplicated Code | Extract Function, Pull Up Method |
| Feature Envy | Move Function, Move Field |
| Data Clumps | Introduce Parameter Object, Extract Class |
| Switch Statements | Replace Conditional with Polymorphism |
| Speculative Generality | Collapse Hierarchy, Inline Function |
| Dead Code | Remove Dead Code |

## References

- [Refactoring Catalog](https://refactoring.com/catalog/)
- [Martin Fowler's Book](https://martinfowler.com/books/refactoring.html)
