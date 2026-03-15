// ============================================
// Design Search Autocomplete System
// ============================================
// A Trie-based autocomplete system with configurable ranking strategies.
// Supports inserting words, prefix search, and customizable result ranking.

// ============================================
// Data Classes
// ============================================

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

// ============================================
// Trie Class
// ============================================

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

// ============================================
// Ranking Strategy Classes (Strategy Pattern)
// ============================================

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

// ============================================
// AutocompleteSystem Class
// ============================================

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

// ============================================
// Demo
// ============================================

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
