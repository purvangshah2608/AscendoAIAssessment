from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.card import Card
from app.models.list import List
from app.services.lexorank import get_rank_between, needs_rebalancing


class CardService:
    """Service for card operations with concurrency handling."""

    @staticmethod
    async def move_card(
            db: AsyncSession,
            card_id: int,
            target_list_id: int,
            before_card_id: int | None,
            after_card_id: int | None,
            expected_version: int
    ) -> Card:
        """
        Move a card to a new position with optimistic locking.

        Args:
            card_id: The card to move
            target_list_id: The destination list
            before_card_id: The card that should come before (or None)
            after_card_id: The card that should come after (or None)
            expected_version: The version the client last saw

        Returns:
            The updated card

        Raises:
            HTTPException 404: Card or list not found
            HTTPException 409: Version conflict (concurrent modification)
        """
        async with db.begin_nested():
            # Lock the card row for update (SELECT FOR UPDATE)
            result = await db.execute(
                select(Card)
                .where(Card.id == card_id, Card.deleted_at.is_(None))
                .with_for_update()
            )
            card = result.scalar_one_or_none()

            if not card:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Card not found"
                )

            # Optimistic lock check
            if card.version != expected_version:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "Card was modified by another user",
                        "current_version": card.version,
                        "expected_version": expected_version
                    }
                )

            # Verify target list exists
            list_result = await db.execute(
                select(List)
                .where(List.id == target_list_id, List.deleted_at.is_(None))
            )
            target_list = list_result.scalar_one_or_none()

            if not target_list:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target list not found"
                )

            # Get positions of adjacent cards
            before_position = None
            after_position = None

            if before_card_id:
                before_result = await db.execute(
                    select(Card.position)
                    .where(Card.id == before_card_id, Card.deleted_at.is_(None))
                )
                before_position = before_result.scalar_one_or_none()

            if after_card_id:
                after_result = await db.execute(
                    select(Card.position)
                    .where(Card.id == after_card_id, Card.deleted_at.is_(None))
                )
                after_position = after_result.scalar_one_or_none()

            # Calculate new position using Lexorank
            new_position = get_rank_between(before_position, after_position)

            # Check if rebalancing is needed
            if needs_rebalancing(new_position):
                await CardService._rebalance_list(db, target_list_id)
                # Recalculate position after rebalancing
                if before_card_id:
                    before_result = await db.execute(
                        select(Card.position)
                        .where(Card.id == before_card_id)
                    )
                    before_position = before_result.scalar_one_or_none()
                if after_card_id:
                    after_result = await db.execute(
                        select(Card.position)
                        .where(Card.id == after_card_id)
                    )
                    after_position = after_result.scalar_one_or_none()
                new_position = get_rank_between(before_position, after_position)

            # Update the card
            card.list_id = target_list_id
            card.position = new_position
            card.version += 1

            await db.flush()
            await db.refresh(card)

            return card

    @staticmethod
    async def _rebalance_list(db: AsyncSession, list_id: int) -> None:
        """
        Rebalance all cards in a list with evenly-spaced ranks.

        This is called when ranks become too long after many insertions.
        """
        from app.services.lexorank import generate_balanced_ranks

        result = await db.execute(
            select(Card)
            .where(Card.list_id == list_id, Card.deleted_at.is_(None))
            .order_by(Card.position)
            .with_for_update()
        )
        cards = result.scalars().all()

        if not cards:
            return

        new_ranks = generate_balanced_ranks(len(cards))

        for card, new_rank in zip(cards, new_ranks):
            card.position = new_rank

        await db.flush()