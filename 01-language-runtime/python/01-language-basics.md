# Python Language Basics

A comprehensive guide to Python's type system, primitives, and fundamental language characteristics.

---

## 1. Language Overview

Python is an **interpreted**, **high-level**, **general-purpose** programming language. It emphasizes code readability with significant whitespace (indentation-based blocks).

**Key Characteristics**:
- Interpreted (no compilation step)
- Garbage collected (automatic memory management)
- Supports multiple paradigms (procedural, OOP, functional)
- Duck typing ("if it walks like a duck...")

---

## 2. Type System Classification

### Dynamic Typing

Python is **dynamically typed** - variable types are determined and checked at **runtime**, not compile time.

```python
x = 10          # x is an int
x = "hello"     # x is now a str (no error!)
x = [1, 2, 3]   # x is now a list

# Type is checked when operation is performed
def add(a, b):
    return a + b  # Works for int, str, list - fails at runtime if incompatible
```

**Contrast with Static Typing (TypeScript/Java)**:
```typescript
// TypeScript - compile-time error
let x: number = 10;
x = "hello";  // Error: Type 'string' is not assignable to type 'number'
```

### Strong Typing

Python is **strongly typed** - it does NOT perform implicit type coercion between unrelated types.

```python
# Python - strongly typed
"hello" + 5      # TypeError: can only concatenate str (not "int") to str
"hello" + str(5) # "hello5" - explicit conversion required

# Contrast with JavaScript - weakly typed
# "hello" + 5    // "hello5" - implicit coercion!
```

### Type System Comparison Table

| Language   | Typing    | Strength | Notes                           |
|------------|-----------|----------|---------------------------------|
| Python     | Dynamic   | Strong   | Type hints available (3.5+)     |
| JavaScript | Dynamic   | Weak     | Implicit coercion everywhere    |
| TypeScript | Static    | Strong   | Compiles to JavaScript          |
| Java       | Static    | Strong   | Explicit type declarations      |
| C          | Static    | Weak     | Implicit int/pointer coercion   |
| Ruby       | Dynamic   | Strong   | Similar to Python               |

---

## 3. Primitive / Built-in Types

Python doesn't have "primitives" in the traditional sense - **everything is an object**. However, these are the fundamental built-in types:

### Numeric Types

```python
# Integer - unlimited precision
x = 42
big = 10**100  # No overflow, arbitrary precision

# Float - 64-bit double precision (IEEE 754)
pi = 3.14159
scientific = 1.5e-10

# Complex
z = 3 + 4j
z.real  # 3.0
z.imag  # 4.0
```

### Boolean

```python
is_valid = True
is_empty = False

# Booleans are subclass of int
True == 1   # True
False == 0  # True
True + True # 2
```

### String (Immutable)

```python
name = "Python"
name = 'Python'        # Single or double quotes
multi = """Multi
line string"""

# Immutability
s = "hello"
s[0] = "H"  # TypeError: 'str' object does not support item assignment
s = "H" + s[1:]  # Create new string instead
```

### NoneType

```python
result = None  # Python's null/nil equivalent

# Only one None object exists (singleton)
x = None
y = None
x is y  # True - same object in memory
```

### Bytes and Bytearray

```python
# bytes - immutable sequence of bytes
data = b"hello"
data = bytes([72, 101, 108, 108, 111])

# bytearray - mutable version
mutable_data = bytearray(b"hello")
mutable_data[0] = 72  # OK - mutable
```

### Built-in Types Summary

| Type       | Example            | Mutable | Notes                    |
|------------|--------------------|---------|--------------------------|
| `int`      | `42`, `10**100`    | No      | Arbitrary precision      |
| `float`    | `3.14`, `1e-10`    | No      | 64-bit IEEE 754          |
| `complex`  | `3+4j`             | No      | Real + imaginary         |
| `bool`     | `True`, `False`    | No      | Subclass of int          |
| `str`      | `"hello"`          | No      | Unicode text             |
| `NoneType` | `None`             | No      | Singleton null value     |
| `bytes`    | `b"data"`          | No      | Immutable byte sequence  |
| `bytearray`| `bytearray(b"x")`  | Yes     | Mutable byte sequence    |

---

## 4. Type Declaration & Inference

### No Explicit Declaration Required

Python infers types automatically - no type keywords needed:

```python
# Type is inferred from the value
name = "Alice"      # str
age = 30            # int
scores = [95, 87]   # list[int]
data = {"key": 1}   # dict[str, int]
```

### Type Introspection

```python
x = 42

# Get type
type(x)           # <class 'int'>
type(x).__name__  # 'int'

# Check type
isinstance(x, int)         # True
isinstance(x, (int, str))  # True - check multiple types

# Check exact type (not recommended)
type(x) == int    # True, but doesn't handle inheritance
```

### Type Hints (Python 3.5+)

Optional annotations for documentation and tooling - **not enforced at runtime**:

```python
def greet(name: str, age: int) -> str:
    return f"Hello {name}, you are {age}"

# Variables with type hints
count: int = 0
names: list[str] = ["Alice", "Bob"]
scores: dict[str, int] = {"Alice": 95}

# These still work at runtime (hints are ignored)
greet(123, "hello")  # No runtime error!
```

---

## 5. Mutability

### Immutable Types

Cannot be changed after creation - any "modification" creates a new object:

```python
# Immutable types: int, float, str, tuple, frozenset, bytes

s = "hello"
id(s)       # 140234567890
s += " world"
id(s)       # 140234567999 - NEW object created!

t = (1, 2, 3)
t[0] = 10   # TypeError: 'tuple' object does not support item assignment
```

### Mutable Types

Can be modified in-place:

```python
# Mutable types: list, dict, set, bytearray

lst = [1, 2, 3]
id(lst)       # 140234567890
lst.append(4)
id(lst)       # 140234567890 - SAME object modified!

d = {"a": 1}
d["b"] = 2    # Modified in-place
```

### Why Mutability Matters

```python
# Default argument gotcha
def append_to(item, lst=[]):  # Mutable default - BUG!
    lst.append(item)
    return lst

append_to(1)  # [1]
append_to(2)  # [1, 2] - Same list object reused!

# Correct approach
def append_to(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

---

## 6. Variable Binding & Memory Model

### Everything is an Object

In Python, everything is an object with an identity, type, and value:

```python
x = 42

id(x)     # Identity: unique integer (memory address in CPython)
type(x)   # Type: <class 'int'>
x         # Value: 42
```

### Variables are References

Variables are **names bound to objects**, not containers holding values:

```python
a = [1, 2, 3]
b = a           # b references the SAME object as a

b.append(4)
print(a)        # [1, 2, 3, 4] - a is affected!

# To create a copy
c = a.copy()    # Shallow copy
c = a[:]        # Slice copy
import copy
d = copy.deepcopy(a)  # Deep copy for nested structures
```

### Identity vs Equality

```python
a = [1, 2, 3]
b = [1, 2, 3]
c = a

# == checks value equality
a == b  # True - same values

# is checks identity (same object in memory)
a is b  # False - different objects
a is c  # True - same object

# Integer caching (implementation detail)
x = 256
y = 256
x is y  # True - Python caches small integers (-5 to 256)

x = 257
y = 257
x is y  # False (may vary by implementation)
```

---

## 7. Type Coercion & Conversion

### No Implicit Coercion (Strong Typing)

Python does NOT implicitly convert between unrelated types:

```python
# These all raise TypeError
"age: " + 25        # TypeError
[1, 2] + (3, 4)     # TypeError
1 + "1"             # TypeError
```

### Explicit Type Conversion

Use built-in functions to convert types:

```python
# String conversions
str(42)           # "42"
str(3.14)         # "3.14"
str([1, 2, 3])    # "[1, 2, 3]"

# Numeric conversions
int("42")         # 42
int(3.9)          # 3 (truncates, doesn't round)
float("3.14")     # 3.14
float(42)         # 42.0

# Boolean conversion
bool(0)           # False
bool(42)          # True
bool("")          # False
bool("hello")     # True

# Collection conversions
list("abc")       # ['a', 'b', 'c']
tuple([1, 2, 3])  # (1, 2, 3)
set([1, 2, 2, 3]) # {1, 2, 3}
```

### Numeric Type Promotion

Python does promote numeric types in arithmetic operations:

```python
1 + 2.0     # 3.0 (int + float = float)
2 * 3.0     # 6.0
1 + 2j      # (1+2j) (int + complex = complex)

# Hierarchy: int < float < complex
```

---

## 8. Truthiness & Falsy Values

Python evaluates any object in boolean context. These are **falsy** (evaluate to `False`):

```python
# Falsy values
bool(None)      # False
bool(False)     # False
bool(0)         # False (zero of any numeric type)
bool(0.0)       # False
bool(0j)        # False
bool("")        # False (empty string)
bool([])        # False (empty list)
bool(())        # False (empty tuple)
bool({})        # False (empty dict)
bool(set())     # False (empty set)
```

**Everything else is truthy**:

```python
bool(1)         # True
bool(-1)        # True (any non-zero)
bool("0")       # True (non-empty string)
bool([0])       # True (non-empty list)
bool(" ")       # True (string with space)
```

### Practical Usage

```python
# Idiomatic Python uses truthiness
items = []

# Instead of
if len(items) == 0:
    print("Empty")

# Write
if not items:
    print("Empty")

# Short-circuit evaluation
name = user_input or "Anonymous"  # Default if empty string
result = data and data.get("value")  # Safe access
```

---

## 9. Type Hints (Modern Python)

### Basic Annotations

```python
from typing import Optional, Union, Any

# Function annotations
def process(data: str, count: int = 1) -> list[str]:
    return [data] * count

# Variable annotations
name: str = "Alice"
numbers: list[int] = [1, 2, 3]
mapping: dict[str, int] = {"a": 1}
```

### Common Type Hint Patterns

```python
from typing import Optional, Union, Callable, TypeVar

# Optional - can be None
def find(name: str) -> Optional[int]:
    # Returns int or None
    pass

# Union - multiple types (Python 3.10+: int | str)
def process(data: Union[str, bytes]) -> None:
    pass

# Callable - function types
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# TypeVar - generics
T = TypeVar('T')
def first(items: list[T]) -> T:
    return items[0]
```

### Type Checking with mypy

```bash
# Install
pip install mypy

# Check types
mypy your_script.py
```

```python
# mypy will catch this
def greet(name: str) -> str:
    return "Hello, " + name

greet(123)  # mypy error: Argument 1 has incompatible type "int"; expected "str"
```

### Runtime Type Checking

Type hints are NOT enforced at runtime by default:

```python
def add(a: int, b: int) -> int:
    return a + b

add("hello", "world")  # Runs fine! Returns "helloworld"
```

For runtime enforcement, use libraries like `pydantic` or `beartype`:

```python
from pydantic import validate_call

@validate_call
def add(a: int, b: int) -> int:
    return a + b

add("hello", "world")  # ValidationError at runtime
```

---

## 10. Quick Reference

### Type System at a Glance

| Characteristic | Python Behavior |
|----------------|-----------------|
| Typing         | Dynamic (runtime) |
| Type Strength  | Strong (no implicit coercion) |
| Type Hints     | Optional, not enforced |
| Primitives     | None - everything is an object |
| Mutability     | Varies by type |
| Variables      | Names bound to objects (references) |

### Common Type Operations

```python
# Check type
type(x)                    # Get type
isinstance(x, int)         # Check instance
isinstance(x, (int, str))  # Check multiple

# Convert type
int(), float(), str(), bool()
list(), tuple(), set(), dict()

# Identity
id(x)      # Object identity
x is y     # Identity comparison
x == y     # Value comparison
```
