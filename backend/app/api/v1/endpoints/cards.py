from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
import logging

from app.core.deps import DbSession, CurrentUser
from app.models.board import Board
from app.models.list import List
from app.models.card import Card
from app.schemas.card import CardCreate, CardUpdate, CardMove, CardResponse
from app.services.lexorank import get_rank_between
from app.services.card_service import CardService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{list_id}/cards", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
async def create_card(
        list_id: int,
        card_data: CardCreate,
        db: DbSession,
        current_user: CurrentUser
):
    """Create a new card in a list."""
    # Verify list exists and user has access
    result = await db.execute(
        select(List)
        .join(Board)
        .where(
            List.id == list_id,
            Board.owner_id == current_user.id,
            List.deleted_at.is_(None),
            Board.deleted_at.is_(None)
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found"
        )

    # Calculate position
    before_position = None

    if card_data.after_card_id:
        pos_result = await db.execute(
            select(Card.position).where(
                Card.id == card_data.after_card_id,
                Card.deleted_at.is_(None)
            )
        )
        before_position = pos_result.scalar_one_or_none()
    else:
        # Get last card's position
        pos_result = await db.execute(
            select(Card.position)
            .where(Card.list_id == list_id, Card.deleted_at.is_(None))
            .order_by(Card.position.desc())
            .limit(1)
        )
        before_position = pos_result.scalar_one_or_none()

    position = get_rank_between(before_position, None)

    card = Card(
        title=card_data.title,
        description=card_data.description,
        position=position,
        list_id=list_id
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)

    return card


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(card_id: int, db: DbSession, current_user: CurrentUser):
    """Get a single card."""
    result = await db.execute(
        select(Card)
        .join(List)
        .join(Board)
        .where(
            Card.id == card_id,
            Board.owner_id == current_user.id,
            Card.deleted_at.is_(None),
            List.deleted_at.is_(None),
            Board.deleted_at.is_(None)
        )
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    return card


@router.put("/{card_id}", response_model=CardResponse)
async def update_card(
        card_id: int,
        card_data: CardUpdate,
        db: DbSession,
        current_user: CurrentUser
):
    """Update a card's content."""
    result = await db.execute(
        select(Card)
        .join(List)
        .join(Board)
        .where(
            Card.id == card_id,
            Board.owner_id == current_user.id,
            Card.deleted_at.is_(None)
        )
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    if card_data.title is not None:
        card.title = card_data.title
    if card_data.description is not None:
        card.description = card_data.description

    await db.commit()
    await db.refresh(card)
    return card


@router.put("/{card_id}/move", response_model=CardResponse)
async def move_card(
        card_id: int,
        move_data: CardMove,
        db: DbSession,
        current_user: CurrentUser
):
    """
    Move a card to a new position.
    """
    logger.info(f"Move card request: card_id={card_id}, move_data={move_data}")

    # Verify user has access to the card
    access_check = await db.execute(
        select(Card)
        .join(List)
        .join(Board)
        .where(
            Card.id == card_id,
            Board.owner_id == current_user.id,
            Card.deleted_at.is_(None)
        )
    )
    card = access_check.scalar_one_or_none()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    logger.info(f"Card found: id={card.id}, version={card.version}")

    # Perform the move with concurrency handling
    try:
        updated_card = await CardService.move_card(
            db=db,
            card_id=card_id,
            target_list_id=move_data.target_list_id,
            before_card_id=move_data.before_card_id,
            after_card_id=move_data.after_card_id,
            expected_version=move_data.expected_version
        )

        await db.commit()
        await db.refresh(updated_card)

        logger.info(
            f"Card moved successfully: new_position={updated_card.position}, new_version={updated_card.version}")
        return updated_card
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving card: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(card_id: int, db: DbSession, current_user: CurrentUser):
    """Soft delete a card."""
    result = await db.execute(
        select(Card)
        .join(List)
        .join(Board)
        .where(
            Card.id == card_id,
            Board.owner_id == current_user.id,
            Card.deleted_at.is_(None)
        )
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    card.deleted_at = datetime.now(timezone.utc)
    await db.commit()