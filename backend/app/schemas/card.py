from pydantic import BaseModel, Field


class CardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    after_card_id: int | None = None  # Insert after this card


class CardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class CardMove(BaseModel):
    target_list_id: int
    before_card_id: int | None = None
    after_card_id: int | None = None
    expected_version: int  # For optimistic locking

    class Config:
        # Allow extra fields to be ignored
        extra = 'ignore'


class CardResponse(BaseModel):
    id: int
    title: str
    description: str | None
    position: str
    list_id: int
    version: int

    class Config:
        from_attributes = True