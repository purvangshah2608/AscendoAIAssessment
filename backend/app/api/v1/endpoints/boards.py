from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DbSession, CurrentUser
from app.models.board import Board
from app.models.list import List
from app.models.card import Card
from app.schemas.board import BoardCreate, BoardUpdate, BoardResponse, BoardDetailResponse

router = APIRouter()


@router.get("", response_model=list[BoardResponse])
async def list_boards(db: DbSession, current_user: CurrentUser):
    """List all boards for the current user."""
    result = await db.execute(
        select(Board).where(
            Board.owner_id == current_user.id,
            Board.deleted_at.is_(None)
        ).order_by(Board.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(board_data: BoardCreate, db: DbSession, current_user: CurrentUser):
    """Create a new board."""
    board = Board(
        name=board_data.name,
        description=board_data.description,
        owner_id=current_user.id
    )
    db.add(board)
    await db.commit()
    await db.refresh(board)
    return board


@router.get("/{board_id}", response_model=BoardDetailResponse)
async def get_board(board_id: int, db: DbSession, current_user: CurrentUser):
    """
    Get a board with all its lists and cards.

    Uses eager loading (selectinload) to prevent N+1 queries.
    """
    result = await db.execute(
        select(Board)
        .options(
            selectinload(Board.lists.and_(List.deleted_at.is_(None)))
            .selectinload(List.cards.and_(Card.deleted_at.is_(None)))
        )
        .where(
            Board.id == board_id,
            Board.owner_id == current_user.id,
            Board.deleted_at.is_(None)
        )
    )
    board = result.scalar_one_or_none()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Build response with proper structure including list_id for cards
    board_data = {
        "id": board.id,
        "name": board.name,
        "description": board.description,
        "owner_id": board.owner_id,
        "created_at": board.created_at,
        "updated_at": board.updated_at,
        "lists": []
    }

    for lst in sorted(board.lists, key=lambda l: l.position):
        if lst.deleted_at is None:
            list_data = {
                "id": lst.id,
                "name": lst.name,
                "position": lst.position,
                "cards": [
                    {
                        "id": card.id,
                        "title": card.title,
                        "description": card.description,
                        "position": card.position,
                        "version": card.version,
                        "list_id": card.list_id,  # <-- INCLUDE list_id
                        "created_at": card.created_at
                    }
                    for card in sorted(lst.cards, key=lambda c: c.position)
                    if card.deleted_at is None
                ]
            }
            board_data["lists"].append(list_data)

    return board_data


@router.put("/{board_id}", response_model=BoardResponse)
async def update_board(
        board_id: int,
        board_data: BoardUpdate,
        db: DbSession,
        current_user: CurrentUser
):
    """Update a board."""
    result = await db.execute(
        select(Board).where(
            Board.id == board_id,
            Board.owner_id == current_user.id,
            Board.deleted_at.is_(None)
        )
    )
    board = result.scalar_one_or_none()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    if board_data.name is not None:
        board.name = board_data.name
    if board_data.description is not None:
        board.description = board_data.description

    await db.commit()
    await db.refresh(board)
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(board_id: int, db: DbSession, current_user: CurrentUser):
    """
    Soft delete a board.
    """
    result = await db.execute(
        select(Board).where(
            Board.id == board_id,
            Board.owner_id == current_user.id,
            Board.deleted_at.is_(None)
        )
    )
    board = result.scalar_one_or_none()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    board.deleted_at = datetime.now(timezone.utc)
    await db.commit()