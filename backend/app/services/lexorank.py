"""
Lexorank Implementation for Efficient Card Ordering

Lexorank is a string-based ranking system that allows O(1) insertions between
any two existing ranks without requiring updates to other items.

Key concepts:
- Ranks are strings that can be compared lexicographically
- Inserting between "aaa" and "aac" produces "aab"
- When ranks become too long, we trigger rebalancing

This implementation uses a base-26 alphabet (a-z) for simplicity.
"""

from typing import Optional
import string

# Constants
ALPHABET = string.ascii_lowercase
MIN_CHAR = ALPHABET[0]  # 'a'
MAX_CHAR = ALPHABET[-1]  # 'z'
MID_CHAR = ALPHABET[len(ALPHABET) // 2]  # 'm'
INITIAL_RANK = "n"  # Start in the middle
MAX_RANK_LENGTH = 10  # Trigger rebalancing when exceeded


class LexorankError(Exception):
    """Custom exception for Lexorank operations"""
    pass


def get_rank_between(
    before: Optional[str] = None,
    after: Optional[str] = None
) -> str:
    """
    Generate a rank that sorts between `before` and `after`.

    Cases:
    1. Both None: Return initial rank (first item)
    2. before None: Insert at start (before `after`)
    3. after None: Insert at end (after `before`)
    4. Both provided: Insert between them

    Args:
        before: The rank of the item that should come before (or None)
        after: The rank of the item that should come after (or None)

    Returns:
        A new rank string that sorts appropriately

    Raises:
        LexorankError: If it's impossible to generate a valid rank
    """
    # Case 1: First item ever
    if before is None and after is None:
        return INITIAL_RANK

    # Case 2: Insert at the beginning
    if before is None:
        return _get_rank_before(after)

    # Case 3: Insert at the end
    if after is None:
        return _get_rank_after(before)

    # Case 4: Insert between two ranks
    return _get_rank_between(before, after)


def _get_rank_before(after: str) -> str:
    """Generate a rank that comes before `after`."""
    if not after:
        return INITIAL_RANK

    # Strategy: Try to find a character we can decrement
    # Work through each position to find room
    for i in range(len(after)):
        char = after[i]
        if char > MIN_CHAR:
            # There's room to insert before this character
            if char > ALPHABET[1]:  # More than 'b'
                # Use character halfway between 'a' and current
                mid_index = (0 + ALPHABET.index(char)) // 2
                if mid_index > 0:
                    return after[:i] + ALPHABET[mid_index]
                else:
                    return after[:i] + MIN_CHAR + MID_CHAR
            else:
                # char is 'b', so we need to go deeper
                # Insert 'a' + middle character
                return after[:i] + MIN_CHAR + MID_CHAR

    # All characters are 'a' - append middle character
    return after + MID_CHAR


def _get_rank_after(before: str) -> str:
    """Generate a rank that comes after `before`."""
    if not before:
        return INITIAL_RANK

    # Strategy: Try to increment the last character, or append
    for i in range(len(before) - 1, -1, -1):
        char = before[i]
        if char < MAX_CHAR:
            # There's room to increment
            next_index = ALPHABET.index(char) + 1
            # Use midpoint between current and 'z'
            mid_index = (next_index + 25) // 2
            if mid_index > ALPHABET.index(char):
                return before[:i] + ALPHABET[mid_index]

    # All characters are at max or we need more space - append
    return before + MID_CHAR


def _get_rank_between(before: str, after: str) -> str:
    """Generate a rank between `before` and `after`."""
    # Validate order
    if before >= after:
        raise LexorankError(f"Invalid order: '{before}' must be less than '{after}'")

    # Make strings same length for easier comparison
    max_len = max(len(before), len(after))
    before_padded = before.ljust(max_len, MIN_CHAR)
    after_padded = after.ljust(max_len, MIN_CHAR)

    result = []
    i = 0

    while i < max_len:
        before_char = before_padded[i]
        after_char = after_padded[i]

        if before_char == after_char:
            result.append(before_char)
            i += 1
        else:
            # Found differing position
            before_index = ALPHABET.index(before_char)
            after_index = ALPHABET.index(after_char)

            # Calculate midpoint
            mid_index = (before_index + after_index) // 2

            if mid_index > before_index:
                # There's room between the characters
                result.append(ALPHABET[mid_index])
                return ''.join(result)
            else:
                # No room (adjacent characters) - need to go deeper
                result.append(before_char)

                # Now work with the remaining suffix
                # We need something > before[i+1:] and < after[i+1:]
                remaining_before = before[i+1:] if i + 1 < len(before) else ""

                # Get a rank after the remaining part of 'before'
                suffix = _get_rank_after(remaining_before)
                return ''.join(result) + suffix

    # Strings were equal up to max_len - extend with middle character
    return before + MID_CHAR


def needs_rebalancing(rank: str) -> bool:
    """Check if a rank has become too long and needs rebalancing."""
    return len(rank) > MAX_RANK_LENGTH


def generate_balanced_ranks(count: int) -> list[str]:
    """
    Generate `count` evenly-spaced ranks for rebalancing.

    Used when ranks have become too long and we need to redistribute.
    """
    if count <= 0:
        return []

    if count == 1:
        return [INITIAL_RANK]

    ranks = []
    # Divide the alphabet space evenly
    step = 26 // (count + 1)
    step = max(1, step)

    for i in range(1, count + 1):
        index = (i * step) % 26
        if index == 0:
            index = 1

        # For more items, we need multi-character ranks
        if count <= 24:
            ranks.append(ALPHABET[index])
        else:
            # Two-character ranks for larger sets
            first_char = ALPHABET[(i // 26) % 26]
            second_char = ALPHABET[i % 26]
            ranks.append(first_char + second_char)

    # Ensure uniqueness and order
    ranks = sorted(list(set(ranks)))

    # If we don't have enough unique ranks, regenerate with longer strings
    while len(ranks) < count:
        ranks.append(ranks[-1] + MID_CHAR)

    return ranks[:count]


def validate_rank_order(ranks: list[str]) -> bool:
    """Validate that ranks are in proper lexicographic order."""
    for i in range(1, len(ranks)):
        if ranks[i-1] >= ranks[i]:
            return False
    return True