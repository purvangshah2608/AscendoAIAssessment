from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser
from app.models.board import Board
from app.models.list import List
from app.schemas.list import ListCreate, ListUpdate, ListResponse
from app.services.lexorank import get_rank_between

router = APIRouter()


@router.post("/{board_id}/lists", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
async def create_list(
        board_id: int,
        list_data: ListCreate,
        db: DbSession,
        current_user: CurrentUser
):
    """Create a new list in a board."""
    # Verify board ownership
    board_result = await db.execute(
        select(Board).where(
            Board.id == board_id,
            Board.owner_id == current_user.id,
            Board.deleted_at.is_(None)
        )
    )
    if not board_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found"
        )

    # Calculate position
    before_position = None
    after_position = None

    if list_data.after_list_id:
        result = await db.execute(
            select(List.position).where(
                List.id == list_data.after_list_id,
                List.deleted_at.is_(None)
            )
        )
        before_position = result.scalar_one_or_none()
    else:
        # Get the last list's position
        result = await db.execute(
            select(List.position)
            .where(List.board_id == board_id, List.deleted_at.is_(None))
            .order_by(List.position.desc())
            .limit(1)
        )
        before_position = result.scalar_one_or_none()

    position = get_rank_between(before_position, after_position)

    new_list = List(
        name=list_data.name,
        position=position,
        board_id=board_id
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)

    return new_list


@router.put("/{list_id}", response_model=ListResponse)
async def update_list(
        list_id: int,
        list_data: ListUpdate,
        db: DbSession,
        current_user: CurrentUser
):
    """Update a list."""
    result = await db.execute(
        select(List)
        .join(Board)
        .where(
            List.id == list_id,
            Board.owner_id == current_user.id,
            List.deleted_at.is_(None)
        )
    )
    lst = result.scalar_one_or_none()

    if not lst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found"
        )

    if list_data.name is not None:
        lst.name = list_data.name

    await db.commit()
    await db.refresh(lst)
    return lst


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(list_id: int, db: DbSession, current_user: CurrentUser):
    """Soft delete a list."""
    result = await db.execute(
        select(List)
        .join(Board)
        .where(
            List.id == list_id,
            Board.owner_id == current_user.id,
            List.deleted_at.is_(None)
        )
    )
    lst = result.scalar_one_or_none()

    if not lst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found"
        )

    lst.deleted_at = datetime.now(timezone.utc)
    await db.commit()