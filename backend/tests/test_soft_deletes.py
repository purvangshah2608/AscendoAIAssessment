import pytest
from sqlalchemy import select
from app.models.board import Board


@pytest.mark.asyncio
async def test_soft_delete_board(client, db_session, test_user, auth_headers):
    # Create a board directly
    board = Board(name="To Be Deleted", owner_id=test_user.id)
    db_session.add(board)
    await db_session.commit()

    # Soft delete via API
    response = await client.delete(f"/api/v1/boards/{board.id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify it doesn't appear in the API list
    get_response = await client.get("/api/v1/boards", headers=auth_headers)
    assert len(get_response.json()) == 0

    # Verify it STILL EXISTS in the database with a deleted_at timestamp
    result = await db_session.execute(select(Board).where(Board.id == board.id))
    db_board = result.scalar_one()
    assert db_board is not None
    assert db_board.deleted_at is not None