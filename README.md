# Software Engineering Masterclass

> A TypeScript-first learning repository for data structures, algorithms, design patterns, system design, database internals, and interview preparation.

This repository has expanded well beyond the original DSA-only scope. This README is designed to work in two passes for a reader: a fast overview at the top, followed by a full master index for direct navigation.

## What Is In The Repo

| Area | Folder | Current Scope |
| --- | --- | --- |
| Language / runtime notes | `01-language-runtime/` | Python notes today, with room for more runtime topics |
| DSA problems | `02-dsa-problems/` | 88 TypeScript files across `core`, `easy`, `medium`, and `hard` |
| Design patterns | `03-design-patterns/` | 112 TypeScript examples across GoF, PoEAA, DDD, and refactoring |
| Database internals | `04-database-basics/` | 12 DDIA chapter notes |
| System design blueprints | `05-system-design/` | 16 end-to-end architecture documents |
| System design fundamentals | `06-system-design-fundamental/` | 64 concept notes covering security, observability, data systems, architecture, and distributed systems |
| System design interview basics | `07-system-design-interview-basics/` | 3 interview-prep chapters covering framing, question taxonomy, and expectations by level |
| System design interview case studies | `08-system-design-interview/` | 2 interview-style design problems |
| Low-level design interview basics | `09-low-level-design-interview-basics/` | 2 foundational LLD prep notes |
| Low-level design interview case studies | `10-low-level-design-interview/` | 3 LLD case studies, with runnable TypeScript where applicable |
| Claude architect certification prep | `11-claude-architect/` | 9 certification-prep notes covering the exam guide plus Domain 1 and Domain 2 topics |
| Scratchpad | `practice/` | Local experimentation area |

## Repository Map

```text
software-engineering-masterclass/
├── 01-language-runtime/
├── 02-dsa-problems/
│   ├── core/
│   ├── easy/
│   ├── medium/
│   └── hard/
├── 03-design-patterns/
│   ├── core/
│   ├── poeaa/
│   ├── ddd/
│   └── refactoring/
├── 04-database-basics/
│   └── ddia/
├── 05-system-design/
├── 06-system-design-fundamental/
├── 07-system-design-interview-basics/
├── 08-system-design-interview/
├── 09-low-level-design-interview-basics/
├── 10-low-level-design-interview/
├── 11-claude-architect/
└── practice/
```

## Folder READMEs

These reader-facing folder indexes are maintained in top-level folder order:

1. [01-language-runtime/README.md](01-language-runtime/README.md)
2. [02-dsa-problems/README.md](02-dsa-problems/README.md)
3. [03-design-patterns/README.md](03-design-patterns/README.md)
4. [04-database-basics/README.md](04-database-basics/README.md)
5. [05-system-design/README.md](05-system-design/README.md)
6. [06-system-design-fundamental/README.md](06-system-design-fundamental/README.md)
7. [07-system-design-interview-basics/README.md](07-system-design-interview-basics/README.md)
8. [08-system-design-interview/README.md](08-system-design-interview/README.md)
9. [09-low-level-design-interview-basics/README.md](09-low-level-design-interview-basics/README.md)
10. [10-low-level-design-interview/README.md](10-low-level-design-interview/README.md)
11. [11-claude-architect/README.md](11-claude-architect/README.md)
12. [practice/README.md](practice/README.md)

## Table of Contents

- [What Is In The Repo](#what-is-in-the-repo)
- [Repository Map](#repository-map)
- [Folder READMEs](#folder-readmes)
- [Highlights](#highlights)
- [Master Index](#master-index)
  - [Language Runtime Index](#language-runtime-index)
  - [DSA Problems Index](#dsa-problems-index)
  - [Design Patterns Index](#design-patterns-index)
  - [Database And Distributed Systems Index](#database-and-distributed-systems-index)
  - [System Design Blueprints Index](#system-design-blueprints-index)
  - [System Design Fundamentals Index](#system-design-fundamentals-index)
  - [System Design Interview Basics Index](#system-design-interview-basics-index)
  - [System Design Interview Index](#system-design-interview-index)
  - [Low-Level Design Interview Basics Index](#low-level-design-interview-basics-index)
  - [Low-Level Design Interview Index](#low-level-design-interview-index)
  - [Claude Architect Foundations Index](#claude-architect-foundations-index)
- [Getting Started](#getting-started)
- [Project Conventions](#project-conventions)
- [Where To Start](#where-to-start)

## Highlights

### DSA

- `02-dsa-problems/core/`: 12 foundational data structures and algorithms
- `02-dsa-problems/easy/`: 18 easy problems
- `02-dsa-problems/medium/`: 47 medium problems
- `02-dsa-problems/hard/`: 11 hard problems

Representative files:

- [001-dynamic-array.ts](02-dsa-problems/core/001-dynamic-array.ts)
- [001-two-sum.ts](02-dsa-problems/easy/001-two-sum.ts)
- [001-group-anagrams.ts](02-dsa-problems/medium/001-group-anagrams.ts)

### Design Patterns

- `03-design-patterns/core/`: 10 GoF patterns
- `03-design-patterns/poeaa/`: 20 enterprise architecture patterns
- `03-design-patterns/ddd/`: 21 DDD patterns
- `03-design-patterns/refactoring/`: 61 Fowler refactoring patterns

Representative files:

- [01-factory-method.ts](03-design-patterns/core/01-factory-method.ts)
- [04-service-layer.ts](03-design-patterns/poeaa/domain-logic/04-service-layer.ts)
- [06-anticorruption-layer.ts](03-design-patterns/ddd/strategic/06-anticorruption-layer.ts)
- [01-extract-function.ts](03-design-patterns/refactoring/basic/01-extract-function.ts)

### Architecture And Systems

- `05-system-design/` contains full project blueprints such as:
  - [01-todo-app.md](05-system-design/01-todo-app.md)
  - [08-agent-framework.md](05-system-design/08-agent-framework.md)
  - [12-dex-amm.md](05-system-design/12-dex-amm.md)
  - [13-cex.md](05-system-design/13-cex.md)
- `06-system-design-fundamental/` contains focused concept notes such as:
  - [01-ssltls_explained.md](06-system-design-fundamental/01-ssltls_explained.md)
  - [05-three_pillars_of_observability.md](06-system-design-fundamental/05-three_pillars_of_observability.md)
  - [22-service_discovery.md](06-system-design-fundamental/22-service_discovery.md)
  - [29-service_mesh.md](06-system-design-fundamental/29-service_mesh.md)
- `04-database-basics/ddia/` contains 12 DDIA notes spanning foundations, distributed data, and derived data

### Interview Prep

- `08-system-design-interview/` contains full interview-style HLD problems:
  - [01-design-calendar-system.md](08-system-design-interview/01-design-calendar-system.md)
  - [02-design-google-docs.md](08-system-design-interview/02-design-google-docs.md)
- `09-low-level-design-interview-basics/` contains baseline LLD prep:
  - [01-what_is_low_level_design_lld.md](09-low-level-design-interview-basics/01-what_is_low_level_design_lld.md)
  - [02-lld_vs_hld.md](09-low-level-design-interview-basics/02-lld_vs_hld.md)
- `10-low-level-design-interview/` contains applied case studies:
  - [01-design-parking-lot.md](10-low-level-design-interview/01-design-parking-lot.md)
  - [02-design-notification-system.md](10-low-level-design-interview/02-design-notification-system.md)
  - [03-design-search-autocomplete.md](10-low-level-design-interview/03-design-search-autocomplete.md)
  - [03-design-search-autocomplete.ts](10-low-level-design-interview/03-design-search-autocomplete.ts)

### Claude Architect Foundations

- `11-claude-architect/` contains certification-prep material for the Claude Certified Architect Foundations track:
  - [claude-certified-architect-foundations-certification-exam-guide.md](11-claude-architect/claude-certified-architect-foundations-certification-exam-guide.md)
  - [topic-1.1-design-and-implement-agentic-loops-for-autonomous-task-execution.md](11-claude-architect/topic-1.1-design-and-implement-agentic-loops-for-autonomous-task-execution.md)
  - [topic-1.2-orchestrate-multi-agent-systems-with-coordinator-subagent-patterns.md](11-claude-architect/topic-1.2-orchestrate-multi-agent-systems-with-coordinator-subagent-patterns.md)
  - [topic-1.3-configure-subagent-invocation-context-passing-and-spawning.md](11-claude-architect/topic-1.3-configure-subagent-invocation-context-passing-and-spawning.md)

## Master Index

### Language Runtime Index

- [01-language-basics.md](01-language-runtime/python/01-language-basics.md)

### DSA Problems Index

#### Core

- [001-dynamic-array.ts](02-dsa-problems/core/001-dynamic-array.ts) - Dynamic Array
- [002-singly-linked-list.ts](02-dsa-problems/core/002-singly-linked-list.ts) - Singly Linked List
- [003-double-ended-queue.ts](02-dsa-problems/core/003-double-ended-queue.ts) - Double Ended Queue
- [004-binary-search-tree.ts](02-dsa-problems/core/004-binary-search-tree.ts) - Binary Search Tree
- [005-hash-table.ts](02-dsa-problems/core/005-hash-table.ts) - Hash Table
- [006-heap.ts](02-dsa-problems/core/006-heap.ts) - Heap
- [007-graph.ts](02-dsa-problems/core/007-graph.ts) - Graph
- [008-disjoint-set.ts](02-dsa-problems/core/008-disjoint-set.ts) - Disjoint Set
- [009-segment-tree.ts](02-dsa-problems/core/009-segment-tree.ts) - Segment Tree
- [010-insertion-sort.ts](02-dsa-problems/core/010-insertion-sort.ts) - Insertion Sort
- [011-merge-sort.ts](02-dsa-problems/core/011-merge-sort.ts) - Merge Sort
- [012-quick-sort.ts](02-dsa-problems/core/012-quick-sort.ts) - Quick Sort

#### Easy

- [001-two-sum.ts](02-dsa-problems/easy/001-two-sum.ts) - Two Sum
- [002-contains-duplicate.ts](02-dsa-problems/easy/002-contains-duplicate.ts) - Contains Duplicate
- [003-valid-anagram.ts](02-dsa-problems/easy/003-valid-anagram.ts) - Valid Anagram
- [004-valid-palindrome.ts](02-dsa-problems/easy/004-valid-palindrome.ts) - Valid Palindrome
- [005-best-time-to-buy-and-sell-stock.ts](02-dsa-problems/easy/005-best-time-to-buy-and-sell-stock.ts) - Best Time To Buy And Sell Stock
- [006-valid-parentheses.ts](02-dsa-problems/easy/006-valid-parentheses.ts) - Valid Parentheses
- [007-binary-search.ts](02-dsa-problems/easy/007-binary-search.ts) - Binary Search
- [008-reverse-linked-list.ts](02-dsa-problems/easy/008-reverse-linked-list.ts) - Reverse Linked List
- [009-merge-two-sorted-lists.ts](02-dsa-problems/easy/009-merge-two-sorted-lists.ts) - Merge Two Sorted Lists
- [010-linked-list-cycle.ts](02-dsa-problems/easy/010-linked-list-cycle.ts) - Linked List Cycle
- [011-invert-binary-tree.ts](02-dsa-problems/easy/011-invert-binary-tree.ts) - Invert Binary Tree
- [012-maximum-depth-of-binary-tree.ts](02-dsa-problems/easy/012-maximum-depth-of-binary-tree.ts) - Maximum Depth Of Binary Tree
- [013-diameter-of-binary-tree.ts](02-dsa-problems/easy/013-diameter-of-binary-tree.ts) - Diameter Of Binary Tree
- [014-balanced-binary-tree.ts](02-dsa-problems/easy/014-balanced-binary-tree.ts) - Balanced Binary Tree
- [015-same-tree.ts](02-dsa-problems/easy/015-same-tree.ts) - Same Tree
- [016-subtree-of-another-tree.ts](02-dsa-problems/easy/016-subtree-of-another-tree.ts) - Subtree Of Another Tree
- [017-kth-largest-element-in-stream.ts](02-dsa-problems/easy/017-kth-largest-element-in-stream.ts) - Kth Largest Element In Stream
- [018-last-stone-weight.ts](02-dsa-problems/easy/018-last-stone-weight.ts) - Last Stone Weight

#### Medium

- [001-group-anagrams.ts](02-dsa-problems/medium/001-group-anagrams.ts) - Group Anagrams
- [002-top-k-frequent-elements.ts](02-dsa-problems/medium/002-top-k-frequent-elements.ts) - Top K Frequent Elements
- [003-encode-and-decode-strings.ts](02-dsa-problems/medium/003-encode-and-decode-strings.ts) - Encode And Decode Strings
- [004-product-of-array-except-self.ts](02-dsa-problems/medium/004-product-of-array-except-self.ts) - Product Of Array Except Self
- [005-valid-sudoku.ts](02-dsa-problems/medium/005-valid-sudoku.ts) - Valid Sudoku
- [006-longest-consecutive-sequence.ts](02-dsa-problems/medium/006-longest-consecutive-sequence.ts) - Longest Consecutive Sequence
- [007-two-sum-ii-input-array-is-sorted.ts](02-dsa-problems/medium/007-two-sum-ii-input-array-is-sorted.ts) - Two Sum II Input Array Is Sorted
- [008-three-sum.ts](02-dsa-problems/medium/008-three-sum.ts) - Three Sum
- [009-container-with-most-water.ts](02-dsa-problems/medium/009-container-with-most-water.ts) - Container With Most Water
- [010-longest-substring-without-repeating-characters.ts](02-dsa-problems/medium/010-longest-substring-without-repeating-characters.ts) - Longest Substring Without Repeating Characters
- [011-longest-repeating-character-replacement.ts](02-dsa-problems/medium/011-longest-repeating-character-replacement.ts) - Longest Repeating Character Replacement
- [012-permutation-in-string.ts](02-dsa-problems/medium/012-permutation-in-string.ts) - Permutation In String
- [013-min-stack.ts](02-dsa-problems/medium/013-min-stack.ts) - Min Stack
- [014-evaluate-reverse-polish-notation.ts](02-dsa-problems/medium/014-evaluate-reverse-polish-notation.ts) - Evaluate Reverse Polish Notation
- [015-daily-temperatures.ts](02-dsa-problems/medium/015-daily-temperatures.ts) - Daily Temperatures
- [016-car-fleet.ts](02-dsa-problems/medium/016-car-fleet.ts) - Car Fleet
- [017-search-a-2d-matrix.ts](02-dsa-problems/medium/017-search-a-2d-matrix.ts) - Search A 2D Matrix
- [018-koko-eating-bananas.ts](02-dsa-problems/medium/018-koko-eating-bananas.ts) - Koko Eating Bananas
- [019-find-minimum-in-rotated-sorted-array.ts](02-dsa-problems/medium/019-find-minimum-in-rotated-sorted-array.ts) - Find Minimum In Rotated Sorted Array
- [020-search-in-rotated-sorted-array.ts](02-dsa-problems/medium/020-search-in-rotated-sorted-array.ts) - Search In Rotated Sorted Array
- [021-time-based-key-value-store.ts](02-dsa-problems/medium/021-time-based-key-value-store.ts) - Time Based Key Value Store
- [022-reorder-list.ts](02-dsa-problems/medium/022-reorder-list.ts) - Reorder List
- [023-remove-nth-node-from-end.ts](02-dsa-problems/medium/023-remove-nth-node-from-end.ts) - Remove Nth Node From End
- [024-copy-list-with-random-pointer.ts](02-dsa-problems/medium/024-copy-list-with-random-pointer.ts) - Copy List With Random Pointer
- [025-add-two-numbers.ts](02-dsa-problems/medium/025-add-two-numbers.ts) - Add Two Numbers
- [026-find-the-duplicate-number.ts](02-dsa-problems/medium/026-find-the-duplicate-number.ts) - Find The Duplicate Number
- [027-lru-cache.ts](02-dsa-problems/medium/027-lru-cache.ts) - LRU Cache
- [028-lowest-common-ancestor-of-bst.ts](02-dsa-problems/medium/028-lowest-common-ancestor-of-bst.ts) - Lowest Common Ancestor Of BST
- [029-binary-tree-level-order-traversal.ts](02-dsa-problems/medium/029-binary-tree-level-order-traversal.ts) - Binary Tree Level Order Traversal
- [030-binary-tree-right-side-view.ts](02-dsa-problems/medium/030-binary-tree-right-side-view.ts) - Binary Tree Right Side View
- [031-count-good-nodes-in-binary-tree.ts](02-dsa-problems/medium/031-count-good-nodes-in-binary-tree.ts) - Count Good Nodes In Binary Tree
- [032-validate-binary-search-tree.ts](02-dsa-problems/medium/032-validate-binary-search-tree.ts) - Validate Binary Search Tree
- [033-kth-smallest-element-in-bst.ts](02-dsa-problems/medium/033-kth-smallest-element-in-bst.ts) - Kth Smallest Element In BST
- [034-construct-binary-tree-from-preorder-inorder.ts](02-dsa-problems/medium/034-construct-binary-tree-from-preorder-inorder.ts) - Construct Binary Tree From Preorder Inorder
- [035-k-closest-points-to-origin.ts](02-dsa-problems/medium/035-k-closest-points-to-origin.ts) - K Closest Points To Origin
- [036-kth-largest-element-in-array.ts](02-dsa-problems/medium/036-kth-largest-element-in-array.ts) - Kth Largest Element In Array
- [037-task-scheduler.ts](02-dsa-problems/medium/037-task-scheduler.ts) - Task Scheduler
- [038-design-twitter.ts](02-dsa-problems/medium/038-design-twitter.ts) - Design Twitter
- [039-subsets.ts](02-dsa-problems/medium/039-subsets.ts) - Subsets
- [040-combination-sum.ts](02-dsa-problems/medium/040-combination-sum.ts) - Combination Sum
- [041-combination-sum-ii.ts](02-dsa-problems/medium/041-combination-sum-ii.ts) - Combination Sum II
- [042-permutations.ts](02-dsa-problems/medium/042-permutations.ts) - Permutations
- [043-subsets-ii.ts](02-dsa-problems/medium/043-subsets-ii.ts) - Subsets II
- [044-generate-parentheses.ts](02-dsa-problems/medium/044-generate-parentheses.ts) - Generate Parentheses
- [045-word-search.ts](02-dsa-problems/medium/045-word-search.ts) - Word Search
- [046-palindrome-partitioning.ts](02-dsa-problems/medium/046-palindrome-partitioning.ts) - Palindrome Partitioning
- [047-letter-combinations-of-phone-number.ts](02-dsa-problems/medium/047-letter-combinations-of-phone-number.ts) - Letter Combinations Of Phone Number

#### Hard

- [001-trapping-rain-water.ts](02-dsa-problems/hard/001-trapping-rain-water.ts) - Trapping Rain Water
- [002-minimum-window-substring.ts](02-dsa-problems/hard/002-minimum-window-substring.ts) - Minimum Window Substring
- [003-sliding-window-maximum.ts](02-dsa-problems/hard/003-sliding-window-maximum.ts) - Sliding Window Maximum
- [004-largest-rectangle-in-histogram.ts](02-dsa-problems/hard/004-largest-rectangle-in-histogram.ts) - Largest Rectangle In Histogram
- [005-median-of-two-sorted-arrays.ts](02-dsa-problems/hard/005-median-of-two-sorted-arrays.ts) - Median Of Two Sorted Arrays
- [006-merge-k-sorted-lists.ts](02-dsa-problems/hard/006-merge-k-sorted-lists.ts) - Merge K Sorted Lists
- [007-reverse-nodes-in-k-group.ts](02-dsa-problems/hard/007-reverse-nodes-in-k-group.ts) - Reverse Nodes In K Group
- [008-binary-tree-maximum-path-sum.ts](02-dsa-problems/hard/008-binary-tree-maximum-path-sum.ts) - Binary Tree Maximum Path Sum
- [009-serialize-deserialize-binary-tree.ts](02-dsa-problems/hard/009-serialize-deserialize-binary-tree.ts) - Serialize Deserialize Binary Tree
- [010-find-median-from-data-stream.ts](02-dsa-problems/hard/010-find-median-from-data-stream.ts) - Find Median From Data Stream
- [011-n-queens.ts](02-dsa-problems/hard/011-n-queens.ts) - N Queens

### Design Patterns Index

#### Core Patterns (GoF)

- [01-factory-method.ts](03-design-patterns/core/01-factory-method.ts) - Factory Method
- [02-singleton.ts](03-design-patterns/core/02-singleton.ts) - Singleton
- [03-builder.ts](03-design-patterns/core/03-builder.ts) - Builder
- [04-prototype.ts](03-design-patterns/core/04-prototype.ts) - Prototype
- [05-adapter.ts](03-design-patterns/core/05-adapter.ts) - Adapter
- [06-decorator.ts](03-design-patterns/core/06-decorator.ts) - Decorator
- [07-facade.ts](03-design-patterns/core/07-facade.ts) - Facade
- [08-strategy.ts](03-design-patterns/core/08-strategy.ts) - Strategy
- [09-observer.ts](03-design-patterns/core/09-observer.ts) - Observer
- [10-state.ts](03-design-patterns/core/10-state.ts) - State

#### PoEAA Base Patterns

- [01-gateway.ts](03-design-patterns/poeaa/base/01-gateway.ts) - Gateway
- [02-registry.ts](03-design-patterns/poeaa/base/02-registry.ts) - Registry
- [03-value-object.ts](03-design-patterns/poeaa/base/03-value-object.ts) - Value Object

#### PoEAA Domain Logic Patterns

- [01-transaction-script.ts](03-design-patterns/poeaa/domain-logic/01-transaction-script.ts) - Transaction Script
- [02-table-module.ts](03-design-patterns/poeaa/domain-logic/02-table-module.ts) - Table Module
- [03-domain-model.ts](03-design-patterns/poeaa/domain-logic/03-domain-model.ts) - Domain Model
- [04-service-layer.ts](03-design-patterns/poeaa/domain-logic/04-service-layer.ts) - Service Layer

#### PoEAA Data Source Patterns

- [01-table-data-gateway.ts](03-design-patterns/poeaa/data-source/01-table-data-gateway.ts) - Table Data Gateway
- [02-row-data-gateway.ts](03-design-patterns/poeaa/data-source/02-row-data-gateway.ts) - Row Data Gateway
- [03-active-record.ts](03-design-patterns/poeaa/data-source/03-active-record.ts) - Active Record
- [04-data-mapper.ts](03-design-patterns/poeaa/data-source/04-data-mapper.ts) - Data Mapper

#### PoEAA Object-Relational Patterns

- [01-identity-map.ts](03-design-patterns/poeaa/object-relational/01-identity-map.ts) - Identity Map
- [02-lazy-load.ts](03-design-patterns/poeaa/object-relational/02-lazy-load.ts) - Lazy Load
- [03-unit-of-work.ts](03-design-patterns/poeaa/object-relational/03-unit-of-work.ts) - Unit Of Work
- [04-repository.ts](03-design-patterns/poeaa/object-relational/04-repository.ts) - Repository

#### PoEAA Web Presentation Patterns

- [01-page-controller.ts](03-design-patterns/poeaa/web-presentation/01-page-controller.ts) - Page Controller
- [02-front-controller.ts](03-design-patterns/poeaa/web-presentation/02-front-controller.ts) - Front Controller
- [03-mvc.ts](03-design-patterns/poeaa/web-presentation/03-mvc.ts) - MVC

#### PoEAA Distribution Patterns

- [01-dto.ts](03-design-patterns/poeaa/distribution/01-dto.ts) - DTO
- [02-remote-facade.ts](03-design-patterns/poeaa/distribution/02-remote-facade.ts) - Remote Facade

#### DDD Building Blocks

- [01-entity.ts](03-design-patterns/ddd/building-blocks/01-entity.ts) - Entity
- [02-value-object.ts](03-design-patterns/ddd/building-blocks/02-value-object.ts) - Value Object
- [03-aggregate.ts](03-design-patterns/ddd/building-blocks/03-aggregate.ts) - Aggregate
- [04-domain-event.ts](03-design-patterns/ddd/building-blocks/04-domain-event.ts) - Domain Event
- [05-domain-service.ts](03-design-patterns/ddd/building-blocks/05-domain-service.ts) - Domain Service
- [06-repository.ts](03-design-patterns/ddd/building-blocks/06-repository.ts) - Repository
- [07-factory.ts](03-design-patterns/ddd/building-blocks/07-factory.ts) - Factory
- [08-module.ts](03-design-patterns/ddd/building-blocks/08-module.ts) - Module

#### DDD Strategic Design

- [01-bounded-context.ts](03-design-patterns/ddd/strategic/01-bounded-context.ts) - Bounded Context
- [02-context-map.ts](03-design-patterns/ddd/strategic/02-context-map.ts) - Context Map
- [03-shared-kernel.ts](03-design-patterns/ddd/strategic/03-shared-kernel.ts) - Shared Kernel
- [04-customer-supplier.ts](03-design-patterns/ddd/strategic/04-customer-supplier.ts) - Customer Supplier
- [05-conformist.ts](03-design-patterns/ddd/strategic/05-conformist.ts) - Conformist
- [06-anticorruption-layer.ts](03-design-patterns/ddd/strategic/06-anticorruption-layer.ts) - Anticorruption Layer
- [07-open-host-service.ts](03-design-patterns/ddd/strategic/07-open-host-service.ts) - Open Host Service
- [08-published-language.ts](03-design-patterns/ddd/strategic/08-published-language.ts) - Published Language

#### DDD Supple Design

- [01-intention-revealing-interface.ts](03-design-patterns/ddd/supple-design/01-intention-revealing-interface.ts) - Intention Revealing Interface
- [02-side-effect-free-functions.ts](03-design-patterns/ddd/supple-design/02-side-effect-free-functions.ts) - Side Effect Free Functions
- [03-assertions.ts](03-design-patterns/ddd/supple-design/03-assertions.ts) - Assertions
- [04-standalone-classes.ts](03-design-patterns/ddd/supple-design/04-standalone-classes.ts) - Standalone Classes
- [05-specification.ts](03-design-patterns/ddd/supple-design/05-specification.ts) - Specification

#### Refactoring Basic

- [01-extract-function.ts](03-design-patterns/refactoring/basic/01-extract-function.ts) - Extract Function
- [02-inline-function.ts](03-design-patterns/refactoring/basic/02-inline-function.ts) - Inline Function
- [03-extract-variable.ts](03-design-patterns/refactoring/basic/03-extract-variable.ts) - Extract Variable
- [04-inline-variable.ts](03-design-patterns/refactoring/basic/04-inline-variable.ts) - Inline Variable
- [05-change-function-declaration.ts](03-design-patterns/refactoring/basic/05-change-function-declaration.ts) - Change Function Declaration
- [06-encapsulate-variable.ts](03-design-patterns/refactoring/basic/06-encapsulate-variable.ts) - Encapsulate Variable
- [07-rename-variable.ts](03-design-patterns/refactoring/basic/07-rename-variable.ts) - Rename Variable
- [08-introduce-parameter-object.ts](03-design-patterns/refactoring/basic/08-introduce-parameter-object.ts) - Introduce Parameter Object
- [09-combine-functions-into-class.ts](03-design-patterns/refactoring/basic/09-combine-functions-into-class.ts) - Combine Functions Into Class
- [10-combine-functions-into-transform.ts](03-design-patterns/refactoring/basic/10-combine-functions-into-transform.ts) - Combine Functions Into Transform
- [11-split-phase.ts](03-design-patterns/refactoring/basic/11-split-phase.ts) - Split Phase

#### Refactoring Encapsulation

- [01-encapsulate-record.ts](03-design-patterns/refactoring/encapsulation/01-encapsulate-record.ts) - Encapsulate Record
- [02-encapsulate-collection.ts](03-design-patterns/refactoring/encapsulation/02-encapsulate-collection.ts) - Encapsulate Collection
- [03-replace-primitive-with-object.ts](03-design-patterns/refactoring/encapsulation/03-replace-primitive-with-object.ts) - Replace Primitive With Object
- [04-replace-temp-with-query.ts](03-design-patterns/refactoring/encapsulation/04-replace-temp-with-query.ts) - Replace Temp With Query
- [05-extract-class.ts](03-design-patterns/refactoring/encapsulation/05-extract-class.ts) - Extract Class
- [06-inline-class.ts](03-design-patterns/refactoring/encapsulation/06-inline-class.ts) - Inline Class
- [07-hide-delegate.ts](03-design-patterns/refactoring/encapsulation/07-hide-delegate.ts) - Hide Delegate
- [08-remove-middle-man.ts](03-design-patterns/refactoring/encapsulation/08-remove-middle-man.ts) - Remove Middle Man
- [09-substitute-algorithm.ts](03-design-patterns/refactoring/encapsulation/09-substitute-algorithm.ts) - Substitute Algorithm

#### Refactoring Moving Features

- [01-move-function.ts](03-design-patterns/refactoring/moving-features/01-move-function.ts) - Move Function
- [02-move-field.ts](03-design-patterns/refactoring/moving-features/02-move-field.ts) - Move Field
- [03-move-statements-into-function.ts](03-design-patterns/refactoring/moving-features/03-move-statements-into-function.ts) - Move Statements Into Function
- [04-move-statements-to-callers.ts](03-design-patterns/refactoring/moving-features/04-move-statements-to-callers.ts) - Move Statements To Callers
- [05-replace-inline-code-with-function-call.ts](03-design-patterns/refactoring/moving-features/05-replace-inline-code-with-function-call.ts) - Replace Inline Code With Function Call
- [06-slide-statements.ts](03-design-patterns/refactoring/moving-features/06-slide-statements.ts) - Slide Statements
- [07-split-loop.ts](03-design-patterns/refactoring/moving-features/07-split-loop.ts) - Split Loop
- [08-replace-loop-with-pipeline.ts](03-design-patterns/refactoring/moving-features/08-replace-loop-with-pipeline.ts) - Replace Loop With Pipeline
- [09-remove-dead-code.ts](03-design-patterns/refactoring/moving-features/09-remove-dead-code.ts) - Remove Dead Code

#### Refactoring Organizing Data

- [01-split-variable.ts](03-design-patterns/refactoring/organizing-data/01-split-variable.ts) - Split Variable
- [02-rename-field.ts](03-design-patterns/refactoring/organizing-data/02-rename-field.ts) - Rename Field
- [03-replace-derived-variable-with-query.ts](03-design-patterns/refactoring/organizing-data/03-replace-derived-variable-with-query.ts) - Replace Derived Variable With Query
- [04-change-reference-to-value.ts](03-design-patterns/refactoring/organizing-data/04-change-reference-to-value.ts) - Change Reference To Value
- [05-change-value-to-reference.ts](03-design-patterns/refactoring/organizing-data/05-change-value-to-reference.ts) - Change Value To Reference

#### Refactoring Simplifying Conditional Logic

- [01-decompose-conditional.ts](03-design-patterns/refactoring/simplifying-conditional/01-decompose-conditional.ts) - Decompose Conditional
- [02-consolidate-conditional-expression.ts](03-design-patterns/refactoring/simplifying-conditional/02-consolidate-conditional-expression.ts) - Consolidate Conditional Expression
- [03-replace-nested-conditional-with-guard-clauses.ts](03-design-patterns/refactoring/simplifying-conditional/03-replace-nested-conditional-with-guard-clauses.ts) - Replace Nested Conditional With Guard Clauses
- [04-replace-conditional-with-polymorphism.ts](03-design-patterns/refactoring/simplifying-conditional/04-replace-conditional-with-polymorphism.ts) - Replace Conditional With Polymorphism
- [05-introduce-special-case.ts](03-design-patterns/refactoring/simplifying-conditional/05-introduce-special-case.ts) - Introduce Special Case
- [06-introduce-assertion.ts](03-design-patterns/refactoring/simplifying-conditional/06-introduce-assertion.ts) - Introduce Assertion

#### Refactoring APIs

- [01-separate-query-from-modifier.ts](03-design-patterns/refactoring/refactoring-apis/01-separate-query-from-modifier.ts) - Separate Query From Modifier
- [02-parameterize-function.ts](03-design-patterns/refactoring/refactoring-apis/02-parameterize-function.ts) - Parameterize Function
- [03-remove-flag-argument.ts](03-design-patterns/refactoring/refactoring-apis/03-remove-flag-argument.ts) - Remove Flag Argument
- [04-preserve-whole-object.ts](03-design-patterns/refactoring/refactoring-apis/04-preserve-whole-object.ts) - Preserve Whole Object
- [05-replace-parameter-with-query.ts](03-design-patterns/refactoring/refactoring-apis/05-replace-parameter-with-query.ts) - Replace Parameter With Query
- [06-replace-query-with-parameter.ts](03-design-patterns/refactoring/refactoring-apis/06-replace-query-with-parameter.ts) - Replace Query With Parameter
- [07-remove-setting-method.ts](03-design-patterns/refactoring/refactoring-apis/07-remove-setting-method.ts) - Remove Setting Method
- [08-replace-constructor-with-factory-function.ts](03-design-patterns/refactoring/refactoring-apis/08-replace-constructor-with-factory-function.ts) - Replace Constructor With Factory Function
- [09-replace-function-with-command.ts](03-design-patterns/refactoring/refactoring-apis/09-replace-function-with-command.ts) - Replace Function With Command
- [10-replace-command-with-function.ts](03-design-patterns/refactoring/refactoring-apis/10-replace-command-with-function.ts) - Replace Command With Function

#### Refactoring Inheritance

- [01-pull-up-method.ts](03-design-patterns/refactoring/inheritance/01-pull-up-method.ts) - Pull Up Method
- [02-pull-up-field.ts](03-design-patterns/refactoring/inheritance/02-pull-up-field.ts) - Pull Up Field
- [03-pull-up-constructor-body.ts](03-design-patterns/refactoring/inheritance/03-pull-up-constructor-body.ts) - Pull Up Constructor Body
- [04-push-down-method.ts](03-design-patterns/refactoring/inheritance/04-push-down-method.ts) - Push Down Method
- [05-push-down-field.ts](03-design-patterns/refactoring/inheritance/05-push-down-field.ts) - Push Down Field
- [06-replace-type-code-with-subclasses.ts](03-design-patterns/refactoring/inheritance/06-replace-type-code-with-subclasses.ts) - Replace Type Code With Subclasses
- [07-remove-subclass.ts](03-design-patterns/refactoring/inheritance/07-remove-subclass.ts) - Remove Subclass
- [08-extract-superclass.ts](03-design-patterns/refactoring/inheritance/08-extract-superclass.ts) - Extract Superclass
- [09-collapse-hierarchy.ts](03-design-patterns/refactoring/inheritance/09-collapse-hierarchy.ts) - Collapse Hierarchy
- [10-replace-subclass-with-delegate.ts](03-design-patterns/refactoring/inheritance/10-replace-subclass-with-delegate.ts) - Replace Subclass With Delegate
- [11-replace-superclass-with-delegate.ts](03-design-patterns/refactoring/inheritance/11-replace-superclass-with-delegate.ts) - Replace Superclass With Delegate

### Database And Distributed Systems Index

#### DDIA Foundations

- [01-reliable-scalable-maintainable.md](04-database-basics/ddia/foundations/01-reliable-scalable-maintainable.md)
- [02-data-models-query-languages.md](04-database-basics/ddia/foundations/02-data-models-query-languages.md)
- [03-storage-and-retrieval.md](04-database-basics/ddia/foundations/03-storage-and-retrieval.md)
- [04-encoding-and-evolution.md](04-database-basics/ddia/foundations/04-encoding-and-evolution.md)

#### DDIA Distributed Data

- [05-replication.md](04-database-basics/ddia/distributed-data/05-replication.md)
- [06-partitioning.md](04-database-basics/ddia/distributed-data/06-partitioning.md)
- [07-transactions.md](04-database-basics/ddia/distributed-data/07-transactions.md)
- [08-trouble-with-distributed-systems.md](04-database-basics/ddia/distributed-data/08-trouble-with-distributed-systems.md)
- [09-consistency-and-consensus.md](04-database-basics/ddia/distributed-data/09-consistency-and-consensus.md)

#### DDIA Derived Data

- [10-batch-processing.md](04-database-basics/ddia/derived-data/10-batch-processing.md)
- [11-stream-processing.md](04-database-basics/ddia/derived-data/11-stream-processing.md)
- [12-future-of-data-systems.md](04-database-basics/ddia/derived-data/12-future-of-data-systems.md)

### System Design Blueprints Index

- [01-todo-app.md](05-system-design/01-todo-app.md)
- [02-trading-app.md](05-system-design/02-trading-app.md)
- [03-e2b-sandbox.md](05-system-design/03-e2b-sandbox.md)
- [04-lovable-clone.md](05-system-design/04-lovable-clone.md)
- [05-codeforces-clone.md](05-system-design/05-codeforces-clone.md)
- [06-replit-clone.md](05-system-design/06-replit-clone.md)
- [07-cloudflare-workers-runtime.md](05-system-design/07-cloudflare-workers-runtime.md)
- [08-agent-framework.md](05-system-design/08-agent-framework.md)
- [09-rl-finetuning.md](05-system-design/09-rl-finetuning.md)
- [10-devin.md](05-system-design/10-devin.md)
- [11-memory-framework.md](05-system-design/11-memory-framework.md)
- [12-dex-amm.md](05-system-design/12-dex-amm.md)
- [13-cex.md](05-system-design/13-cex.md)
- [14-wallet.md](05-system-design/14-wallet.md)
- [15-prediction-market.md](05-system-design/15-prediction-market.md)
- [16-staking-escrow-frontend.md](05-system-design/16-staking-escrow-frontend.md)

### System Design Fundamentals Index

- [README.md](06-system-design-fundamental/README.md)
- [01-ssltls_explained.md](06-system-design-fundamental/01-ssltls_explained.md)
- [02-role_based_access_control_rbac.md](06-system-design-fundamental/02-role_based_access_control_rbac.md)
- [03-secrets_management.md](06-system-design-fundamental/03-secrets_management.md)
- [04-saml_explained.md](06-system-design-fundamental/04-saml_explained.md)
- [05-three_pillars_of_observability.md](06-system-design-fundamental/05-three_pillars_of_observability.md)
- [06-log_aggregation.md](06-system-design-fundamental/06-log_aggregation.md)
- [07-logging_best_practices.md](06-system-design-fundamental/07-logging_best_practices.md)
- [08-correlation_ids.md](06-system-design-fundamental/08-correlation_ids.md)
- [09-metrics_instrumentation.md](06-system-design-fundamental/09-metrics_instrumentation.md)
- [10-alert_monitoring.md](06-system-design-fundamental/10-alert_monitoring.md)
- [11-dashboards_runbooks.md](06-system-design-fundamental/11-dashboards_runbooks.md)
- [12-distributed_tracing.md](06-system-design-fundamental/12-distributed_tracing.md)
- [13-batch_vs_stream_processing.md](06-system-design-fundamental/13-batch_vs_stream_processing.md)
- [14-mapreduce.md](06-system-design-fundamental/14-mapreduce.md)
- [15-etl_pipelines.md](06-system-design-fundamental/15-etl_pipelines.md)
- [16-data_lakes.md](06-system-design-fundamental/16-data_lakes.md)
- [17-data_warehousing.md](06-system-design-fundamental/17-data_warehousing.md)
- [18-data_lakehouse.md](06-system-design-fundamental/18-data_lakehouse.md)
- [19-lambda_architecture.md](06-system-design-fundamental/19-lambda_architecture.md)
- [20-kappa_architecture.md](06-system-design-fundamental/20-kappa_architecture.md)
- [21-streaming_engines.md](06-system-design-fundamental/21-streaming_engines.md)
- [22-service_discovery.md](06-system-design-fundamental/22-service_discovery.md)
- [23-api_gateway_pattern.md](06-system-design-fundamental/23-api_gateway_pattern.md)
- [24-backend_for_frontend_bff.md](06-system-design-fundamental/24-backend_for_frontend_bff.md)
- [25-sidecar_pattern.md](06-system-design-fundamental/25-sidecar_pattern.md)
- [26-circuit_breaker_pattern.md](06-system-design-fundamental/26-circuit_breaker_pattern.md)
- [27-bulkhead_pattern.md](06-system-design-fundamental/27-bulkhead_pattern.md)
- [28-strangler_fig_pattern.md](06-system-design-fundamental/28-strangler_fig_pattern.md)
- [29-service_mesh.md](06-system-design-fundamental/29-service_mesh.md)
- [30-client_server_architecture.md](06-system-design-fundamental/30-client_server_architecture.md)
- [31-monolithic_architecture.md](06-system-design-fundamental/31-monolithic_architecture.md)
- [32-microservices_architecture.md](06-system-design-fundamental/32-microservices_architecture.md)
- [33-serverless_architecture.md](06-system-design-fundamental/33-serverless_architecture.md)
- [34-event_driven_architecture.md](06-system-design-fundamental/34-event_driven_architecture.md)
- [35-cqrs_command_query_responsibility_segregation.md](06-system-design-fundamental/35-cqrs_command_query_responsibility_segregation.md)
- [36-event_sourcing.md](06-system-design-fundamental/36-event_sourcing.md)
- [37-peer_to_peer_p2p_architecture.md](06-system-design-fundamental/37-peer_to_peer_p2p_architecture.md)
- [38-geohash_explained.md](06-system-design-fundamental/38-geohash_explained.md)
- [39-quad_tree.md](06-system-design-fundamental/39-quad_tree.md)
- [40-r_tree.md](06-system-design-fundamental/40-r_tree.md)
- [41-skip_lists.md](06-system-design-fundamental/41-skip_lists.md)
- [42-merkle_trees_explained.md](06-system-design-fundamental/42-merkle_trees_explained.md)
- [43-hyperloglog.md](06-system-design-fundamental/43-hyperloglog.md)
- [44-count_min_sketch.md](06-system-design-fundamental/44-count_min_sketch.md)
- [45-the_problem_with_distributed_transactions.md](06-system-design-fundamental/45-the_problem_with_distributed_transactions.md)
- [46-two_phase_commit_2pc.md](06-system-design-fundamental/46-two_phase_commit_2pc.md)
- [47-three_phase_commit_3pc.md](06-system-design-fundamental/47-three_phase_commit_3pc.md)
- [48-saga_pattern.md](06-system-design-fundamental/48-saga_pattern.md)
- [49-outbox_pattern.md](06-system-design-fundamental/49-outbox_pattern.md)
- [50-challenges_of_distribution.md](06-system-design-fundamental/50-challenges_of_distribution.md)
- [51-network_partitions.md](06-system-design-fundamental/51-network_partitions.md)
- [52-split_brain_problem.md](06-system-design-fundamental/52-split_brain_problem.md)
- [53-heartbeats.md](06-system-design-fundamental/53-heartbeats.md)
- [54-handling_failures_in_distributed_systems.md](06-system-design-fundamental/54-handling_failures_in_distributed_systems.md)
- [55-the_clock_synchronization_problem.md](06-system-design-fundamental/55-the_clock_synchronization_problem.md)
- [56-logical_clocks.md](06-system-design-fundamental/56-logical_clocks.md)
- [57-lamport_timestamps.md](06-system-design-fundamental/57-lamport_timestamps.md)
- [58-vector_clocks.md](06-system-design-fundamental/58-vector_clocks.md)
- [59-consensus_algorithms_overview.md](06-system-design-fundamental/59-consensus_algorithms_overview.md)
- [60-paxos_algorithm.md](06-system-design-fundamental/60-paxos_algorithm.md)
- [61-raft_algorithm.md](06-system-design-fundamental/61-raft_algorithm.md)
- [62-leader_election.md](06-system-design-fundamental/62-leader_election.md)
- [63-gossip_protocol.md](06-system-design-fundamental/63-gossip_protocol.md)
- [64-vertical_vs_horizontal_scaling.md](06-system-design-fundamental/64-vertical_vs_horizontal_scaling.md)

### System Design Interview Basics Index

- [01-introduction_to_system_design_interviews.md](07-system-design-interview-basics/01-introduction_to_system_design_interviews.md)
- [02-types_of_system_design_questions.md](07-system-design-interview-basics/02-types_of_system_design_questions.md)
- [03-expectations_by_experience_level.md](07-system-design-interview-basics/03-expectations_by_experience_level.md)

### System Design Interview Index

- [01-design-calendar-system.md](08-system-design-interview/01-design-calendar-system.md)
- [02-design-google-docs.md](08-system-design-interview/02-design-google-docs.md)

### Low-Level Design Interview Basics Index

- [01-what_is_low_level_design_lld.md](09-low-level-design-interview-basics/01-what_is_low_level_design_lld.md)
- [02-lld_vs_hld.md](09-low-level-design-interview-basics/02-lld_vs_hld.md)

### Low-Level Design Interview Index

- [01-design-parking-lot.md](10-low-level-design-interview/01-design-parking-lot.md)
- [02-design-notification-system.md](10-low-level-design-interview/02-design-notification-system.md)
- [03-design-search-autocomplete.md](10-low-level-design-interview/03-design-search-autocomplete.md)
- [03-design-search-autocomplete.ts](10-low-level-design-interview/03-design-search-autocomplete.ts)

### Claude Architect Foundations Index

- [claude-certified-architect-foundations-certification-exam-guide.md](11-claude-architect/claude-certified-architect-foundations-certification-exam-guide.md)
- [topic-1.1-design-and-implement-agentic-loops-for-autonomous-task-execution.md](11-claude-architect/topic-1.1-design-and-implement-agentic-loops-for-autonomous-task-execution.md)
- [topic-1.2-orchestrate-multi-agent-systems-with-coordinator-subagent-patterns.md](11-claude-architect/topic-1.2-orchestrate-multi-agent-systems-with-coordinator-subagent-patterns.md)
- [topic-1.3-configure-subagent-invocation-context-passing-and-spawning.md](11-claude-architect/topic-1.3-configure-subagent-invocation-context-passing-and-spawning.md)
- [topic-1.4-implement-multi-step-workflows-with-enforcement-and-handoff-patterns.md](11-claude-architect/topic-1.4-implement-multi-step-workflows-with-enforcement-and-handoff-patterns.md)
- [topic-1.5-apply-agent-sdk-hooks-for-tool-call-interception-and-data-normalization.md](11-claude-architect/topic-1.5-apply-agent-sdk-hooks-for-tool-call-interception-and-data-normalization.md)
- [topic-1.6-design-task-decomposition-strategies-for-complex-workflows.md](11-claude-architect/topic-1.6-design-task-decomposition-strategies-for-complex-workflows.md)
- [topic-1.7-manage-session-state-resumption-and-forking.md](11-claude-architect/topic-1.7-manage-session-state-resumption-and-forking.md)
- [topic-2.1-design-effective-tool-interfaces-with-clear-descriptions-and-boundaries.md](11-claude-architect/topic-2.1-design-effective-tool-interfaces-with-clear-descriptions-and-boundaries.md)

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- `npm` available locally

### Install

```bash
npm install
```

### Run TypeScript Files Directly

```bash
npx ts-node 03-design-patterns/core/01-factory-method.ts
npx ts-node 02-dsa-problems/medium/001-group-anagrams.ts
npx ts-node 02-dsa-problems/core/001-dynamic-array.ts
npx ts-node 10-low-level-design-interview/03-design-search-autocomplete.ts
```

### Type Check

```bash
npx tsc --noEmit
```

## Project Conventions

- TypeScript is configured with `strict: true`, `target: ES2020`, and `module: CommonJS`
- DSA files use 3-digit numeric prefixes such as `001-two-sum.ts`
- Design pattern and project documents use 2-digit prefixes such as `01-factory-method.ts` and `01-todo-app.md`
- `11-claude-architect/` topic notes use `topic-<domain>.<task>-<slug>.md`
- Most Markdown folders use ASCII diagrams and structured sections instead of loose notes

## Where To Start

- If you want coding practice, start with [02-dsa-problems](02-dsa-problems/)
- If you want reusable engineering patterns, start with [03-design-patterns](03-design-patterns/)
- If you want architecture depth, read [06-system-design-fundamental](06-system-design-fundamental/) before jumping into [05-system-design](05-system-design/)
- If you are preparing for interviews, use `07` through `10` in order from basics to case studies
- If you want Claude certification prep, start with [11-claude-architect](11-claude-architect/) and begin with the exam guide
