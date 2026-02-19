import pytest
from fastapi import HTTPException
from app.models.board import Board
from app.models.list import List
from app.models.card import Card
from app.services.card_service import CardService


@pytest.mark.asyncio
async def test_optimistic_locking_conflict(db_session, test_user):
    # Setup Board, List, and Card
    board = Board(name="Test Board", owner_id=test_user.id)
    db_session.add(board)
    await db_session.commit()

    lst1 = List(name="List 1", position="n", board_id=board.id)
    lst2 = List(name="List 2", position="t", board_id=board.id)
    db_session.add_all([lst1, lst2])
    await db_session.commit()

    card = Card(title="Test Card", position="n", list_id=lst1.id, version=1)
    db_session.add(card)
    await db_session.commit()

    # User A reads card (version 1)
    user_a_version = 1

    # User B reads card (version 1) and moves it, incrementing version to 2
    updated_card = await CardService.move_card(
        db=db_session,
        card_id=card.id,
        target_list_id=lst2.id,
        before_card_id=None,
        after_card_id=None,
        expected_version=user_a_version
    )
    assert updated_card.version == 2

    # User A tries to move the card with the old version (1)
    with pytest.raises(HTTPException) as exc_info:
        await CardService.move_card(
            db=db_session,
            card_id=card.id,
            target_list_id=lst1.id,
            before_card_id=None,
            after_card_id=None,
            expected_version=user_a_version  # Stale version!
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["message"] == "Card was modified by another user"