from pydantic import BaseModel, Field


class ListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    after_list_id: int | None = None


class ListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class ListResponse(BaseModel):
    id: int
    name: str
    position: str
    board_id: int

    class Config:
        from_attributes = True