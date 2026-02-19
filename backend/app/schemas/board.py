from datetime import datetime
from pydantic import BaseModel, Field


class BoardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)


class BoardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class CardInList(BaseModel):
    id: int
    title: str
    description: str | None
    position: str
    version: int
    list_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ListInBoard(BaseModel):
    id: int
    name: str
    position: str
    cards: list[CardInList] = []

    class Config:
        from_attributes = True


class BoardResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BoardDetailResponse(BoardResponse):
    lists: list[ListInBoard] = []