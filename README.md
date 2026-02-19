# Ascendo AI - Project Management System

A production-grade Kanban board application built with FastAPI (backend) and React (frontend) for the Ascendo AI technical assessment.


## Quick Start

```bash
# Clone the repository
git clone https://github.com/purvangshah2608/AscendoAIAssessment.git
cd AscendoAIAssessment

# Start all services with Docker Compose
docker-compose up --build
```

## Application Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Tech Stack

### Backend
- **FastAPI 0.109+** - Modern async web framework
- **PostgreSQL 15** - Relational database with async support (asyncpg)
- **SQLAlchemy 2.0** - Async ORM with relationship loading optimization
- **Pydantic V2** - Data validation and serialization
- **Alembic** - Database migrations
- **JWT Authentication** - Token-based auth with python-jose
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **TanStack Query** (React Query) - Data fetching and caching
- **dnd-kit** - Drag and drop library
- **Zustand** - Lightweight state management
- **TailwindCSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **react-hot-toast** - Toast notifications

## Architecture Decisions

### 1. Ordering Algorithm: Lexorank

#### Why Lexorank?

| Approach         | Pros                                         | Cons                                                 | Use Case                          |
|------------------|----------------------------------------------|------------------------------------------------------|-----------------------------------|
| Integer Index    | Simple implementation                        | O(n) updates on reorder - requires updating all subsequent items | Small lists (<50 items)          |
| Floating Point   | O(1) updates                                 | Precision loss after ~50 reorders                    | Limited reordering scenarios     |
| **Lexorank** ✅  | O(1) updates, no precision issues, infinite reordering | Slightly complex implementation | Production at scale (used by Jira) |

#### How Lexorank Works

Lexorank uses lexicographically sortable strings as position identifiers:

```
Initial state:
  Card A: position = "n"

Insert Card B after A:
  Card A: position = "n"
  Card B: position = "t"  (midpoint between "n" and "z")

Insert Card C between A and B:
  Card A: position = "n"
  Card C: position = "q"  (midpoint between "n" and "t")
  Card B: position = "t"
```

#### Key Features
- Base-26 alphabet (a-z) for simplicity
- Midpoint calculation handles edge cases (inserting at start/end)
- Automatic rebalancing when position strings exceed 10 characters
- No database updates to other cards when moving a single card

#### Implementation Example
```python
# Example: Moving card between positions "aaa" and "aac"
new_position = get_rank_between("aaa", "aac")  # Returns "aab"

# Moving to beginning
new_position = get_rank_between(None, "aaa")   # Returns position before "aaa"

# Moving to end
new_position = get_rank_between("zzz", None)   # Returns position after "zzz"
```

#### Why This Matters
- **Scalability**: Works efficiently with thousands of cards
- **Concurrency**: Multiple users can reorder cards simultaneously without conflicts
- **Performance**: Single UPDATE query instead of bulk updates
- **Battle-tested**: Used by Atlassian (Jira) at massive scale
---
### 2. Concurrency Handling (Race Conditions)

#### Problem: Two users drag the same card simultaneously.

**Scenario:**

```text
User A: Moves Card #5 from List 1 to List 2
User B: Moves Card #5 from List 1 to List 3 (at the same time)

Without locking: Both succeed, but final state is unpredictable
```
Solution: Optimistic Locking with Version Numbers

Every card has a version field that increments on each update:

```Python
class Card(Base):
    id: int
    title: str
    position: str
    version: int  # Starts at 1, increments on each move
```

The Move Flow:

1. Frontend sends move request with expected_version
2. Backend uses SELECT FOR UPDATE to lock the card row
3. Version Check: Compare expected_version with current_version
4. On Match: Update card and increment version
5. On Mismatch: Return 409 Conflict error

```Python
# Pseudocode
async def move_card(card_id, target_list_id, expected_version):
    # Step 1: Lock the row
    card = await db.execute(
        SELECT Card WHERE id = card_id FOR UPDATE
    )
    
    # Step 2: Optimistic lock check
    if card.version != expected_version:
        raise HTTPException(409, "Card was modified by another user")
    
    # Step 3: Safe to update
    card.list_id = target_list_id
    card.position = new_position
    card.version += 1
    await db.commit()
```

Frontend Handling:

```TypeScript
// Optimistic UI update (immediate visual feedback)
moveCardOptimistic(cardId, targetListId, newIndex);

try {
  // API call with version check
  await api.moveCard(cardId, { 
    target_list_id: targetListId,
    expected_version: card.version 
  });
} catch (error) {
  if (error.status === 409) {
    // Rollback optimistic update
    revertBoard(previousState);
    toast.error("Card was modified by another user");
  }
}
```

Why This Approach?

✅ No pessimistic locks - Users aren't blocked from moving cards \
✅ Clear conflict detection - Frontend receives explicit 409 error \
✅ User awareness - User is notified when conflicts occur \
✅ Data integrity - No silent overwrites (last-write-wins rejected)

Alternative Considered: Last-Write-Wins

❌ Rejected because it loses user intent silently \
Example: User A's move gets overwritten by User B without notification
---

### 3. Soft Delete Cascade
Requirement: Entities are never physically deleted from the database.

Behavior:

All entities have a deleted_at timestamp:

```Python
class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None
    )
```

Deletion Flow:

```text

User deletes Board #1
  ↓
Backend sets: Board.deleted_at = NOW()
  ↓
Lists and Cards remain in DB (orphaned but auditable)
  ↓
API queries filter: WHERE deleted_at IS NULL
  ↓
Frontend sees: 404 or empty results
```

Example:

```Python
# Soft delete board
board.deleted_at = datetime.now(timezone.utc)
await db.commit()

# Query active boards only
boards = await db.execute(
    SELECT Board WHERE deleted_at IS NULL
)

# Audit trail remains
all_boards = await db.execute(
    SELECT Board  # Includes soft-deleted boards
)
```
Why Soft Deletes?

✅ Audit Trail: Full history of all actions \
✅ Undo Capability: Can restore deleted items \
✅ Compliance: Required for many regulations (GDPR, SOX) \
✅ Data Analysis: Historical data for analytics

API Behavior:

Deleting a Board returns 204 No Content \
Fetching a soft-deleted Board returns 404 Not Found \
Child entities (Lists, Cards) are NOT cascade-deleted (remain for audit)

---

### 4. N+1 Query Prevention
Problem: Loading a board with 5 lists and 20 cards per list could result in:

- 1 query for board
- 5 queries for lists (N+1)
- 100 queries for cards (N+1)
- **Total: 106 queries**

**Solution: Eager Loading with selectinload**

```Python
board = await db.execute(
    select(Board)
    .options(
        selectinload(Board.lists.and_(List.deleted_at.is_(None)))
        .selectinload(List.cards.and_(Card.deleted_at.is_(None)))
    )
    .where(Board.id == board_id)
)
```
**Result: Only 3 Queries**

1. SELECT Board WHERE id = 1
2. SELECT Lists WHERE board_id IN (1) AND deleted_at IS NULL
3. SELECT Cards WHERE list_id IN (1,2,3,4,5) AND deleted_at IS NULL

**Performance Comparison:**

| Scenario | Naive Approach | Optimized Approach |
|----------|----------------|-------------------|
| 1 Board, 5 Lists, 100 Cards | 106 queries | 3 queries |
| Database Load | High | Low |

---

## Testing

The application includes an automated test suite covering core business logic and database interactions, including:
- **Lexorank Algorithm** (Ordering logic)
- **Optimistic Locking** (Concurrency and race condition prevention)
- **Soft Deletes** (Data retention and auditability)
- **N+1 Query Prevention** (Database optimization)

Tests are executed in an isolated Docker environment using an in-memory SQLite database, ensuring they do not affect local data. 

To run the test suite and generate a coverage report, run the following command from the root directory:

```bash
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```