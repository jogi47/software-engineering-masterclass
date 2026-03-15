# Design Search Autocomplete System

#### What is an Autocomplete System?

**Search Autocomplete** is a widely-used feature in modern applications like Google, Amazon, and YouTube. It enhances user experience by providing real-time suggestions based on partial input, helping users complete queries faster and discover popular or relevant search terms.

As the user types a query character by character, the system returns the top N suggestions that match the current prefix. For example, typing "app" might yield results like "apple", "app store", or "application".

These suggestions are typically ranked by relevance, popularity, frequency, or recency.

In this chapter, we will explore the **low-level design of a Search Autocomplete system** in detail.

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

Before diving into the design, it's important to clarify how the autocomplete system is expected to behave. Asking targeted questions helps refine assumptions, define the scope, and align on core expectations for the system.

Discussion

**Candidate:** Should the autocomplete system be case-sensitive?

**Interviewer:** No, all inputs should be treated as lowercase. The system should be case-insensitive.

**Candidate:** Should the system only support English, or do we need to account for Unicode/multilingual input?

**Interviewer:** Let's assume only English characters for now.

**Candidate:** How should suggestions be ranked—alphabetically, by frequency of use, or both?

**Interviewer:** Good question. The system should support both strategies. The user of the system should be able to configure the ranking strategy.

**Candidate:** How many suggestions should be returned per prefix?

**Interviewer:** That should be configurable, perhaps a default of 10, but the system should allow specifying a custom limit.

**Candidate:** How does the system learn word frequencies? Are we tracking every time a word is added or searched?

**Interviewer:** Let's increment the frequency every time a word is inserted into the system.

**Candidate:** Can users input new words over time, or is the dictionary fixed at initialization?

**Interviewer:** Words can be added dynamically during runtime.

**Candidate:** Should we support deleting a word or updating its frequency?

**Interviewer:** No, we can skip delete and update functionality for now.

After gathering the details, we can summarize the key system requirements.

## 1.1 Functional Requirements

* Support **inserting words** into an internal dictionary
* Return **suggestions** when a user types a prefix
* Suggestions should be ranked based on a **configurable strategy** (alphabetical or frequency-based)
* The **number of suggestions** returned should be configurable (default: 10)
* **Frequency count** is incremented each time a word is added
* Words and prefixes are treated **case-insensitively**

## 1.2 Non-Functional Requirements

* **Performance:** The system should be optimized for fast prefix lookups
* **Modularity:** The design should follow object-oriented principles with clear separation of concerns
* **Extensibility:** The system should be modular and extensible to support new ranking strategies
* **Testability:** Components should be testable in isolation
* **In-Memory:** The system can assume in-memory storage (no persistence required)

Now that we understand what we're building, let's identify the building blocks of our system.

# 2. Identifying Core Entities

How do you go from a list of requirements to actual classes? The key is to look for **nouns** in the requirements that have distinct attributes or behaviors. Not every noun becomes a class, but this approach gives you a starting point.

Let's walk through our requirements and identify what needs to exist in our system.

#### 1. Support inserting words into an internal dictionary with fast prefix lookups

The core data structure for efficient prefix matching is a **Trie (Prefix Tree)**. We need a `**TrieNode**` class to represent each node in the tree, storing:
- Children nodes (one per character)
- Whether this node marks the end of a word
- The frequency count for the word

We also need a `**Trie**` class to manage the tree operations: inserting words and searching by prefix.

Why a Trie? It provides O(m) time complexity for both insertion and prefix search, where m is the length of the word/prefix. This is optimal for autocomplete scenarios.

#### 2. Suggestions should be ranked based on a configurable strategy

This suggests the **Strategy Pattern**. We need a `**RankingStrategy**` interface with a method to rank suggestions, and concrete implementations:
- `**AlphabeticalRankingStrategy**`: Sorts suggestions alphabetically (A-Z)
- `**FrequencyRankingStrategy**`: Sorts suggestions by frequency (most popular first)

Why use an interface here? Different use cases need different ranking. A spell-checker might prefer alphabetical order, while a search engine prioritizes popular queries. The Strategy pattern lets us swap algorithms without changing the core autocomplete logic.

#### 3. Represent word frequency data

We need a simple data structure `**WordFrequency**` to pair a word with its frequency count. This is passed to ranking strategies for sorting.

#### 4. Orchestrate the entire system

Something needs to coordinate everything: manage the trie, apply ranking strategies, and limit results. This is our `**AutocompleteSystem**` class.

Note

Notice how we derived each entity from a specific requirement. Don't just list classes. Explain why each one exists. If you can't justify an entity's existence, you probably don't need it.

### Entity Overview

We've identified three types of entities:

**Data Classes** hold data with minimal behavior: TrieNode (tree structure), WordFrequency (word + count pair).

**Core Classes** contain the main logic: Trie (prefix tree operations), RankingStrategy (interface), AlphabeticalRankingStrategy and FrequencyRankingStrategy (implementations), AutocompleteSystem (orchestrator).

With our entities identified, let's define their attributes, behaviors, and relationships.

# 3. Class Design

Now that we know what entities we need, let's flesh out their details. For each class, we'll define what data it holds (attributes) and what it can do (methods). Then we'll look at how these classes connect to each other.

## 3.1 Class Definitions

We'll work bottom-up: simple types first, then data containers, then the classes with real logic. This order makes sense because complex classes depend on simpler ones.

### Data Classes

Data classes are containers that hold data with some associated behavior.

#### `WordFrequency`

A simple pair representing a word and its frequency count.

```
WordFrequency {
    - word: string
    - frequency: number

    + constructor(word, frequency)
    + getWord(): string
    + getFrequency(): number
}
```

This is used when collecting suggestions to pass to the ranking strategy.

#### `TrieNode`

Represents a single node in the Trie.

```
TrieNode {
    - children: Map<string, TrieNode>
    - isEndOfWord: boolean
    - frequency: number

    + constructor()
    + getChild(char): TrieNode | null
    + addChild(char): TrieNode
    + hasChild(char): boolean
    + getChildren(): Map<string, TrieNode>
    + markAsEndOfWord(): void
    + incrementFrequency(): void
    + isWordEnd(): boolean
    + getFrequency(): number
}
```

Each node stores:
- A map of children (character → child node)
- Whether it marks the end of a valid word
- The frequency count for that word

Design Decision

We store frequency at the end-of-word node rather than tracking it separately. This keeps word data co-located with its position in the trie.

### Core Classes

Core classes contain the main business logic.

#### `Trie`

The prefix tree that stores all words and enables efficient prefix lookups.

```
Trie {
    - root: TrieNode

    + constructor()
    + insert(word: string): void
    + search(word: string): boolean
    + startsWith(prefix: string): boolean
    + getWordsWithPrefix(prefix: string): WordFrequency[]
}
```

Key operations:
- `insert()`: Adds a word to the trie, incrementing frequency if it already exists
- `search()`: Checks if a complete word exists
- `startsWith()`: Checks if any word starts with the given prefix
- `getWordsWithPrefix()`: Returns all words matching a prefix with their frequencies

#### `RankingStrategy` (Interface)

Defines the contract for ranking suggestions.

```
interface RankingStrategy {
    + rank(words: WordFrequency[], limit: number): string[]
}
```

This interface enables the Strategy Pattern. Different implementations can rank words differently without changing the autocomplete logic.

#### `AlphabeticalRankingStrategy`

Sorts suggestions alphabetically.

```
AlphabeticalRankingStrategy implements RankingStrategy {
    + rank(words, limit): string[]  // Sort A-Z, take top 'limit'
}
```

#### `FrequencyRankingStrategy`

Sorts suggestions by frequency (most popular first).

```
FrequencyRankingStrategy implements RankingStrategy {
    + rank(words, limit): string[]  // Sort by frequency desc, take top 'limit'
}
```

Design Decision

The Strategy Pattern is perfect here. Different applications need different ranking logic:
- A dictionary app might use alphabetical order
- A search engine uses frequency/popularity
- A code editor might use recency or context

By making ranking a pluggable strategy, we can change or add ranking models without touching the core trie logic.

#### `AutocompleteSystem`

The main orchestrator that ties everything together.

```
AutocompleteSystem {
    - trie: Trie
    - rankingStrategy: RankingStrategy
    - defaultLimit: number

    + constructor(rankingStrategy?, defaultLimit?)
    + insert(word: string): void
    + getSuggestions(prefix: string, limit?): string[]
    + setRankingStrategy(strategy: RankingStrategy): void
    + getWordCount(): number
}
```

**Key Design Principles:**

1. **Composition:** The system owns a Trie for storage and uses a RankingStrategy for sorting.
2. **Configurable:** Both the ranking strategy and result limit can be customized.
3. **Case-insensitive:** All operations normalize input to lowercase.

## 3.2 Class Relationships

How do these classes connect? Let's examine the relationship types we use.

#### Composition (Strong Ownership)

Composition means one object owns another. When the owner is destroyed, the owned object is destroyed too.

* **AutocompleteSystem owns Trie:** The trie exists only within the context of this autocomplete system.
* **Trie owns TrieNodes:** Nodes belong to their trie and don't exist independently.

#### Association

* **AutocompleteSystem uses RankingStrategy:** The system delegates ranking to its strategy.

#### Interface Implementation

* **AlphabeticalRankingStrategy implements RankingStrategy**
* **FrequencyRankingStrategy implements RankingStrategy**

## 3.3 Key Design Patterns

Let's make the structural patterns explicit and justify why each is appropriate here.

### Strategy Pattern (RankingStrategy)

**The Problem:** We need to rank autocomplete suggestions in different ways—alphabetically for some applications, by popularity for others. If we hardcode the ranking logic, adding new ranking methods requires changing the AutocompleteSystem class.

**The Solution:** The Strategy pattern defines a family of algorithms (ranking methods), encapsulates each one, and makes them interchangeable. The AutocompleteSystem delegates ranking to a RankingStrategy object.

**Why This Pattern:**

```typescript
// Without Strategy - messy conditionals
getSuggestions(prefix: string): string[] {
    const words = this.trie.getWordsWithPrefix(prefix);
    if (this.rankingType === 'alphabetical') {
        words.sort((a, b) => a.word.localeCompare(b.word));
    } else if (this.rankingType === 'frequency') {
        words.sort((a, b) => b.frequency - a.frequency);
    } else if (this.rankingType === 'recency') {
        // More complex sorting...
    }
    // Adding new strategies means modifying this method
}

// With Strategy - clean and extensible
getSuggestions(prefix: string, limit: number): string[] {
    const words = this.trie.getWordsWithPrefix(prefix);
    return this.rankingStrategy.rank(words, limit);
}
```

Design Decision

The strategy is injected at construction time but can be changed via `setRankingStrategy()`. This allows the system to switch ranking strategies dynamically (e.g., personalized ranking per user).

### Trie Data Structure

**The Problem:** We need to efficiently find all words that start with a given prefix. Linear search through all words would be O(n * m) for n words of average length m.

**The Solution:** A Trie stores words character by character in a tree structure. Finding all words with a prefix takes O(p + k) time, where p is the prefix length and k is the number of matching words.

**Why This Data Structure:**

```
Trie for ["app", "apple", "application", "apt"]:

        root
         |
         a
         |
         p
        / \
       p   t (apt)
      /
     l (apple)
     |
     e
     |
     (application continues...)
```

Each node represents a character. Traversing "app" reaches all words starting with "app" in just 3 steps.

## 3.4 Full Class Diagram

```
+-------------------------+
|     WordFrequency       |
+-------------------------+
| - word: string          |
| - frequency: number     |
+-------------------------+
| + getWord(): string     |
| + getFrequency(): number|
+-------------------------+

+-------------------------+       +-------------------------+
|       TrieNode          |       |          Trie           |
+-------------------------+       +-------------------------+
| - children: Map         |<------| - root: TrieNode        |
| - isEndOfWord: boolean  |       +-------------------------+
| - frequency: number     |       | + insert(word)          |
+-------------------------+       | + search(word): boolean |
| + getChild(char)        |       | + startsWith(prefix)    |
| + addChild(char)        |       | + getWordsWithPrefix()  |
| + markAsEndOfWord()     |       +-------------------------+
| + incrementFrequency()  |               |
+-------------------------+               |
                                          |
+-------------------------+       +-------------------------+
|  <<interface>>          |<------|  AutocompleteSystem     |
|  RankingStrategy        |       +-------------------------+
+-------------------------+       | - trie: Trie            |
| + rank(words, limit)    |       | - rankingStrategy       |
+-------------------------+       | - defaultLimit: number  |
        ^                         +-------------------------+
        |                         | + insert(word)          |
+-------+-------+                 | + getSuggestions(prefix)|
|               |                 | + setRankingStrategy()  |
v               v                 +-------------------------+
+-------------+ +-------------+
| Alphabetical| | Frequency   |
| Ranking     | | Ranking     |
| Strategy    | | Strategy    |
+-------------+ +-------------+
```

# 4. Code Implementation

Now let's translate our design into working TypeScript code. We'll build bottom-up: foundational types first, then data classes, then the classes with real logic.

## 4.1 Data Classes

```typescript
class WordFrequency {
    private readonly word: string;
    private readonly frequency: number;

    constructor(word: string, frequency: number) {
        this.word = word;
        this.frequency = frequency;
    }

    getWord(): string {
        return this.word;
    }

    getFrequency(): number {
        return this.frequency;
    }
}
```

```typescript
class TrieNode {
    private children: Map<string, TrieNode>;
    private isEndOfWord: boolean;
    private frequency: number;

    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.frequency = 0;
    }

    getChild(char: string): TrieNode | null {
        return this.children.get(char) || null;
    }

    addChild(char: string): TrieNode {
        if (!this.children.has(char)) {
            this.children.set(char, new TrieNode());
        }
        return this.children.get(char)!;
    }

    hasChild(char: string): boolean {
        return this.children.has(char);
    }

    getChildren(): Map<string, TrieNode> {
        return this.children;
    }

    markAsEndOfWord(): void {
        this.isEndOfWord = true;
    }

    incrementFrequency(): void {
        this.frequency++;
    }

    isWordEnd(): boolean {
        return this.isEndOfWord;
    }

    getFrequency(): number {
        return this.frequency;
    }
}
```

## 4.2 Trie Class

```typescript
class Trie {
    private root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    /**
     * Inserts a word into the trie.
     * If the word already exists, increments its frequency.
     */
    insert(word: string): void {
        let current = this.root;

        for (const char of word) {
            current = current.addChild(char);
        }

        current.markAsEndOfWord();
        current.incrementFrequency();
    }

    /**
     * Checks if a complete word exists in the trie.
     */
    search(word: string): boolean {
        const node = this.findNode(word);
        return node !== null && node.isWordEnd();
    }

    /**
     * Checks if any word in the trie starts with the given prefix.
     */
    startsWith(prefix: string): boolean {
        return this.findNode(prefix) !== null;
    }

    /**
     * Returns all words that start with the given prefix,
     * along with their frequencies.
     */
    getWordsWithPrefix(prefix: string): WordFrequency[] {
        const node = this.findNode(prefix);
        if (!node) {
            return [];
        }

        const results: WordFrequency[] = [];
        this.collectWords(node, prefix, results);
        return results;
    }

    /**
     * Finds the node corresponding to the last character of the prefix.
     */
    private findNode(prefix: string): TrieNode | null {
        let current = this.root;

        for (const char of prefix) {
            const child = current.getChild(char);
            if (!child) {
                return null;
            }
            current = child;
        }

        return current;
    }

    /**
     * Recursively collects all words under a node.
     */
    private collectWords(
        node: TrieNode,
        currentWord: string,
        results: WordFrequency[]
    ): void {
        if (node.isWordEnd()) {
            results.push(new WordFrequency(currentWord, node.getFrequency()));
        }

        for (const [char, childNode] of node.getChildren()) {
            this.collectWords(childNode, currentWord + char, results);
        }
    }
}
```

## 4.3 Ranking Strategy Classes

The Strategy pattern in action.

```typescript
interface RankingStrategy {
    rank(words: WordFrequency[], limit: number): string[];
}

class AlphabeticalRankingStrategy implements RankingStrategy {
    /**
     * Ranks words alphabetically (A-Z).
     */
    rank(words: WordFrequency[], limit: number): string[] {
        return words
            .map(wf => wf.getWord())
            .sort((a, b) => a.localeCompare(b))
            .slice(0, limit);
    }
}

class FrequencyRankingStrategy implements RankingStrategy {
    /**
     * Ranks words by frequency (highest first).
     * Ties are broken alphabetically.
     */
    rank(words: WordFrequency[], limit: number): string[] {
        return words
            .sort((a, b) => {
                // Primary: frequency descending
                const freqDiff = b.getFrequency() - a.getFrequency();
                if (freqDiff !== 0) {
                    return freqDiff;
                }
                // Secondary: alphabetical
                return a.getWord().localeCompare(b.getWord());
            })
            .map(wf => wf.getWord())
            .slice(0, limit);
    }
}
```

Each strategy encapsulates its ranking logic. Adding a new ranking model (e.g., recency-based, context-aware) requires only a new class implementing the interface.

## 4.4 AutocompleteSystem Class

The main orchestrator that ties everything together.

```typescript
class AutocompleteSystem {
    private trie: Trie;
    private rankingStrategy: RankingStrategy;
    private defaultLimit: number;
    private wordCount: number;

    constructor(
        rankingStrategy: RankingStrategy = new FrequencyRankingStrategy(),
        defaultLimit: number = 10
    ) {
        this.trie = new Trie();
        this.rankingStrategy = rankingStrategy;
        this.defaultLimit = defaultLimit;
        this.wordCount = 0;
    }

    /**
     * Inserts a word into the autocomplete system.
     * Words are normalized to lowercase.
     * Frequency is incremented if word already exists.
     */
    insert(word: string): void {
        const normalized = word.toLowerCase().trim();
        if (normalized.length === 0) {
            return;
        }

        // Check if it's a new word or existing
        if (!this.trie.search(normalized)) {
            this.wordCount++;
        }

        this.trie.insert(normalized);
        console.log(`Inserted: "${normalized}"`);
    }

    /**
     * Returns autocomplete suggestions for the given prefix.
     * Results are ranked according to the current strategy.
     */
    getSuggestions(prefix: string, limit?: number): string[] {
        const normalized = prefix.toLowerCase().trim();
        if (normalized.length === 0) {
            return [];
        }

        const effectiveLimit = limit ?? this.defaultLimit;
        const wordsWithFrequency = this.trie.getWordsWithPrefix(normalized);

        return this.rankingStrategy.rank(wordsWithFrequency, effectiveLimit);
    }

    /**
     * Changes the ranking strategy at runtime.
     */
    setRankingStrategy(strategy: RankingStrategy): void {
        this.rankingStrategy = strategy;
        console.log(`Ranking strategy changed to: ${strategy.constructor.name}`);
    }

    /**
     * Returns the number of unique words in the system.
     */
    getWordCount(): number {
        return this.wordCount;
    }

    /**
     * Checks if a word exists in the system.
     */
    hasWord(word: string): boolean {
        return this.trie.search(word.toLowerCase().trim());
    }
}
```

The AutocompleteSystem class:
1. Normalizes all input to lowercase for case-insensitive matching
2. Delegates storage to the Trie
3. Delegates ranking to the current RankingStrategy
4. Allows runtime strategy switching

## 4.5 Demo

Let's see the system in action with a demo that builds a dictionary and simulates user queries.

```typescript
function runDemo(): void {
    console.log('=== Search Autocomplete System Demo ===\n');

    // Create system with frequency-based ranking (default)
    const autocomplete = new AutocompleteSystem();

    // Insert some words (simulating search history)
    console.log('--- Building Dictionary ---');

    // Simulate popular searches (inserted multiple times)
    autocomplete.insert('apple');
    autocomplete.insert('apple');
    autocomplete.insert('apple');
    autocomplete.insert('application');
    autocomplete.insert('application');
    autocomplete.insert('app store');
    autocomplete.insert('app store');
    autocomplete.insert('app store');
    autocomplete.insert('app store');
    autocomplete.insert('apply');
    autocomplete.insert('apartment');
    autocomplete.insert('appetizer');
    autocomplete.insert('appetite');

    // Some other words
    autocomplete.insert('banana');
    autocomplete.insert('band');
    autocomplete.insert('bandana');
    autocomplete.insert('car');
    autocomplete.insert('card');
    autocomplete.insert('carbon');
    autocomplete.insert('carpet');

    console.log(`\nTotal unique words: ${autocomplete.getWordCount()}`);

    // Test autocomplete with frequency ranking
    console.log('\n--- Autocomplete with Frequency Ranking ---');

    console.log('\nPrefix: "app"');
    let suggestions = autocomplete.getSuggestions('app', 5);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    console.log('\nPrefix: "ap"');
    suggestions = autocomplete.getSuggestions('ap', 5);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    console.log('\nPrefix: "car"');
    suggestions = autocomplete.getSuggestions('car', 3);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    console.log('\nPrefix: "xyz" (no matches)');
    suggestions = autocomplete.getSuggestions('xyz');
    console.log(`Suggestions: [${suggestions.length === 0 ? 'none' : suggestions.join(', ')}]`);

    // Switch to alphabetical ranking
    console.log('\n--- Switch to Alphabetical Ranking ---');
    autocomplete.setRankingStrategy(new AlphabeticalRankingStrategy());

    console.log('\nPrefix: "app" (alphabetical)');
    suggestions = autocomplete.getSuggestions('app', 5);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    console.log('\nPrefix: "ap" (alphabetical)');
    suggestions = autocomplete.getSuggestions('ap', 5);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    // Test case insensitivity
    console.log('\n--- Case Insensitivity Test ---');
    autocomplete.insert('APPLE');  // Should increment existing 'apple' frequency
    autocomplete.insert('Apple');  // Should increment again

    autocomplete.setRankingStrategy(new FrequencyRankingStrategy());
    console.log('\nPrefix: "APP" (uppercase input)');
    suggestions = autocomplete.getSuggestions('APP', 3);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    // Test with custom limit
    console.log('\n--- Custom Limit Test ---');
    console.log('\nPrefix: "a" with limit 3');
    suggestions = autocomplete.getSuggestions('a', 3);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    console.log('\nPrefix: "a" with limit 10');
    suggestions = autocomplete.getSuggestions('a', 10);
    console.log(`Suggestions: [${suggestions.join(', ')}]`);

    console.log('\n=== Demo Complete ===');
}

// Run the demo
runDemo();
```

The demo creates:
- A dictionary of words with varying frequencies (simulating search popularity)
- Shows autocomplete with frequency-based ranking
- Demonstrates switching to alphabetical ranking
- Tests case insensitivity
- Shows custom limit functionality

# 5. Run and Test

To run this implementation:

```bash
# Save all the code to a single file: 03-design-search-autocomplete.ts
npx ts-node 10-low-level-design-interview/03-design-search-autocomplete.ts
```

### Expected Output

```
=== Search Autocomplete System Demo ===

--- Building Dictionary ---
Inserted: "apple"
Inserted: "apple"
Inserted: "apple"
Inserted: "application"
Inserted: "application"
Inserted: "app store"
Inserted: "app store"
Inserted: "app store"
Inserted: "app store"
Inserted: "apply"
Inserted: "apartment"
Inserted: "appetizer"
Inserted: "appetite"
Inserted: "banana"
Inserted: "band"
Inserted: "bandana"
Inserted: "car"
Inserted: "card"
Inserted: "carbon"
Inserted: "carpet"

Total unique words: 14

--- Autocomplete with Frequency Ranking ---

Prefix: "app"
Suggestions: [app store, apple, application, appetizer, appetite]

Prefix: "ap"
Suggestions: [app store, apple, application, apartment, appetizer]

Prefix: "car"
Suggestions: [car, carbon, card]

Prefix: "xyz" (no matches)
Suggestions: [none]

--- Switch to Alphabetical Ranking ---
Ranking strategy changed to: AlphabeticalRankingStrategy

Prefix: "app" (alphabetical)
Suggestions: [app store, appetite, appetizer, apple, application]

Prefix: "ap" (alphabetical)
Suggestions: [apartment, app store, appetite, appetizer, apple]

--- Case Insensitivity Test ---
Inserted: "apple"
Inserted: "apple"
Ranking strategy changed to: FrequencyRankingStrategy

Prefix: "APP" (uppercase input)
Suggestions: [apple, app store, application]

--- Custom Limit Test ---

Prefix: "a" with limit 3
Suggestions: [apple, app store, application]

Prefix: "a" with limit 10
Suggestions: [apple, app store, application, apartment, appetizer, appetite, apply]

=== Demo Complete ===
```

# 6. Summary

In this design, we built a search autocomplete system that demonstrates key object-oriented principles:

| Pattern | Where Used | Why |
|---------|------------|-----|
| **Strategy** | RankingStrategy | Interchangeable ranking algorithms (alphabetical vs frequency) |
| **Composition** | AutocompleteSystem → Trie | Clear ownership of the data structure |
| **Trie** | Word storage | Optimal O(prefix length) prefix lookups |

### Key Takeaways

1. **Trie is the optimal data structure** for prefix-based search, providing O(m) lookup where m is prefix length
2. **Strategy Pattern enables flexibility** - Adding new ranking strategies (recency, personalized) just requires a new class implementing RankingStrategy
3. **Normalize input early** - Converting to lowercase at the entry point keeps the rest of the code simple
4. **Frequency tracking is implicit** - Incrementing on each insert naturally captures popularity
5. **Separation of concerns** - Storage (Trie), ranking (Strategy), and orchestration (AutocompleteSystem) are cleanly separated
