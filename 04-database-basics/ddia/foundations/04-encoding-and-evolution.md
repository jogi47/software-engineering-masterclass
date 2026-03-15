# Chapter 4: Encoding and Evolution

## Introduction

Applications change over time. Features are added, business requirements evolve, and you gain better understanding of the problem. This means your data formats also need to change.

In a large system, you can't upgrade everything at once:
- **Server-side:** You do a rolling upgrade (deploy to a few nodes at a time)
- **Client-side:** Users may not install updates immediately (or ever!)

This means **different versions of your code will be running simultaneously**, reading and writing data in potentially different formats.

**The key question:** How do we ensure old and new code can coexist?

---

## Compatibility

### Forward Compatibility

**Definition:** Older code can read data written by newer code.

This is trickier because old code must ignore fields it doesn't understand.

```
┌─────────────────┐                    ┌─────────────────┐
│   Old Code v1   │  ← reads data ←    │  New Code v2    │
│  (doesn't know  │                    │  (writes new    │
│   about new     │                    │   fields)       │
│   fields)       │                    │                 │
└─────────────────┘                    └─────────────────┘
```

### Backward Compatibility

**Definition:** Newer code can read data written by older code.

This is usually easier - you control the new code, so you know what to expect from old data.

```
┌─────────────────┐                    ┌─────────────────┐
│   New Code v2   │  ← reads data ←    │  Old Code v1    │
│  (knows how to  │                    │  (writes old    │
│   handle old    │                    │   format)       │
│   format)       │                    │                 │
└─────────────────┘                    └─────────────────┘
```

### Why Both Matter

During a rolling upgrade:
1. Some servers are running new code, some are running old code
2. New servers may receive data written by old servers (backward compatibility)
3. Old servers may receive data written by new servers (forward compatibility)

**You need both types of compatibility to safely deploy changes.**

---

## Formats for Encoding Data

When you want to send data over the network or write it to a file, you need to encode it as a sequence of bytes. There are many ways to do this.

### Language-Specific Formats

Many languages have built-in encoding:
- Java: `java.io.Serializable`
- Python: `pickle`
- Ruby: `Marshal`

**Why to avoid them:**

1. **Tied to a specific language.** If you use Java serialization, you can't read that data from Python.

2. **Security problems.** To restore data, these libraries can instantiate arbitrary classes. Attackers can craft malicious data that executes arbitrary code when deserialized.

3. **Versioning is an afterthought.** They don't handle forward/backward compatibility well.

4. **Poor performance.** Java's built-in serialization is notorious for being slow and generating large output.

**Rule:** Don't use language-specific encoding for anything that might be stored persistently or sent over a network.

---

## JSON, XML, and CSV

### JSON

The most popular format for data interchange on the web.

```json
{
    "userName": "Martin",
    "favoriteNumber": 1337,
    "interests": ["daydreaming", "hacking"]
}
```

**Problems with JSON:**

1. **Number ambiguity.** JSON doesn't distinguish integers from floating-point. JavaScript (where JSON comes from) uses double-precision floats for all numbers, so integers greater than 2^53 lose precision.

   ```json
   // This will lose precision in JavaScript:
   {"id": 9007199254740993}
   ```

2. **No binary strings.** If you need to include binary data, you must Base64-encode it (increases size by 33%).

3. **No comments.** Can't annotate configuration files.

4. **Optional schema.** JSON Schema exists but isn't widely used. You often don't know what fields to expect.

### XML

```xml
<person>
    <userName>Martin</userName>
    <favoriteNumber>1337</favoriteNumber>
    <interests>
        <interest>daydreaming</interest>
        <interest>hacking</interest>
    </interests>
</person>
```

**Problems with XML:**
- Very verbose
- Complex specification (namespaces, schemas, DTDs)
- Number handling is similarly problematic

### CSV

```csv
userName,favoriteNumber
Martin,1337
```

**Problems with CSV:**
- No standard for escaping (commas in values, newlines, etc.)
- No schema
- Can't represent nested data
- No typing (everything is a string)

### When Text Formats Are Fine

Despite these problems, JSON and XML are popular and useful:
- Human-readable (great for debugging)
- Widely supported
- Good enough for many applications

But for internal communication between services you control, binary formats are often better.

---

## Binary Encoding

Binary formats are more compact and faster to parse than text formats.

### JSON-like Binary Formats

**MessagePack, BSON, BJSON, UBJSON, SMILE, etc.**

These encode JSON structures in binary, but keep the JSON data model. They save some space but not dramatically.

**Example MessagePack encoding:**

The JSON:
```json
{"userName":"Martin","favoriteNumber":1337,"interests":["daydreaming","hacking"]}
```

Is 81 bytes as JSON, 66 bytes as MessagePack. Only 18% smaller - not dramatic.

**Why not more compact?**
- Field names are still included in every record
- No schema means decoder must be able to figure out structure

---

## Thrift and Protocol Buffers

These binary encoding libraries use **schemas** to make encoding much more compact.

### Protocol Buffers Example

**Schema definition (.proto file):**
```protobuf
message Person {
    required string user_name       = 1;
    optional int64  favorite_number = 2;
    repeated string interests       = 3;
}
```

**Key insight: Field tags**

Notice the numbers (1, 2, 3)? These are **field tags**. In the encoded data, we don't store field names - we store these numbers instead.

**Encoded data structure:**
```
┌───────────┬────────────┬───────────┬────────────┬─────────────┐
│ Tag:1     │ "Martin"   │ Tag:2     │ 1337       │ Tag:3       │ ...
│ Type:str  │            │ Type:int  │            │ Type:str    │
└───────────┴────────────┴───────────┴────────────┴─────────────┘
```

**Result:** The same data is only 33 bytes - less than half the size of JSON!

### Thrift

Thrift (originally Facebook, now Apache) works similarly but has two binary encodings:

**BinaryProtocol:** Similar to Protocol Buffers, 59 bytes for our example

**CompactProtocol:** More aggressive packing, 34 bytes

### Schema Evolution

The beauty of field tags is how they enable schema evolution.

**Adding a new field:**

```protobuf
message Person {
    required string user_name       = 1;
    optional int64  favorite_number = 2;
    repeated string interests       = 3;
    optional string email           = 4;  // NEW FIELD
}
```

- **Old code reading new data:** Sees tag 4 which it doesn't recognize. It knows the type from the encoding, so it can skip the right number of bytes. Forward compatibility!

- **New code reading old data:** Doesn't find tag 4. If the field is optional, that's fine - use default value. Backward compatibility!

**Rules for schema evolution:**

1. **Never change a field tag number.** That would break all existing data.

2. **Can add new fields** if they're optional or have defaults.

3. **Can remove optional fields** (but never reuse the tag number).

4. **Can't add new required fields** (old data wouldn't have them).

5. **Can't remove required fields** (old code wouldn't know what to do).

### Why Required Fields Are Problematic

Protocol Buffers v3 dropped `required` entirely - all fields are optional.

**The problem:** If you have a required field and later want to remove it, you're stuck. And if you add a new required field, old data is invalid.

**Better approach:** Make everything optional, validate in application code.

---

## Apache Avro

Avro takes a different approach than Thrift and Protocol Buffers.

### The Avro Schema

```json
{
    "type": "record",
    "name": "Person",
    "fields": [
        {"name": "userName",       "type": "string"},
        {"name": "favoriteNumber", "type": ["null", "long"], "default": null},
        {"name": "interests",      "type": {"type": "array", "items": "string"}}
    ]
}
```

### The Key Difference: No Field Tags

In Avro, there are no tag numbers in the schema. Fields are identified by name only.

**How does the encoding work without tags?**

The encoded data just contains values in order, no field identifiers at all:

```
┌────────────┬────────────┬────────────────────────────┐
│ 06 (len 6) │ "Martin"   │ 02 (int) │ 1337 │ ...     │
│ then str   │            │          │      │         │
└────────────┴────────────┴────────────────────────────┘
```

Only 32 bytes! The most compact of all.

**But wait - how does the decoder know what's what?**

### Writer's Schema vs Reader's Schema

In Avro, **both the writer and reader have a schema**, and they don't have to be the same!

```
┌─────────────────────────────────────────────────────────────────┐
│ Writer                              Reader                      │
│                                                                 │
│ Schema:                             Schema:                     │
│ - userName: string                  - userName: string          │
│ - favoriteNumber: long              - favoriteNumber: long      │
│ - interests: array<string>          - interests: array<string>  │
│                                     - email: string (NEW)       │
│                                                                 │
│ Encoded data: ─────────────────────→ Decoded using both schemas │
│ (written with writer's schema)       (resolved at read time)    │
└─────────────────────────────────────────────────────────────────┘
```

**Schema resolution:**
- Avro compares writer's schema with reader's schema
- Fields are matched **by name**
- If a field exists in writer's schema but not reader's, it's ignored
- If a field exists in reader's schema but not writer's, use default value

### How Does the Reader Get the Writer's Schema?

This depends on the context:

1. **Large files (Hadoop):** Store writer's schema at beginning of file. All records in file use same schema.

2. **Database records:** Store schema version number with each record. Keep a schema registry mapping versions to schemas.

3. **Network communication:** Negotiate schema on connection setup.

### Avro Schema Evolution

**Adding a field:**
```json
// Old schema
{"name": "userName", "type": "string"}

// New schema - add email with default
{"name": "userName", "type": "string"},
{"name": "email", "type": "string", "default": ""}
```

- New code reading old data: Uses default value for email
- Old code reading new data: Ignores email field

**Removing a field:**
- Only remove fields that have defaults
- Same mechanism: Missing fields use defaults

**Renaming a field:**
```json
{"name": "userName", "type": "string", "aliases": ["user_name"]}
```
The `aliases` array lets reader match old field names.

### Why Avro?

**Dynamic schema generation:**

If your schema is derived from another source (like a database schema), you don't want to manually assign tag numbers. Avro's field matching by name is more natural.

**Example:** Export a relational database to Avro
- Each table becomes an Avro schema
- Column names become field names
- If database schema changes, Avro schema changes automatically
- Old and new Avro files can still be read together

---

## Modes of Data Flow

Data can flow between processes in several ways. Each has different implications for encoding and compatibility.

### Dataflow Through Databases

```
┌─────────────────────────────────────────────────────────┐
│                      Database                           │
│                                                         │
│   Process A        writes →     ← reads        Process B │
│   (old code)                                  (new code) │
└─────────────────────────────────────────────────────────┘
```

**Multiple processes writing:**
- Old code may write data
- New code may write data
- Both need to be able to read each other's data

**Data outlives code:**
- Data written years ago might be read by today's code
- You might have data in many different schema versions
- "Data outlives code" - need to handle all historical formats

**The danger of rewriting old data:**

Imagine new code reads a record, modifies one field, writes it back. The record was written by old code and is missing a new field.

What happens? If not careful, the new field might be lost!

**Solution:** When rewriting, preserve unknown fields (don't discard them).

### Dataflow Through Services

#### REST and HTTP

**REST** is not a protocol but a design philosophy:
- Uses HTTP features (URLs, headers, methods)
- Simple, widely supported
- Often uses JSON for data
- OpenAPI/Swagger for API documentation

#### RPC (Remote Procedure Call)

**The idea:** Make a network call look like a local function call.

```java
// Looks like a local call...
UserProfile profile = userService.getProfile(userId);

// ...but actually makes a network request
```

**The problem:** Network calls are fundamentally different from local calls:
- Network is unreliable (requests/responses can be lost)
- Network has latency (milliseconds, not nanoseconds)
- You might need retries (what if the call succeeded but response was lost?)
- Data must be serialized (no passing pointers)

**Modern RPC frameworks:**

- **gRPC** (Google): Uses Protocol Buffers, supports streaming
- **Thrift**: Also supports RPC
- **Finagle** (Twitter): Various protocols
- **Rest.li** (LinkedIn): REST with schema

**RPC and compatibility:**

- Servers may be upgraded before clients (especially with mobile apps)
- Need backward and forward compatibility
- API versioning through URLs or headers

### Dataflow Through Message Passing

**Message broker/queue:** An intermediary that stores messages temporarily.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Sender    │ ──────→ │   Message   │ ──────→ │  Receiver   │
│             │         │   Broker    │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

**Examples:** RabbitMQ, Apache Kafka, Amazon SQS

**Advantages over direct RPC:**
- **Decoupling:** Sender doesn't need to know who receives
- **Buffering:** Receiver doesn't need to be available when message sent
- **Durability:** Messages are stored, survive crashes
- **Load balancing:** Multiple receivers can process messages
- **Fan-out:** One message can go to multiple receivers

**Message encoding:**
- Any encoding format works
- Often use JSON for simplicity
- Or Avro/Protobuf for efficiency

### The Actor Model

**Actors** are entities that:
- Have local state (not shared with other actors)
- Communicate by sending messages
- Process one message at a time

```
┌─────────────┐    message    ┌─────────────┐
│   Actor A   │ ────────────→ │   Actor B   │
└─────────────┘               └─────────────┘
       │                             │
       │                             │
       ▼                             ▼
┌─────────────┐    message    ┌─────────────┐
│   Actor C   │ ←──────────── │   Actor D   │
└─────────────┘               └─────────────┘
```

**Frameworks:** Akka (JVM), Orleans (.NET), Erlang OTP

**Location transparency:** Actor can be on same process, different process, or different machine. The programming model is the same.

**Message encoding:** Usually needs schema evolution - actors on different machines might be different versions.

---

## Key Takeaways

1. **Compatibility is essential** for evolving systems. You need both backward compatibility (new code reads old data) and forward compatibility (old code reads new data).

2. **Avoid language-specific serialization.** Use standard formats that work across languages and handle versioning.

3. **Text formats (JSON, XML)** are human-readable and widely supported, but have issues with numbers, binary data, and lack of schema.

4. **Binary formats (Protobuf, Thrift, Avro)** are more compact and faster. They use schemas for:
   - Documentation
   - Code generation
   - Validation
   - Schema evolution

5. **Schema evolution strategies:**
   - Protobuf/Thrift: Field tags must never change. Add optional fields, never remove required fields.
   - Avro: Match fields by name. Both reader and writer have schemas that are compared at read time.

6. **Data flows through:**
   - **Databases:** Data outlives code. Multiple versions write/read.
   - **Services (REST/RPC):** Need API versioning.
   - **Messages:** Asynchronous, buffered, decoupled.

7. **Choose encoding based on your needs:**
   - Human readability? JSON/XML
   - Performance/compactness? Binary formats
   - Dynamic schemas? Avro
   - Strict schemas with code generation? Protobuf/Thrift
