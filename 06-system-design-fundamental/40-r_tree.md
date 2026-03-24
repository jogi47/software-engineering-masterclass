# R-Tree

[← Back to Index](README.md)

Imagine you are building a map-heavy product such as a logistics dashboard, property search platform, or geofencing service. Users draw viewports, search by area, and expect the system to find all overlapping regions quickly.

Without a spatial index, teams often start with a flat scan over every bounding box:

```typescript
type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ServiceRegion = {
  id: string;
  bounds: BoundingBox;
};

class NaiveRegionIndex {
  constructor(private readonly regions: ServiceRegion[]) {}

  findIntersectingRegions(query: BoundingBox): ServiceRegion[] {
    return this.regions.filter((region) => {
      return !(
        region.bounds.maxX < query.minX ||
        region.bounds.minX > query.maxX ||
        region.bounds.maxY < query.minY ||
        region.bounds.minY > query.maxY
      );
    });
  }
}
```

That works at small scale, but it degrades quickly:
- every query touches too many objects
- one-dimensional indexes on `minX`, `maxX`, `minY`, or `maxY` do not model rectangle overlap well
- larger shapes and dense city-center data produce many false candidates
- the system spends time checking objects that were obviously far away

This is where **R-trees** come in. An R-tree organizes rectangles hierarchically so the system can skip large irrelevant regions and inspect only branches whose bounding boxes intersect the query.

In this chapter, you will learn:
  * [Why R-trees exist](#1-why-r-trees-exist)
  * [What an R-tree is](#2-what-an-r-tree-is)
  * [Which core terms matter](#3-core-structure-and-terminology)
  * [How search, insertion, and splitting work](#4-how-search-insertion-and-splitting-work)
  * [Which query patterns matter in practice](#5-common-query-patterns)
  * [Which variants and design choices you should know](#6-variants-and-design-choices)
  * [How R-trees compare with related approaches](#7-r-tree-vs-related-spatial-approaches)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use an R-tree and which pitfalls matter](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why R-Trees Exist

R-trees exist because many important queries are about **regions**, not just points.

Common examples:
- find all delivery zones intersecting the current map viewport
- find all roads crossing this tile
- find all polygons containing a given point
- find all shapes that might collide with this object

### The Core Problem

A rectangle-overlap query is fundamentally multi-dimensional.

You do not just care about:
- `x`
- `y`
- or one sortable key

You care about whether two areas intersect in space.

```text
Query rectangle
      │
      ▼
┌─────────────────────────┐
│ check every object box  │
│ one by one              │
└─────────────────────────┘
      │
      └── wasted work for objects far outside the query area
```

If you store shapes in one flat collection:
- every spatial query tends toward a broad scan
- query cost rises with total object count
- latency becomes harder to predict under dense spatial workloads

### Why a Plain B-Tree Is Not Enough

A B-tree is excellent for one-dimensional ordering such as:
- user IDs
- timestamps
- prices
- lexicographically sortable prefixes

It is much less natural for:
- rectangle intersection
- polygon containment
- overlap-heavy map data

You can add indexes on multiple columns, but a set of ordinary scalar indexes still does not give you a native model for "which regions overlap this region?"

### Why a Uniform Grid Is Not Always Enough

Uniform grids are often a strong baseline, but they force one cell size everywhere.

That creates a compromise:
- large cells increase false positives
- tiny cells create too many mostly empty buckets
- large objects may span many cells

R-trees help when the workload contains:
- rectangles of varying size
- dense hotspots and sparse outskirts
- overlapping shapes

### What R-Trees Optimize For

R-trees usually help with:
- pruning large irrelevant regions using bounding boxes
- handling rectangles and area-like objects more naturally than point-only structures
- supporting range, overlap, and candidate-generation queries
- reducing the number of exact geometry checks you need to run

### What They Do Not Automatically Solve

R-trees do not automatically give you:
- exact polygon correctness by themselves
- route-aware distance
- perfect nearest-neighbor ranking without extra logic
- zero overlap between branches
- good performance under every data distribution


# 2. What an R-Tree Is

An R-tree is a hierarchical spatial index built from **minimum bounding rectangles**.

### A Conservative Definition

The durable idea is:

```text
R-tree =
  tree of bounding rectangles
  + leaf entries that point to real objects
  + internal entries that point to child nodes
  + search that follows only intersecting rectangles
```

Each node covers a region large enough to contain all entries beneath it.

### The Bounding-Box Mental Model

Think of it as a tree of nested envelopes:

```text
root envelope
├── child envelope A
│   ├── object box A1
│   ├── object box A2
│   └── object box A3
└── child envelope B
    ├── object box B1
    └── object box B2
```

When a query rectangle does not intersect `child envelope B`, the whole branch under `B` can be skipped.

### Leaf Entries and Internal Entries

An R-tree normally stores:
- **leaf entries**: bounding box + pointer to object or row
- **internal entries**: bounding box + pointer to child node

This is what makes it useful for spatial search:
- upper levels summarize space coarsely
- lower levels refine the candidate set

### Why Rectangles Are Central

R-trees are built around rectangles because rectangles are cheap to:
- compare for overlap
- expand
- combine
- use as coarse approximations of more complex geometry

Even if your real object is:
- a polygon
- a route segment
- a geofence
- a building footprint

the tree can often index its bounding rectangle first, then defer exact geometry to a later step.

### Balanced but Not Perfectly Partitioned

Classic R-tree designs are typically height-balanced, which keeps leaf nodes at the same depth. That helps keep lookup cost more predictable.

At the same time, R-trees do **not** partition space into perfectly disjoint regions the way some tree structures do. Child rectangles may overlap.

That overlap is both:
- a strength, because it handles irregular shapes flexibly
- a cost, because some queries must traverse more than one branch

### What an R-Tree Is Not

An R-tree is usually not:
- a geometry engine by itself
- proof that every query will visit only one path
- the best structure for every point-only workload
- a substitute for exact distance or exact polygon logic


# 3. Core Structure and Terminology

Most R-tree discussions become much easier once a few recurring terms are clear.

### 1. Minimum Bounding Rectangle

The **minimum bounding rectangle** (MBR) is the smallest axis-aligned rectangle that fully contains an object or a child subtree.

```text
Polygon or route segment
        inside
┌────────────────────┐
│       object       │
│    /¯¯¯\___        │
│   /        \       │
│   \___  ___/       │
│       \/           │
└────────────────────┘
        MBR
```

You will also see it called:
- bounding box
- bounding rectangle
- envelope

### 2. Leaf Node

A leaf node stores entries for actual indexed objects.

Example leaf entry:

```text
leaf entry =
  object MBR
  + object reference
```

### 3. Internal Node

An internal node stores entries that point to child nodes.

Each internal entry contains:
- a child node pointer
- the MBR covering everything inside that child

### 4. Fanout or Node Capacity

Each node can hold only some number of entries.

This capacity matters because it affects:
- tree height
- split frequency
- node size on disk or in memory
- pruning granularity

Higher capacity:
- fewer levels
- coarser bounding boxes

Lower capacity:
- more levels
- potentially tighter local grouping

### 5. Overlap

Overlap means two sibling rectangles intersect.

```text
Sibling overlap:

┌───────────────┐
│   Child A     │
│   ┌───────┐   │
│   │ A ∩ B │   │
│   └───────┘   │
└───────┬───────┘
        │
    ┌───┴──────────┐
    │   Child B    │
    └──────────────┘
```

Overlap is important because a query intersecting the shared area may need to visit both children.

### 6. Area Enlargement

When inserting a new object, many R-tree algorithms choose the child whose MBR needs the smallest enlargement.

This is a practical heuristic:
- smaller enlargement often preserves tighter grouping
- tighter grouping often improves pruning later

It is a heuristic, not a universal guarantee.

### 7. Split Heuristic

When a node overflows, the tree must split its entries into multiple groups.

A good split usually tries to reduce some combination of:
- total area
- overlap
- wasted empty space

Different R-tree variants make different trade-offs here.

### 8. Condense or Reinsert Strategy

Deletions and updates can leave the tree poorly packed.

Implementations often need some strategy to:
- condense underfull nodes
- reinsert entries
- rebuild periodically

That is one reason production R-tree implementations are more subtle than the basic concept suggests.


# 4. How Search, Insertion, and Splitting Work

The main operations are easier to understand if you think in terms of bounding boxes rather than exact geometry.

### Search: Follow Only Relevant Branches

For a range or overlap query:
1. start at the root
2. ignore child entries whose MBR does not intersect the query
3. recurse into child entries whose MBR does intersect
4. at leaves, return candidate objects whose MBR intersects the query
5. if needed, run exact geometry checks afterward

```text
Range query flow:

query box
   │
   ▼
root
├── child A intersects query  -> visit
├── child B no intersection   -> prune
└── child C intersects query  -> visit
```

### Why Search May Visit Multiple Branches

Unlike a B-tree lookup on one ordered key, an R-tree search may need several branches.

```text
root
├── child A box
│   └── overlaps center
└── child B box
    └── also overlaps center

query in center
  -> visit A
  -> visit B
```

That is normal. The goal is not "one path only." The goal is "far fewer objects than a full scan."

### Insertion: Choose a Child Conservatively

A common insertion flow is:
1. start at the root
2. choose the child that needs the least bounding-box enlargement
3. descend until a leaf
4. add the new entry
5. update ancestor MBRs on the way back up

If several children look similar, implementations may break ties using:
- smaller area
- less overlap increase
- fewer entries

### Overflow: Split the Node

When a node exceeds capacity, it must split.

The hard part is that there is no perfect split for every workload.

A split heuristic tries to create groups whose MBRs are:
- not too large
- not too overlapping
- not too sparse

```text
Before split:
  one crowded node with many entries

After split:
  node group A          node group B
  tighter MBR           tighter MBR
```

### Deletion and Update

Deletion is usually more involved than "remove one entry."

Why:
- a node may become underfull
- ancestor MBRs may need shrinking
- the tree may become less well packed over time

Many practical systems use one of these approaches:
- true dynamic insert/delete with a well-tested library or database engine
- periodic rebuild for mostly-read workloads
- batch bulk loading after ingest windows

### A Small Heuristic in TypeScript

The choose-subtree idea is easier to see in code than in prose:

```typescript
type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function area(box: BoundingBox): number {
  return Math.max(0, box.maxX - box.minX) * Math.max(0, box.maxY - box.minY);
}

function unionBox(left: BoundingBox, right: BoundingBox): BoundingBox {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  };
}

function enlargementCost(existing: BoundingBox, candidate: BoundingBox): number {
  return area(unionBox(existing, candidate)) - area(existing);
}
```

That does not implement a full R-tree by itself. It shows the durable idea:
- compare how much each child would grow
- prefer the child whose summary rectangle expands least


# 5. Common Query Patterns

R-trees are most useful when they act as a **candidate pruning layer**.

### 1. Rectangle Intersection

This is the most direct use case.

Examples:
- map viewport search
- "find parcels overlapping this area"
- "find cameras covering this coordinate window"

```text
query viewport
     │
     ▼
R-tree returns candidate boxes
     │
     └── often enough to answer directly if the objects are rectangles
```

### 2. Point-in-Polygon Candidate Filtering

If the real question is:
- which service zone contains this point
- which district polygon contains this user

the R-tree typically indexes polygon MBRs first.

Then the read path becomes:
1. search the tree using a point-sized query box
2. get candidate polygons whose MBR contains that point
3. run exact point-in-polygon checks

This is a very common and durable pattern.

### 3. Viewport Rendering and Map Tiling

Map-like systems often need:
- only the objects visible in the current viewport
- only features intersecting a tile
- only assets in the currently loaded region

R-trees help by pruning off-screen branches quickly.

### 4. Broad-Phase Collision or Overlap Detection

In simulation, editors, and spatial analytics, you often want:
- a cheap first pass that finds possible collisions
- a second pass that confirms exact overlap

The R-tree helps with the first pass.

### 5. Nearest-Neighbor Search

R-trees can support nearest-neighbor style search, but this is more subtle than rectangle intersection.

The usual pattern is:
- prioritize branches whose bounding boxes are closest to the target
- keep a current best distance
- prune branches whose minimum possible distance is already worse

This can work well, but it is not as conceptually simple as range search.

### 6. Spatial Join Candidate Generation

If you have two sets of shapes and want to find overlaps:
- build or use an index on one side
- scan the other side
- query candidates per object
- run exact overlap or containment logic afterward

This pattern appears in:
- geospatial analytics
- geofencing pipelines
- map data enrichment

### Conservative Read-Path Rule

Use the R-tree for:
- candidate reduction
- branch pruning
- coarse overlap logic

Use exact geometry or business rules for:
- final correctness
- ranking
- edge-case handling


# 6. Variants and Design Choices

The term "R-tree" is often used loosely. In practice, you will encounter a small family of related designs.

### Classic R-Tree

The classic R-tree introduces the basic mechanics:
- bounding rectangles
- balanced height
- dynamic insertion
- split heuristics

It establishes the mental model, but later variants often improve behavior under overlap-heavy workloads.

### R+-Tree

The R+-tree tries to reduce overlap between internal nodes, often by allowing an object to be represented in more than one branch when necessary.

Potential benefit:
- less branch overlap during search

Potential trade-off:
- duplicated entries
- more complicated updates

### R*-Tree

R*-tree style designs usually try to improve node quality by paying more attention to:
- overlap
- margin
- area growth
- reinsertion strategy

In practice, many engineers encounter R*-tree ideas through libraries or database features rather than by implementing the algorithm themselves.

### Packed or Bulk-Loaded R-Tree

If the dataset is mostly static or rebuilt in batches, a packed R-tree can be attractive.

Typical pattern:
- sort entries by spatial order
- group them into leaves
- build upper levels from grouped leaves

This often improves query behavior for read-heavy snapshots because nearby entries start out clustered more tightly.

### Dynamic vs Read-Optimized Design

```text
Dynamic tree:
  optimize for ongoing inserts and deletes

Packed tree:
  optimize for read-heavy snapshots and periodic rebuilds
```

That choice matters more than the textbook name alone.

### Node Capacity and Page Size

Capacity tuning is workload-dependent.

You usually care about:
- how many entries fit naturally in one memory page or disk page
- whether boxes become too coarse at high fanout
- whether the tree gets too deep at low fanout

There is no universal best value.

### Bounding Strategy Matters

What you choose to index can change behavior dramatically.

Examples:
- index a polygon's exact bounding box
- index a route segment's bounding box
- index a moving object's recent footprint rather than one point

Good bounding boxes make the tree tighter.
Loose bounding boxes increase false positives.

### Availability Depends on the Tooling

Many databases and libraries expose spatial indexing, but the exact implementation details vary.

The durable rule is:
- reason from capabilities and performance
- do not assume every engine labeled "spatial" behaves identically


# 7. R-Tree vs Related Spatial Approaches

R-trees are useful, but they are only one option in the spatial indexing toolbox.

### R-Tree vs B-Tree

B-trees are stronger for:
- one-dimensional ordering
- exact key lookup
- prefix or range scans on sortable scalar values

R-trees are stronger for:
- rectangle intersection
- area overlap
- hierarchical bounding-box pruning

### R-Tree vs Geohash

Geohash usually fits:
- point-based storage keys
- prefix filtering
- coarse nearby search

R-trees usually fit:
- rectangles or polygons
- viewport overlap queries
- in-memory or engine-level bounding-box traversal

You can combine them:
- geohash for coarse regional partitioning
- R-tree inside a region or inside the database engine for finer pruning

### R-Tree vs Quad Tree

Quad trees split space into fixed quadrants recursively.

They are often attractive when:
- the workload is explicitly two-dimensional
- objects are mostly points
- in-memory spatial partitioning is the main need

R-trees are often stronger when:
- objects are rectangles or irregular shapes
- overlap queries matter more than point bucketing
- you want the hierarchy to follow grouped object bounds instead of fixed geometric quadrants

### R-Tree vs k-d Tree

k-d trees are often a good fit for:
- point datasets
- nearest-neighbor style search
- axis-alternating partitioning

R-trees are often a better conceptual fit for:
- region objects
- rectangle intersection
- bounding-box summaries over arbitrary shapes

### R-Tree vs Native Spatial Database Features

This comparison needs careful wording.

Many database engines expose spatial indexing through:
- R-tree-family structures
- engine-specific generalized index frameworks
- geometry-aware operators layered on top of lower-level index structures

For example:
- PostgreSQL with PostGIS commonly exposes spatial search through geometry operators and GiST-backed indexing
- SQLite exposes a dedicated R*Tree module for rectangle-style indexing

For most application engineers, the important question is not:
- "Does this engine use the pure textbook algorithm?"

It is:
- "Can the engine prune candidates efficiently for the spatial predicates I actually need?"

### Comparison Table

```text
┌──────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Approach             │ Strength                     │ Main Trade-off               │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ R-tree               │ Rectangle and polygon        │ Overlap between branches can │
│                      │ candidate pruning            │ increase search work         │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ B-tree               │ One-dimensional ordering     │ Not a natural overlap index  │
│                      │ and range scans              │ for regions                  │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Geohash              │ Prefix-friendly coarse       │ Best for points; boundary    │
│                      │ geographic grouping          │ effects need care            │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Quad tree            │ Adaptive 2D point pruning    │ Less natural for large       │
│                      │ and viewport search          │ overlapping rectangles       │
├──────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ k-d tree             │ Useful for point partition   │ Region overlap is not its    │
│                      │ and some nearest queries     │ primary design target        │
└──────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

### Conservative Selection Rule

Use an R-tree when:
- your workload is about overlapping regions, boxes, or shapes
- you need bounding-box pruning more than scalar ordering
- exact geometry checks are too expensive to run on every object

Look beyond an R-tree when:
- the workload is mostly point-only and a simpler structure works
- storage keys and prefix grouping matter more than region overlap
- the database already provides spatial features that fit the workload directly


# 8. Practical TypeScript Patterns

The most useful application-level pattern is:
- store or derive bounding boxes
- build an R-tree from those boxes
- query candidates by intersection
- finish with exact geometry logic when needed

### Example 1: A Packed, Query-Oriented R-Tree

This example keeps the implementation conservative:
- read-optimized
- bulk-loaded
- useful for snapshots and periodic rebuilds

```typescript
type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type RTreeEntry<T> = {
  box: BoundingBox;
  value: T;
};

type RTreeLeaf<T> = {
  kind: "leaf";
  box: BoundingBox;
  entries: RTreeEntry<T>[];
};

type RTreeInternal<T> = {
  kind: "internal";
  box: BoundingBox;
  children: RTreeNode<T>[];
};

type RTreeNode<T> = RTreeLeaf<T> | RTreeInternal<T>;

function intersects(left: BoundingBox, right: BoundingBox): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

function unionBoxes(boxes: readonly BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    throw new Error("At least one box is required.");
  }

  return boxes.reduce((merged, box) => ({
    minX: Math.min(merged.minX, box.minX),
    minY: Math.min(merged.minY, box.minY),
    maxX: Math.max(merged.maxX, box.maxX),
    maxY: Math.max(merged.maxY, box.maxY),
  }));
}

function sortBySpatialOrder<T extends { box: BoundingBox }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    return (
      left.box.minX - right.box.minX ||
      left.box.minY - right.box.minY ||
      left.box.maxX - right.box.maxX ||
      left.box.maxY - right.box.maxY
    );
  });
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("Chunk size must be positive.");
  }

  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push([...items.slice(index, index + size)]);
  }

  return result;
}

function buildLeaf<T>(entries: readonly RTreeEntry<T>[]): RTreeLeaf<T> {
  return {
    kind: "leaf",
    box: unionBoxes(entries.map((entry) => entry.box)),
    entries: [...entries],
  };
}

function buildInternal<T>(children: readonly RTreeNode<T>[]): RTreeInternal<T> {
  return {
    kind: "internal",
    box: unionBoxes(children.map((child) => child.box)),
    children: [...children],
  };
}

function bulkLoadRTree<T>(
  entries: readonly RTreeEntry<T>[],
  maxEntries = 8,
): RTreeNode<T> | null {
  if (entries.length === 0) {
    return null;
  }

  if (maxEntries < 2) {
    throw new Error("maxEntries must be at least 2.");
  }

  let level: RTreeNode<T>[] = chunk(sortBySpatialOrder(entries), maxEntries).map(buildLeaf);

  while (level.length > 1) {
    level = chunk(sortBySpatialOrder(level), maxEntries).map(buildInternal);
  }

  return level[0];
}

function searchRTree<T>(
  node: RTreeNode<T> | null,
  query: BoundingBox,
  result: RTreeEntry<T>[] = [],
): RTreeEntry<T>[] {
  if (node === null || !intersects(node.box, query)) {
    return result;
  }

  if (node.kind === "leaf") {
    for (const entry of node.entries) {
      if (intersects(entry.box, query)) {
        result.push(entry);
      }
    }

    return result;
  }

  for (const child of node.children) {
    if (intersects(child.box, query)) {
      searchRTree(child, query, result);
    }
  }

  return result;
}
```

This example intentionally avoids fully dynamic insert and delete logic. For many application workloads, a packed snapshot plus rebuild is simpler and more reliable.

### Example 2: Candidate Pruning Before Exact Point-in-Polygon

```typescript
type Point = {
  x: number;
  y: number;
};

type DeliveryZone = {
  id: string;
  polygon: Point[];
  isActive: boolean;
};

function polygonBounds(points: readonly Point[]): BoundingBox {
  if (points.length === 0) {
    throw new Error("Polygon must contain at least one point.");
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const crossesVerticalRange =
      (currentPoint.y > point.y) !== (previousPoint.y > point.y);

    if (!crossesVerticalRange) {
      continue;
    }

    const slope =
      (previousPoint.x - currentPoint.x) /
      (previousPoint.y - currentPoint.y);
    const rayIntersectionX =
      currentPoint.x + (point.y - currentPoint.y) * slope;

    if (point.x < rayIntersectionX) {
      inside = !inside;
    }
  }

  return inside;
}

class DeliveryZoneIndex {
  private readonly tree: RTreeNode<DeliveryZone> | null;

  constructor(zones: readonly DeliveryZone[]) {
    this.tree = bulkLoadRTree(
      zones.map((zone) => ({
        box: polygonBounds(zone.polygon),
        value: zone,
      })),
      16,
    );
  }

  findZonesContaining(point: Point): DeliveryZone[] {
    const pointBox: BoundingBox = {
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    };

    return searchRTree(this.tree, pointBox)
      .map((entry) => entry.value)
      .filter((zone) => zone.isActive)
      .filter((zone) => pointInPolygon(point, zone.polygon));
  }
}
```

This is one of the most durable R-tree patterns:
- use bounding boxes for fast candidate reduction
- use exact geometry for final correctness

### Example 3: Rebuild a Mutable Snapshot

For moving or frequently updated objects, a periodic rebuild can be easier to reason about than a homegrown dynamic R-tree.

```typescript
type AssetEnvelope = {
  id: string;
  box: BoundingBox;
  status: "ACTIVE" | "INACTIVE";
  updatedAtEpochMs: number;
};

class AssetSpatialIndex {
  private readonly latestById = new Map<string, AssetEnvelope>();
  private currentTree: RTreeNode<AssetEnvelope> | null = null;

  upsert(envelope: AssetEnvelope): void {
    this.latestById.set(envelope.id, envelope);
  }

  rebuild(maxEntries = 16): void {
    const entries: RTreeEntry<AssetEnvelope>[] = [...this.latestById.values()].map(
      (value) => ({
        box: value.box,
        value,
      }),
    );

    this.currentTree = bulkLoadRTree(entries, maxEntries);
  }

  findIntersectingAssets(viewport: BoundingBox): AssetEnvelope[] {
    return searchRTree(this.currentTree, viewport)
      .map((entry) => entry.value)
      .filter((asset) => asset.status === "ACTIVE");
  }
}
```

This pattern often works well when:
- updates arrive continuously
- read latency matters more than per-update mutation efficiency
- a slight indexing delay is acceptable


# 9. When to Use It and Common Pitfalls

R-trees are a strong fit when their pruning value is high and their maintenance cost is acceptable.

### Good Fit

R-trees are often a good fit when:
- objects are rectangles, polygons, route segments, or other area-like shapes
- overlap or containment queries dominate
- exact geometry on every object would be too expensive
- you want a database or in-memory structure that prunes by bounding region

### Weak Fit

R-trees are often a weak fit when:
- the workload is simple point lookup and a lighter structure already works
- data changes so rapidly that custom tree maintenance dominates
- bounding boxes are extremely loose and create too many false positives
- native spatial tooling already solves the problem more directly

### Pitfall 1: Treating Bounding Boxes as Final Truth

Bad:
- assume MBR overlap means the real shapes overlap

Better:
- treat MBR overlap as a coarse candidate test
- run exact geometry or business logic afterward

### Pitfall 2: Ignoring Branch Overlap

Bad assumption:
- "The tree will always follow one branch."

Reality:
- overlapping sibling MBRs are normal
- dense or poorly split trees can force multi-branch traversal

### Pitfall 3: Building Loose Bounding Boxes

If your indexed boxes are much larger than the real shapes:
- pruning quality drops
- candidate sets grow
- query latency becomes less predictable

### Pitfall 4: Reimplementing a Fully Dynamic R-Tree Too Quickly

The concept is simple. A robust mutable implementation is not.

Be careful with:
- split heuristics
- underflow handling
- reinsertion logic
- concurrency
- persistent storage layout

If the workload allows it, a rebuild-based design can be much easier to operate.

### Pitfall 5: Using Geographic Coordinates Carelessly

Latitude and longitude are not a flat plane.

For large geographic regions, you may need:
- a proper spatial database
- a suitable projection or engine-native geometry type
- extra care around wraparound and regional distortion

For smaller local regions, projected planar coordinates are often easier to reason about.

### Pitfall 6: Choosing the Structure Because It Sounds Canonical

Bad:
- "We have maps, so we must need an R-tree."

Better:
- "We have expensive region-overlap queries, and bounding-box pruning gives measured value."

### Good vs Bad Design Direction

```text
Bad:
  "The R-tree solves geometry by itself."

Good:
  "The R-tree narrows the search space, and exact geometry confirms
   the final answer."
```

### A Practical Real-World Rule

If your database already provides spatial predicates and indexing:
- start there
- measure actual query plans and candidate counts
- move custom in-memory indexing into the application only when you have a clear reason

If your workload is mostly application-memory spatial filtering:
- start with a simple, explainable R-tree or snapshot rebuild pattern
- test with realistic object sizes and distributions


# 10. Summary

**Why R-trees exist:**
- they reduce the cost of multi-dimensional overlap queries by pruning large irrelevant regions
- they model rectangles and area-like objects more naturally than ordinary scalar indexes

**What R-trees change:**
- the dataset becomes organized as a hierarchy of bounding rectangles
- query cost depends more on intersecting branches than on total object count
- box quality, overlap, node capacity, and update strategy become explicit design choices

**What they do well:**
- support viewport, intersection, containment-candidate, and broad-phase overlap queries
- work well as a coarse filter before exact geometry or ranking logic
- fit both engine-level spatial indexing and application-level snapshot indexes

**What they do not guarantee by themselves:**
- they do not replace exact polygon, path, or distance logic
- they do not eliminate overlapping branches
- they are not automatically the best choice for every point-only or high-churn workload

**Practical design advice:**
- think of the R-tree as a bounding-box pruning layer, not a full geometry solver
- keep indexed boxes as tight as practical
- choose between dynamic mutation and periodic rebuild based on the write pattern
- measure candidate-set size and overlap, not just raw tree depth

**Implementation checklist:**

```text
Fit and scope:
  □ Confirm that the workload is dominated by region overlap, containment candidates, or viewport filtering
  □ Verify that bounding-box pruning adds value beyond a flat scan, grid, or simpler point structure
  □ Decide whether the application really needs a custom tree or should use database-native spatial features

Data modeling:
  □ Define a clear bounding-box representation and keep raw geometry as the source of truth
  □ Use tight boxes for polygons, routes, or footprints so false positives stay manageable
  □ Choose node capacity or page-size assumptions based on real object counts and query behavior

Query design:
  □ Implement reliable rectangle intersection predicates
  □ Use the R-tree to generate candidates, then apply exact geometry or business rules
  □ Test viewport, overlap, and point-in-polygon read paths with realistic dense data

Write and maintenance strategy:
  □ Choose between dynamic insert/delete, bulk loading, or periodic rebuild
  □ Validate how splits, underflow, and updates affect overlap and candidate counts over time
  □ Measure query latency, rebuild cost, and branch overlap under production-like distributions

Operations and evolution:
  □ Monitor false-positive rate, hot regions, and tree quality as the dataset changes
  □ Revisit the structure if object shapes, density, or update rate change materially
  □ Prefer durable, measurable behavior over textbook purity when selecting a spatial index
```
