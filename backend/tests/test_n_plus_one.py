import pytest
from sqlalchemy import event
from app.database import engine
from app.models.board import Board
from app.models.list import List
from app.models.card import Card


@pytest.mark.asyncio
async def test_n_plus_one_prevention(client, db_session, test_user, auth_headers):
    # Setup complex data: 1 Board -> 3 Lists -> 5 Cards each (15 cards total)
    board = Board(name="Complex Board", owner_id=test_user.id)
    db_session.add(board)
    await db_session.commit()

    lists = [List(name=f"List {i}", position=str(i), board_id=board.id) for i in range(3)]
    db_session.add_all(lists)
    await db_session.commit()

    cards = []
    for lst in lists:
        for i in range(5):
            cards.append(Card(title=f"Card {i}", position=str(i), list_id=lst.id))
    db_session.add_all(cards)
    await db_session.commit()

    # Query Counter mechanism
    query_count = 0

    def count_queries(conn, cursor, statement, parameters, context, executemany):
        nonlocal query_count
        query_count += 1

    # Attach listener to sync engine (underlying async engine)
    event.listen(engine.sync_engine, "before_cursor_execute", count_queries)

    try:
        # Fetch the board
        response = await client.get(f"/api/v1/boards/{board.id}", headers=auth_headers)
        assert response.status_code == 200

        # Check that we didn't execute 1 + 3 + 15 = 19 queries.
        # With `selectinload`, it should strictly be 3 queries (Board, Lists, Cards).
        assert query_count <= 3

        data = response.json()
        assert len(data["lists"]) == 3
        assert len(data["lists"][0]["cards"]) == 5
    finally:
        # Clean up listener
        event.remove(engine.sync_engine, "before_cursor_execute", count_queries)