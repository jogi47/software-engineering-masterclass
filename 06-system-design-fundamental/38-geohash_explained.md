# Geohash Explained

[← Back to Index](README.md)

Imagine you are building a ride-hailing or food-delivery platform. A user opens the app, shares their location, and expects to see nearby drivers or restaurants almost immediately.

Without a spatial indexing strategy, teams often start with a brute-force scan over every candidate location and compute exact distance for all of them:

```typescript
type Driver = {
  id: string;
  latitude: number;
  longitude: number;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
};

class DriverLocator {
  constructor(private readonly drivers: Driver[]) {}

  findNearbyDrivers(
    userLatitude: number,
    userLongitude: number,
    radiusMeters: number,
  ): Driver[] {
    return this.drivers
      .filter((driver) => driver.status === "AVAILABLE")
      .filter((driver) => {
        const distance = this.haversineMeters(
          userLatitude,
          userLongitude,
          driver.latitude,
          driver.longitude,
        );

        return distance <= radiusMeters;
      });
  }

  private haversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLon / 2) ** 2;

    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
  }
}
```

That approach becomes expensive quickly:
- every query scans too many rows
- ordinary indexes on `latitude` or `longitude` alone do not cluster two-dimensional proximity well
- exact-distance math runs for many locations that were obviously too far away
- query latency gets worse as the dataset grows

This is where **Geohash** comes in. Geohash turns latitude and longitude into a hierarchical string that works well for coarse location grouping, prefix searches, and candidate reduction before exact distance filtering.

In this chapter, you will learn:
  * [Why geohash exists](#1-why-geohash-exists)
  * [What geohash is](#2-what-geohash-is)
  * [How geohash encoding works](#3-how-geohash-encoding-works)
  * [How precision, prefixes, and neighbor cells work](#4-precision-prefixes-and-neighbor-cells)
  * [How proximity search works with geohash](#5-how-proximity-search-works-with-geohash)
  * [How to model and index geohashes](#6-data-modeling-and-indexing-strategies)
  * [How geohash compares with other spatial approaches](#7-geohash-vs-related-spatial-approaches)
  * [What practical TypeScript implementations look like](#8-practical-typescript-patterns)
  * [When to use geohash and which pitfalls matter](#9-when-to-use-it-and-common-pitfalls)
  * [What to keep on your implementation checklist](#10-summary)


# 1. Why Geohash Exists

Geohash exists because proximity search is fundamentally a two-dimensional problem, while many common database indexes are much happier with one-dimensional keys.

### The Core Problem

Latitude and longitude describe a point on the Earth's surface, but "nearby" depends on both values together.

If you index only latitude:
- points with similar latitude but very different longitude can appear close in the index

If you index only longitude:
- points with similar longitude but very different latitude can appear close in the index

If you compute exact distance against every row:
- correctness is high
- scalability is poor

```text
You need:
  nearby(user_lat, user_lon, radius)

But the raw data looks like:
  latitude   longitude
  12.9716    77.5946
  28.6139    77.2090
  19.0760    72.8777

Common result without a spatial strategy:
  -> too many scanned rows
  -> expensive exact-distance filtering
  -> awkward multi-column indexing trade-offs
```

### What Geohash Optimizes For

Geohash usually helps with:
- grouping nearby coordinates into the same coarse cell
- turning a point into a prefix-searchable string
- reducing the candidate set before running exact distance calculations
- supporting simple location lookups in systems that do not need full GIS features for every query

### The Durable Motivation

The durable motivation is not "replace all geospatial math with one string."

The durable motivation is:
- use a cheap coarse filter first
- use exact distance or geometry checks second
- keep location queries practical as the dataset grows

### Where It Commonly Helps

Geohash often appears in:
- ride matching and driver discovery
- restaurant or store lookup
- logistics and field-asset tracking
- map clustering and viewport prefetch
- "show me nearby items" APIs

### What It Does Not Automatically Solve

Geohash does not automatically fix:
- exact nearest-neighbor ranking by itself
- polygon containment queries
- route-aware distance
- geospatial joins involving rich geometry
- cell-boundary edge cases unless the query logic handles neighbors correctly


# 2. What Geohash Is

Geohash is a hierarchical encoding that converts a latitude/longitude pair into a short base32 string.

### A Conservative Definition

The durable idea is:

```text
Geohash =
  encode latitude + longitude into one string
  + make longer strings represent smaller cells
  + let shared prefixes represent shared larger regions
  + use prefix search for coarse geographic filtering
```

### Why the Prefix Matters

A longer shared prefix means two coordinates fall inside the same larger geohash cell.

Example hierarchy:

```text
Parent cell:
  tdr

Smaller cell inside that parent:
  tdr5

Even smaller cell inside that region:
  tdr5r
```

That hierarchy is useful because many databases can query:
- exact matches on fixed-length geohash columns
- anchored prefix matches on a longer geohash column

### The Character Set

Geohash uses a base32 alphabet:

```text
0123456789bcdefghjkmnpqrstuvwxyz
```

It omits some easily confused letters so hashes are easier to read and share.

### What a Geohash Represents

A geohash does not represent one exact mathematical point. It represents a **cell**:
- the encoded point falls somewhere inside that cell
- longer hashes represent smaller cells
- shorter hashes represent larger cells

```text
Shorter geohash:
  bigger area
  fewer characters
  cheaper coarse grouping

Longer geohash:
  smaller area
  more characters
  tighter candidate filtering
```

### What Geohash Is Not

Geohash is usually not:
- an exact distance function
- a replacement for storing raw latitude and longitude
- proof that points with different prefixes are not nearby
- a complete substitute for native spatial indexes or geometry engines

Two points can be very close in reality and still land in different cells when they sit near a cell boundary.


# 3. How Geohash Encoding Works

Geohash works by repeatedly splitting longitude and latitude ranges, recording those choices as bits, and then converting the bits into base32 characters.

### Step 1: Start with Global Ranges

The initial search space is:
- latitude: `[-90, 90]`
- longitude: `[-180, 180]`

### Step 2: Repeatedly Bisect the Ranges

Geohash alternates between longitude and latitude:
- split longitude
- split latitude
- split longitude again
- split latitude again

At each split:
- if the coordinate is in the upper half, record `1`
- if the coordinate is in the lower half, record `0`

```text
Longitude range:
  [-180, 180]
        |
       mid = 0

If longitude >= 0:
  record 1
  new range becomes [0, 180]

If longitude < 0:
  record 0
  new range becomes [-180, 0]
```

The same pattern is applied to latitude.

### Step 3: Interleave Longitude and Latitude Bits

Standard geohash alternates bits in this order:

```text
lon bit 1, lat bit 1, lon bit 2, lat bit 2, ...
```

So the encoded bit stream mixes both dimensions into one ordered sequence.

### Step 4: Group Bits into Chunks of Five

Every five bits become one base32 character.

```text
Bit stream:
  10110 01101 11000 ...

Grouped into 5-bit chunks:
  10110 | 01101 | 11000

Mapped to base32 alphabet:
  char1 | char2 | char3
```

### Step 5: Stop at the Desired Precision

If you stop after:
- 5 characters, you get a fairly coarse cell
- 7 characters, you get a much smaller cell
- 8 or more characters, you get even tighter spatial grouping

### Why This Produces Hierarchy

Because the next character simply continues subdividing the current cell, every longer geohash is a child region of the shorter prefix:

```text
World
└── prefix t
    └── prefix td
        └── prefix tdr
            └── prefix tdr5
                └── prefix tdr5r
```

That prefix hierarchy is the main practical reason geohash fits well with prefix lookups.


# 4. Precision, Prefixes, and Neighbor Cells

Precision is where geohash becomes practically useful. The main design question is not just "Can I encode a point?" but "What cell size should I search with?"

### Precision Changes Cell Size

Longer geohashes create smaller cells. Approximate cell dimensions near the equator look like this:

```text
┌───────────┬──────────────────────────────┬────────────────────────────────────┐
│ Length    │ Approximate Cell Size        │ Typical Use                        │
├───────────┼──────────────────────────────┼────────────────────────────────────┤
│ 4 chars   │ 39 km x 19.5 km              │ City-scale coarse partitioning     │
├───────────┼──────────────────────────────┼────────────────────────────────────┤
│ 5 chars   │ 4.9 km x 4.9 km              │ Nearby-city or district search     │
├───────────┼──────────────────────────────┼────────────────────────────────────┤
│ 6 chars   │ 1.2 km x 0.61 km             │ Neighborhood-level coarse filter   │
├───────────┼──────────────────────────────┼────────────────────────────────────┤
│ 7 chars   │ 153 m x 153 m                │ Street-level grouping              │
├───────────┼──────────────────────────────┼────────────────────────────────────┤
│ 8 chars   │ 38 m x 19 m                  │ Fine-grained local clustering      │
└───────────┴──────────────────────────────┴────────────────────────────────────┘
```

These are approximations:
- east-west distance shrinks as latitude increases
- real query design should validate the chosen precision against your actual search radius and geography

### Shared Prefixes Create Search Buckets

If many objects share the same 6-character geohash, they fall into the same coarse spatial bucket. That gives you a natural prefilter:

```text
geohash_6 = "tdr5r8"

Candidate rows:
  driver-1  -> tdr5r8
  driver-2  -> tdr5r8
  driver-3  -> tdr5r8

Other rows:
  driver-9  -> tdr7ab
  driver-10 -> te2m0x
```

### Neighbor Cells Matter

The biggest practical trap is boundary behavior.

Suppose the user is near the edge of a cell:

```text
┌───────────┬───────────┬───────────┐
│ north-west│ north     │ north-east│
├───────────┼───────────┼───────────┤
│ west      │ target    │ east      │
│           │     X     │           │
├───────────┼───────────┼───────────┤
│ south-west│ south     │ south-east│
└───────────┴───────────┴───────────┘
```

If the point `X` is close to the east edge:
- a truly nearby object may live in the `east` cell
- a center-cell-only prefix query can miss it

So practical geohash search often uses:
- the center cell
- adjacent cells
- or a wider multi-cell cover when the search radius is larger than one cell

### Precision Is a Query-Heuristic Choice

There is no single perfect precision for all workloads.

Too coarse:
- too many false positives
- larger candidate set

Too fine:
- more neighbor cells to fetch
- more fragmented query logic

The useful mindset is:

```text
Choose a precision that keeps the candidate set manageable,
then use exact-distance filtering to finish the job.
```


# 5. How Proximity Search Works with Geohash

The most common geohash query pattern is **coarse prefix filter first, exact distance second**.

### The Usual Search Flow

```text
User location + radius
        │
        ▼
Choose geohash precision
        │
        ▼
Generate relevant cell prefixes
        │
        ▼
Fetch candidates by prefix/index
        │
        ▼
Compute exact distance
        │
        ▼
Filter + sort final results
```

### Step 1: Choose a Search Precision

For example:
- a 5 km search may use a coarser precision than a 200 m search
- a 200 m search may prefer a smaller cell so the candidate set stays tight

This is usually heuristic, not universal.

### Step 2: Cover the Search Area with Cells

For small radii, this may be:
- center cell plus immediate neighbors

For larger radii, this may require:
- a wider bounding-box cover across more cells

The important rule is:
- do not assume one cell is enough

### Step 3: Fetch Candidates by Prefix

Examples:
- equality on a fixed-length column such as `geohash_6`
- anchored prefix query on a longer geohash string
- a union or `IN (...)` query across several neighboring cell prefixes

### Step 4: Run Exact Distance Filtering

Geohash is a coarse approximation. Final correctness usually comes from exact filtering:
- Haversine distance for "as-the-crow-flies" distance
- more advanced geometry or routing logic if the product requires it

### Step 5: Rank and Return Results

After exact filtering, you can:
- sort by distance
- apply freshness or availability filters
- combine location with other ranking signals

### Good vs Bad Query Direction

```text
Bad:
  query all locations
  -> compute exact distance for everything
  -> let the CPU absorb the whole problem

Good:
  use geohash to fetch likely candidates
  -> compute exact distance only for candidates
  -> keep exact filtering as the final correctness step
```

### Why False Positives Are Acceptable

Geohash prefilters naturally produce false positives:
- points in the same cell may still be outside the requested radius

That is fine if your final distance filter removes them.

The bigger risk is false negatives from incomplete cell coverage, which is why boundary handling matters more than perfect bucket purity.


# 6. Data Modeling and Indexing Strategies

Geohash works best when you treat it as an indexing helper, not as the only representation of location.

### Keep Raw Coordinates as the Source of Truth

Always keep:
- `latitude`
- `longitude`

Those raw coordinates are still needed for:
- exact distance calculation
- map display
- reindexing at a different precision later
- migrating to another spatial strategy

### Store One or More Searchable Prefixes

A common pattern is to materialize multiple precisions:
- `geohash_5`
- `geohash_6`
- `geohash_7`

That makes it easier to:
- pick the right precision at query time
- avoid depending entirely on database-specific prefix behavior
- combine geohash with other indexed filters such as availability or tenant

```text
Row model:
  id
  latitude
  longitude
  geohash_5
  geohash_6
  geohash_7
  status
```

### SQL Example

```sql
CREATE TABLE driver_locations (
    driver_id UUID PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geohash_5 VARCHAR(5) NOT NULL,
    geohash_6 VARCHAR(6) NOT NULL,
    geohash_7 VARCHAR(7) NOT NULL,
    status VARCHAR(16) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_driver_locations_status_geohash_5
    ON driver_locations (status, geohash_5);

CREATE INDEX idx_driver_locations_status_geohash_6
    ON driver_locations (status, geohash_6);

CREATE INDEX idx_driver_locations_status_geohash_7
    ON driver_locations (status, geohash_7);
```

This pattern is useful when:
- the query workload uses a few known radii
- you want predictable indexed equality lookups
- you prefer simpler SQL over dynamic prefix-expression tuning

### Prefix Search on One Longer Column

Another option is:
- store one longer geohash such as `geohash_9`
- query prefixes from it

This can work well, but validate whether your database uses indexes efficiently for anchored prefix lookups. The exact behavior varies by engine and index type.

### Composite Filters Matter

Location alone is rarely the whole query. Real queries often also filter by:
- availability
- tenant or city
- category
- freshness window

So in practice, useful indexes are often composite:
- `(status, geohash_6)`
- `(tenant_id, geohash_6)`
- `(status, updated_at, geohash_6)` if your engine and workload justify it

### Write Path Considerations

On every location update:
- recompute the geohash columns
- update only the relevant row or time-series record
- be careful about excessive update frequency for very mobile entities

For high-churn location streams, some teams keep:
- a fast mutable latest-location table for proximity search
- a separate append-oriented history table for analytics and replay


# 7. Geohash vs Related Spatial Approaches

Geohash is useful, but it is not the only way to structure spatial queries.

### Geohash vs Raw Latitude/Longitude Filtering

Raw coordinate filtering usually means:
- bounding-box math in the query
- exact distance on the reduced candidate set
- more work to make indexes line up with the access pattern

Geohash often wins on simplicity for coarse grouping:
- one prefixable key
- easy bucketing
- straightforward application-level logic

But raw coordinates are still required for exact correctness.

### Geohash vs Native Spatial Indexes

Database-native spatial indexes can support richer operations such as:
- point-in-polygon
- intersection
- nearest-neighbor operators
- geometry-aware query planning

Geohash is often simpler when:
- you mainly need "nearby point" lookups
- you want a portable prefix-based strategy
- your application logic is comfortable doing final exact filtering

Native spatial indexes are often stronger when:
- you need richer geometry support
- the database already provides mature spatial capabilities
- you want the database engine to do more of the geospatial work directly

### Geohash vs Other Hierarchical Cell Systems

Other cell systems also partition the Earth into hierarchical regions. Some emphasize:
- more uniform cell area
- easier neighbor calculations
- different grid shapes such as hexagons

Geohash still remains attractive when:
- a string prefix is operationally convenient
- you want easy lexicographic grouping
- you are solving a practical proximity-filtering problem rather than a full geospatial analytics problem

### Comparison Table

```text
┌──────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Approach                 │ Strength                     │ Main Trade-off               │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Geohash                  │ Simple hierarchical prefix   │ Boundary artifacts, coarse   │
│                          │ search for point data        │ approximation only           │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Raw lat/lon + distance   │ Direct and explicit math     │ Harder to scale naïvely      │
│ filtering                │                              │ without good pruning         │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Native spatial index     │ Rich geometry operations     │ More engine-specific setup   │
│                          │ and query operators          │ and operational complexity   │
├──────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ Other hierarchical cells │ Alternative grid semantics   │ Usually needs extra tooling  │
│                          │ or neighbor behavior         │ and less natural prefix use  │
└──────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

### Conservative Selection Rule

Use geohash when:
- your main need is coarse candidate reduction for nearby searches
- prefix grouping is a good operational fit
- exact filtering after the prefilter is acceptable

Look beyond geohash when:
- rich spatial operators matter
- cell shape uniformity matters more than prefix search convenience
- the workload is dominated by complex geometry rather than point lookup


# 8. Practical TypeScript Patterns

The most useful application-level pattern is:
- encode geohashes on writes
- query candidate prefixes on reads
- finish with exact distance filtering

### Example 1: Encode a Point into a Geohash

```typescript
const GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

function encodeGeohash(latitude: number, longitude: number, precision: number): string {
  if (latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  if (precision <= 0) {
    throw new Error("Precision must be positive.");
  }

  let minLat = -90;
  let maxLat = 90;
  let minLon = -180;
  let maxLon = 180;
  let useLongitude = true;
  let bitsInChunk = 0;
  let currentChunk = 0;
  let geohash = "";

  while (geohash.length < precision) {
    if (useLongitude) {
      const mid = (minLon + maxLon) / 2;

      if (longitude >= mid) {
        currentChunk = (currentChunk << 1) | 1;
        minLon = mid;
      } else {
        currentChunk = currentChunk << 1;
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;

      if (latitude >= mid) {
        currentChunk = (currentChunk << 1) | 1;
        minLat = mid;
      } else {
        currentChunk = currentChunk << 1;
        maxLat = mid;
      }
    }

    useLongitude = !useLongitude;
    bitsInChunk += 1;

    if (bitsInChunk === 5) {
      geohash += GEOHASH_ALPHABET[currentChunk];
      bitsInChunk = 0;
      currentChunk = 0;
    }
  }

  return geohash;
}
```

This is useful on the write path when you ingest or update a location.

### Example 2: Decode Cell Bounds and Build Search Prefixes

```typescript
type GeohashBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

const GEOHASH_BITS = [16, 8, 4, 2, 1];

function decodeGeohashBounds(geohash: string): GeohashBounds {
  let minLat = -90;
  let maxLat = 90;
  let minLon = -180;
  let maxLon = 180;
  let useLongitude = true;

  for (const char of geohash) {
    const value = GEOHASH_ALPHABET.indexOf(char);

    if (value === -1) {
      throw new Error(`Invalid geohash character: ${char}`);
    }

    for (const mask of GEOHASH_BITS) {
      if (useLongitude) {
        const mid = (minLon + maxLon) / 2;

        if ((value & mask) !== 0) {
          minLon = mid;
        } else {
          maxLon = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;

        if ((value & mask) !== 0) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }

      useLongitude = !useLongitude;
    }
  }

  return { minLat, maxLat, minLon, maxLon };
}

function normalizeLongitude(longitude: number): number {
  let result = longitude;

  while (result < -180) {
    result += 360;
  }

  while (result > 180) {
    result -= 360;
  }

  return result;
}

function clampLatitude(latitude: number): number {
  return Math.max(-90, Math.min(90, latitude));
}

function buildCandidatePrefixes(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  precision: number,
): string[] {
  const centerHash = encodeGeohash(latitude, longitude, precision);
  const bounds = decodeGeohashBounds(centerHash);
  const cellHeight = bounds.maxLat - bounds.minLat;
  const cellWidth = bounds.maxLon - bounds.minLon;
  const latDelta = radiusMeters / 111_320;
  const lonScale = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  const lonDelta = radiusMeters / (111_320 * lonScale);
  const minLat = clampLatitude(latitude - latDelta);
  const maxLat = clampLatitude(latitude + latDelta);
  const minLon = longitude - lonDelta;
  const maxLon = longitude + lonDelta;
  const prefixes = new Set<string>();

  for (let lat = minLat; lat <= maxLat + cellHeight / 2; lat += cellHeight) {
    for (let lon = minLon; lon <= maxLon + cellWidth / 2; lon += cellWidth) {
      prefixes.add(
        encodeGeohash(
          clampLatitude(lat),
          normalizeLongitude(lon),
          precision,
        ),
      );
    }
  }

  prefixes.add(centerHash);
  return [...prefixes];
}
```

This pattern is more robust than checking only the center cell because it covers a wider search box when the radius requires it.

### Example 3: Materialize Multiple Precisions on Write

```typescript
type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationPrefixes = Coordinates & {
  geohash5: string;
  geohash6: string;
  geohash7: string;
};

function materializeLocationPrefixes(point: Coordinates): LocationPrefixes {
  return {
    ...point,
    geohash5: encodeGeohash(point.latitude, point.longitude, 5),
    geohash6: encodeGeohash(point.latitude, point.longitude, 6),
    geohash7: encodeGeohash(point.latitude, point.longitude, 7),
  };
}
```

This keeps query-time logic simple because the read path can choose a column by radius.

### Example 4: Nearby Search with Exact Filtering

```typescript
type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

type StoredDriverLocation = {
  driverId: string;
  latitude: number;
  longitude: number;
  status: DriverStatus;
  geohash5: string;
  geohash6: string;
  geohash7: string;
};

type NearbyDriver = {
  driverId: string;
  distanceMeters: number;
};

interface DriverLocationRepository {
  findAvailableDriversByPrefixes(args: {
    precision: 5 | 6 | 7;
    prefixes: string[];
  }): Promise<StoredDriverLocation[]>;
}

function choosePrecision(radiusMeters: number): 5 | 6 | 7 {
  if (radiusMeters <= 250) {
    return 7;
  }

  if (radiusMeters <= 2_000) {
    return 6;
  }

  return 5;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

class NearbyDriverService {
  constructor(private readonly repository: DriverLocationRepository) {}

  async findNearbyAvailableDrivers(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<NearbyDriver[]> {
    const precision = choosePrecision(radiusMeters);
    const prefixes = buildCandidatePrefixes(
      latitude,
      longitude,
      radiusMeters,
      precision,
    );

    const candidates = await this.repository.findAvailableDriversByPrefixes({
      precision,
      prefixes,
    });

    return candidates
      .map((candidate) => ({
        driverId: candidate.driverId,
        distanceMeters: haversineMeters(
          latitude,
          longitude,
          candidate.latitude,
          candidate.longitude,
        ),
      }))
      .filter((candidate) => candidate.distanceMeters <= radiusMeters)
      .sort((left, right) => left.distanceMeters - right.distanceMeters);
  }
}
```

The practical point is not that these thresholds are universal. The practical point is:
- choose a coarse precision heuristically
- query a covering set of prefixes
- use exact distance for correctness


# 9. When to Use It and Common Pitfalls

Geohash is a strong fit when your problem is mostly about fast nearby-point retrieval, not general-purpose computational geometry.

### Good Fit

Geohash is often a good fit when:
- you need "find nearby points" or "find points in a local area"
- coarse prefiltering is enough before exact distance math
- prefix search is operationally convenient in your storage layer
- you want a simple, explainable indexing strategy for point data

### Weak Fit

Geohash is often a weak fit when:
- you need rich polygon or path queries
- road-network distance matters more than straight-line distance
- cell-boundary effects are unacceptable without additional logic
- your database already has stronger native spatial operators that better match the workload

### Pitfall 1: Treating Geohash as Exact Distance

Bad assumption:
- "If two objects share a prefix, they are close enough."

Better assumption:
- a shared prefix only means they fall in the same coarse cell at that precision

### Pitfall 2: Querying Only the Center Cell

Boundary misses are one of the most common implementation bugs.

If the query logic ignores neighboring cells or wider coverage:
- nearby points at the edge can disappear from results

### Pitfall 3: Throwing Away Raw Coordinates

Bad:
- store only the geohash

Good:
- store raw latitude and longitude as the source of truth
- keep geohash as a derived indexing helper

### Pitfall 4: Using One Precision for Every Query

One fixed precision can be awkward:
- too coarse for small-radius lookups
- too fine for larger-radius lookups

Practical systems usually:
- precompute a few precisions
- choose among them by query radius

### Pitfall 5: Ignoring Latitude Effects

Geohash cells are based on latitude/longitude ranges, not equal physical area everywhere on Earth.

That means:
- east-west cell width changes with latitude
- heuristics tuned near the equator may behave differently at higher latitudes

### Pitfall 6: Assuming Geohash Replaces Native Spatial Indexing

Geohash is a practical tool, not a universal winner.

If you need:
- polygon intersection
- shape containment
- advanced nearest-neighbor operators

then a spatial database feature set may be a better primary tool.

### Good vs Bad Design Direction

```text
Bad:
  "We encoded geohash, so the geospatial problem is solved."

Good:
  "We use geohash to reduce the candidate set, then rely on exact
   coordinates and final filtering for correctness."
```

### Relationship to Other Spatial Tooling

```text
Geohash:
  simple hierarchical string for coarse grouping

Exact distance math:
  final correctness for radius filtering

Native spatial index:
  richer geometry and query operators when needed
```

Many systems combine these ideas rather than choosing only one.


# 10. Summary

**Why geohash exists:**
- it turns a two-dimensional location problem into a hierarchical string key that is easier to index and group
- it helps reduce the candidate set before exact distance or geometry checks

**What geohash changes:**
- raw coordinates gain a derived prefix-searchable representation
- query design becomes a two-step process of coarse filtering followed by exact validation
- precision and boundary coverage become explicit parts of the read-path design

**What it does well:**
- supports practical nearby-point lookup and map-area prefiltering
- fits storage systems that can use equality or anchored-prefix lookups efficiently
- gives a simple mental model for spatial bucketing and hierarchical regions

**What it does not guarantee by itself:**
- it does not provide exact distance or exact nearest-neighbor ranking on its own
- it does not remove the need for raw coordinates, neighbor handling, and final filtering
- it does not replace richer spatial tooling when the workload needs advanced geometry

**Practical design advice:**
- keep latitude and longitude as the source of truth
- precompute one or more geohash precisions that match your common radii
- cover neighboring cells conservatively and filter final results with exact distance
- validate precision heuristics against your actual geography, query radius, and database behavior

**Implementation checklist:**

```text
Fit and scope:
  □ Confirm that the main workload is point-based nearby search or local area filtering
  □ Use geohash for coarse candidate reduction, not as a substitute for exact correctness
  □ Re-evaluate whether native spatial indexes are a better fit for complex geometry workloads

Data modeling:
  □ Store raw latitude and longitude as authoritative fields
  □ Materialize one or more geohash precisions that match your query radii
  □ Add composite indexes that reflect real filters such as status, tenant, or category

Query logic:
  □ Choose search precision heuristically based on radius and geography
  □ Cover neighbor cells or a wider cell set so boundary cases are not missed
  □ Apply exact distance filtering before returning results

Correctness and operations:
  □ Test edge cases near cell boundaries, poles, and longitude wraparound
  □ Measure candidate-set size, query latency, and false-positive rate after prefiltering
  □ Document how to retune precision thresholds and rebuild derived geohash columns if needed
```
