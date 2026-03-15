# Low-Level Design Interview

This folder contains full low-level design interview case studies. These are more applied than the basics folder: they focus on requirements clarification, object modeling, class relationships, and implementation choices.

## What Is Here

| Problem | Markdown | Code | Notes |
| --- | --- | --- | --- |
| Parking Lot | [01-design-parking-lot.md](01-design-parking-lot.md) | Not present | Object modeling and allocation rules |
| Notification System | [02-design-notification-system.md](02-design-notification-system.md) | Not present | Delivery abstraction and extensibility |
| Search Autocomplete | [03-design-search-autocomplete.md](03-design-search-autocomplete.md) | [03-design-search-autocomplete.ts](03-design-search-autocomplete.ts) | Trie-oriented design with runnable TypeScript |

## How To Use This Folder

- Read the Markdown first to understand the design reasoning.
- If a matching `.ts` file exists, run it to inspect the implementation shape.
- Treat these as interview answers: simple, defensible models are preferred over maximal abstraction.

## Run The Available Implementation

```bash
npx ts-node 10-low-level-design-interview/03-design-search-autocomplete.ts
```

## Reading Order

1. [01-design-parking-lot.md](01-design-parking-lot.md)
2. [02-design-notification-system.md](02-design-notification-system.md)
3. [03-design-search-autocomplete.md](03-design-search-autocomplete.md)
